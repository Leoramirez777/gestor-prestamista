from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta
from app.database.database import get_db
from app.models.models import Prestamo, Cliente
from app.schemas.schemas import Prestamo as PrestamoSchema, PrestamoCreate, PrestamoUpdate

router = APIRouter()

@router.get("/", response_model=List[PrestamoSchema])
def get_prestamos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener todos los préstamos"""
    prestamos = db.query(Prestamo).offset(skip).limit(limit).all()
    return prestamos

@router.get("/{prestamo_id}", response_model=PrestamoSchema)
def get_prestamo(prestamo_id: int, db: Session = Depends(get_db)):
    """Obtener un préstamo por ID"""
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    return prestamo

@router.get("/cliente/{cliente_id}", response_model=List[PrestamoSchema])
def get_prestamos_by_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Obtener préstamos de un cliente"""
    prestamos = db.query(Prestamo).filter(Prestamo.cliente_id == cliente_id).all()
    return prestamos

@router.post("/", response_model=PrestamoSchema, status_code=status.HTTP_201_CREATED)
def create_prestamo(prestamo: PrestamoCreate, db: Session = Depends(get_db)):
    """Crear un nuevo préstamo"""
    # Verificar que el cliente existe
    cliente = db.query(Cliente).filter(Cliente.id == prestamo.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Calcular valores del préstamo
    monto_interes = prestamo.monto * (prestamo.tasa_interes / 100)
    monto_total = prestamo.monto + monto_interes
    fecha_vencimiento = prestamo.fecha_inicio + timedelta(days=prestamo.plazo_dias)
    
    db_prestamo = Prestamo(
        cliente_id=prestamo.cliente_id,
        monto=prestamo.monto,
        tasa_interes=prestamo.tasa_interes,
        plazo_dias=prestamo.plazo_dias,
        fecha_inicio=prestamo.fecha_inicio,
        fecha_vencimiento=fecha_vencimiento,
        monto_total=monto_total,
        saldo_pendiente=monto_total,
        estado="activo",
        frecuencia_pago=prestamo.frecuencia_pago
    )
    
    db.add(db_prestamo)
    db.commit()
    db.refresh(db_prestamo)
    return db_prestamo

@router.put("/{prestamo_id}", response_model=PrestamoSchema)
def update_prestamo(prestamo_id: int, prestamo: PrestamoUpdate, db: Session = Depends(get_db)):
    """Actualizar un préstamo"""
    db_prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not db_prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    update_data = prestamo.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_prestamo, key, value)
    
    db.commit()
    db.refresh(db_prestamo)
    return db_prestamo

@router.delete("/{prestamo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prestamo(prestamo_id: int, db: Session = Depends(get_db)):
    """Eliminar un préstamo"""
    db_prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not db_prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    db.delete(db_prestamo)
    db.commit()
    return None
