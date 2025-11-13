from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
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
    """Registrar un nuevo pago"""
    # Verificar que el préstamo existe
    prestamo = db.query(Prestamo).filter(Prestamo.id == pago.prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    # Verificar que el monto no exceda el saldo pendiente
    if pago.monto > prestamo.saldo_pendiente:
        raise HTTPException(
            status_code=400, 
            detail=f"El monto del pago excede el saldo pendiente ({prestamo.saldo_pendiente})"
        )
    
    # Crear el pago
    db_pago = Pago(**pago.model_dump())
    db.add(db_pago)
    
    # Actualizar el saldo pendiente del préstamo
    prestamo.saldo_pendiente -= pago.monto
    
    # Si el saldo es 0, marcar como pagado
    if prestamo.saldo_pendiente <= 0:
        prestamo.estado = "pagado"
    
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
