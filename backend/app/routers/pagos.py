from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.database.database import get_db
from app.models.models import Pago, Prestamo
from app.schemas.schemas import Pago as PagoSchema, PagoCreate

router = APIRouter()

@router.get("/", response_model=List[PagoSchema])
def get_pagos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener todos los pagos"""
    pagos = db.query(Pago).offset(skip).limit(limit).all()
    return pagos

@router.get("/{pago_id}", response_model=PagoSchema)
def get_pago(pago_id: int, db: Session = Depends(get_db)):
    """Obtener un pago por ID"""
    pago = db.query(Pago).filter(Pago.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return pago

@router.get("/prestamo/{prestamo_id}", response_model=List[PagoSchema])
def get_pagos_by_prestamo(prestamo_id: int, db: Session = Depends(get_db)):
    """Obtener pagos de un préstamo"""
    pagos = db.query(Pago).filter(Pago.prestamo_id == prestamo_id).all()
    return pagos

@router.post("/", response_model=PagoSchema, status_code=status.HTTP_201_CREATED)
def create_pago(pago: PagoCreate, db: Session = Depends(get_db)):
    """Registrar un nuevo pago con sistema de cuotas"""
    # Verificar que el préstamo existe
    prestamo = db.query(Prestamo).filter(Prestamo.id == pago.prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    # Verificar que el monto no exceda el saldo pendiente
    if pago.monto > prestamo.saldo_pendiente:
        raise HTTPException(
            status_code=400, 
            detail=f"El monto del pago (${pago.monto:.2f}) excede el saldo pendiente (${prestamo.saldo_pendiente:.2f})"
        )
    
    # Crear el pago con la fecha de hoy
    pago_data = pago.model_dump()
    pago_data['fecha_pago'] = date.today()  # Forzar fecha de hoy
    db_pago = Pago(**pago_data)
    db.add(db_pago)
    
    # === LÓGICA DE CUOTAS ===
    # Calcular cuánto debe en la cuota actual (valor_cuota + saldo_cuota)
    monto_cuota_actual = prestamo.valor_cuota + prestamo.saldo_cuota
    
    # Aplicar el pago
    diferencia = monto_cuota_actual - pago.monto
    
    # Manejo según tipo de pago
    if pago.tipo_pago == "total":
        # Pago total: intenta pagar todo el saldo pendiente
        monto_restante = pago.monto
        
        while monto_restante > 0 and prestamo.cuotas_pagadas < prestamo.cuotas_totales:
            monto_cuota = prestamo.valor_cuota + prestamo.saldo_cuota
            
            if monto_restante >= monto_cuota:
                # Paga la cuota completa
                monto_restante -= monto_cuota
                prestamo.cuotas_pagadas += 1
                prestamo.saldo_cuota = 0.0
            else:
                # No alcanza para la cuota completa
                prestamo.saldo_cuota = monto_cuota - monto_restante
                monto_restante = 0
                break
        
        # Si queda dinero sobrante en la última cuota
        if monto_restante > 0:
            prestamo.saldo_cuota = -monto_restante
    
    else:
        # Pago de cuota o parcial: misma lógica
        # Avanzar a siguiente cuota SIEMPRE
        prestamo.cuotas_pagadas += 1
        prestamo.saldo_cuota = diferencia
    
    # Actualizar saldo pendiente del préstamo
    prestamo.saldo_pendiente -= pago.monto
    
    # Estados finales según cuotas y saldo
    if prestamo.cuotas_pagadas >= prestamo.cuotas_totales:
        prestamo.cuotas_pagadas = prestamo.cuotas_totales
        if prestamo.saldo_pendiente <= 0:
            prestamo.estado = "pagado"
            prestamo.saldo_pendiente = max(0, prestamo.saldo_pendiente)
            prestamo.saldo_cuota = 0.0
        else:
            # Terminó las cuotas pero quedó deuda: marcar como impago
            prestamo.estado = "impago"
            # El saldo_pendiente queda como deuda final
    elif prestamo.saldo_pendiente <= 0:
        # Saldo cubierto antes de agotar cuotas
        prestamo.estado = "pagado"
        prestamo.saldo_pendiente = 0.0
        prestamo.saldo_cuota = 0.0
    
    db.commit()
    db.refresh(db_pago)
    return db_pago

@router.delete("/{pago_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pago(pago_id: int, db: Session = Depends(get_db)):
    """Eliminar un pago"""
    db_pago = db.query(Pago).filter(Pago.id == pago_id).first()
    if not db_pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    # Restaurar el saldo del préstamo
    prestamo = db.query(Prestamo).filter(Prestamo.id == db_pago.prestamo_id).first()
    if prestamo:
        prestamo.saldo_pendiente += db_pago.monto
        if prestamo.estado == "pagado":
            prestamo.estado = "activo"
    
    db.delete(db_pago)
    db.commit()
    return None
