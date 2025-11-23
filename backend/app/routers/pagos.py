from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.database.database import get_db
from app.models.models import Pago, Prestamo, PagoCobrador, PagoVendedor, PrestamoVendedor, Empleado, MovimientoCaja, Cliente
from app.schemas.schemas import Pago as PagoSchema, PagoCreate, PagoCobrador as PagoCobradorSchema, PagoVendedor as PagoVendedorSchema
from app.caja_service import actualizar_totales_cierre, get_or_create_cierre

router = APIRouter()

# Colocar rutas estáticas antes de rutas dinámicas para evitar conflictos
@router.get("/preview-cobrador")
def preview_cobrador(monto: float, porcentaje: float):
    """Calcula la comisión del cobrador sin registrar nada en la base.

    Parámetros por query:
    - monto: Monto del pago
    - porcentaje: Porcentaje sobre el monto (0-100)
    """
    if monto < 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor o igual a 0")
    if porcentaje < 0 or porcentaje > 100:
        raise HTTPException(status_code=400, detail="El porcentaje debe estar entre 0 y 100")
    monto_comision = round(float(monto) * float(porcentaje) / 100.0, 2)
    return {"monto_comision": monto_comision}

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
    
    # Extraer campos que NO pertenecen al modelo Pago
    cobrador_id = pago_data.pop('cobrador_id', None)
    cobrador_nombre = pago_data.pop('cobrador_nombre', None)
    porcentaje_cobrador = pago_data.pop('porcentaje_cobrador', None)
    
    # Bloquear si el día está cerrado
    cierre_hoy = get_or_create_cierre(db, pago_data['fecha_pago'])
    if cierre_hoy.cerrado:
        raise HTTPException(status_code=400, detail="El día está cerrado. Abre la caja para registrar pagos.")

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

    # Crear movimiento de caja automático (ingreso por pago)
    cliente = db.query(Cliente).filter(Cliente.id == prestamo.cliente_id).first()
    cliente_nombre = cliente.nombre if cliente else f"Cliente {prestamo.cliente_id}"
    num_cuota = prestamo.cuotas_pagadas
    
    movimiento_caja = MovimientoCaja(
        fecha=db_pago.fecha_pago,
        tipo="ingreso",
        categoria="pago",
        descripcion=f"Cuota #{num_cuota} préstamo {db_pago.prestamo_id} - {cliente_nombre}",
        monto=db_pago.monto,
        referencia_tipo="pago",
        referencia_id=db_pago.id,
        usuario_id=None  # TODO: obtener del token
    )
    db.add(movimiento_caja)
    db.commit()
    
    # Actualizar totales del cierre del día
    actualizar_totales_cierre(db, db_pago.fecha_pago)

    # Crear registro de comisión del cobrador si corresponde
    if porcentaje_cobrador is not None:
        if porcentaje_cobrador < 0 or porcentaje_cobrador > 100:
            raise HTTPException(status_code=400, detail="El porcentaje del cobrador debe estar entre 0 y 100")
    if porcentaje_cobrador and float(porcentaje_cobrador) > 0:
        porcentaje = float(porcentaje_cobrador)
        monto_comision = round(float(pago.monto) * porcentaje / 100.0, 2)

        empleado_nombre_final = None
        if cobrador_id:
            empleado = db.query(Empleado).filter(Empleado.id == cobrador_id).first()
            empleado_nombre_final = empleado.nombre if empleado else cobrador_nombre
        else:
            empleado_nombre_final = cobrador_nombre

        registro = PagoCobrador(
            pago_id=db_pago.id,
            empleado_id=cobrador_id,
            empleado_nombre=empleado_nombre_final,
            porcentaje=porcentaje,
            monto_comision=monto_comision
        )
        db.add(registro)
        db.commit()
        # Registrar movimiento de caja como egreso por comisión de cobrador
        mov_comision_cobrador = MovimientoCaja(
            fecha=db_pago.fecha_pago,
            tipo="egreso",
            categoria="comision",
            descripcion=f"Comisión cobrador pago #{db_pago.id} préstamo {db_pago.prestamo_id}",
            monto=monto_comision,
            referencia_tipo="pago",
            referencia_id=db_pago.id,
            usuario_id=None
        )
        db.add(mov_comision_cobrador)
        db.commit()
        actualizar_totales_cierre(db, db_pago.fecha_pago)

    # Registrar comisión del vendedor si existe en el préstamo
    prestamo_vendedor = db.query(PrestamoVendedor).filter(
        PrestamoVendedor.prestamo_id == prestamo.id
    ).first()
    
    if prestamo_vendedor and prestamo_vendedor.porcentaje > 0:
        # Calcular comisión del vendedor sobre el monto del pago
        porcentaje_vendedor = float(prestamo_vendedor.porcentaje)
        monto_comision_vendedor = round(float(pago.monto) * porcentaje_vendedor / 100.0, 2)
        
        registro_vendedor = PagoVendedor(
            pago_id=db_pago.id,
            empleado_id=prestamo_vendedor.empleado_id,
            empleado_nombre=prestamo_vendedor.empleado_nombre,
            porcentaje=porcentaje_vendedor,
            monto_comision=monto_comision_vendedor
        )
        db.add(registro_vendedor)
        db.commit()
        # Registrar movimiento de caja como egreso por comisión de vendedor
        mov_comision_vendedor = MovimientoCaja(
            fecha=db_pago.fecha_pago,
            tipo="egreso",
            categoria="comision",
            descripcion=f"Comisión vendedor pago #{db_pago.id} préstamo {db_pago.prestamo_id}",
            monto=monto_comision_vendedor,
            referencia_tipo="pago",
            referencia_id=db_pago.id,
            usuario_id=None
        )
        db.add(mov_comision_vendedor)
        db.commit()
        actualizar_totales_cierre(db, db_pago.fecha_pago)

    return db_pago


@router.get("/{pago_id}/cobrador", response_model=PagoCobradorSchema)
def get_pago_cobrador(pago_id: int, db: Session = Depends(get_db)):
    registro = db.query(PagoCobrador).filter(PagoCobrador.pago_id == pago_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="No hay comisión registrada para este pago")
    return registro


@router.get("/{pago_id}/vendedor", response_model=PagoVendedorSchema)
def get_pago_vendedor(pago_id: int, db: Session = Depends(get_db)):
    registro = db.query(PagoVendedor).filter(PagoVendedor.pago_id == pago_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="No hay comisión de vendedor registrada para este pago")
    return registro


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
