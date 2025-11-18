from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.models.models import Empleado, PagoCobrador, PrestamoVendedor
from app.schemas.schemas import Empleado as EmpleadoSchema, EmpleadoCreate, PagoCobrador as PagoCobradorSchema, PrestamoVendedor as PrestamoVendedorSchema

router = APIRouter(prefix="/api/empleados", tags=["Empleados"])


@router.get("/", response_model=List[EmpleadoSchema])
def listar_empleados(puesto: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Empleado)
    if puesto:
        q = q.filter(Empleado.puesto == puesto)
    return q.order_by(Empleado.id.desc()).all()

@router.get("/{empleado_id}", response_model=EmpleadoSchema)
def obtener_empleado(empleado_id: int, db: Session = Depends(get_db)):
    emp = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.post("/", response_model=EmpleadoSchema, status_code=status.HTTP_201_CREATED)
def crear_empleado(empleado: EmpleadoCreate, db: Session = Depends(get_db)):
    nuevo = Empleado(**empleado.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/{empleado_id}/comisiones", response_model=List[PagoCobradorSchema])
def obtener_comisiones_empleado(empleado_id: int, db: Session = Depends(get_db)):
    """Obtener todas las comisiones de un empleado"""
    emp = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    comisiones = db.query(PagoCobrador).filter(PagoCobrador.empleado_id == empleado_id).order_by(PagoCobrador.created_at.desc()).all()
    return comisiones


@router.get("/{empleado_id}/comisiones-vendedor", response_model=List[PrestamoVendedorSchema])
def obtener_comisiones_vendedor(empleado_id: int, db: Session = Depends(get_db)):
    emp = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    registros = (
        db.query(PrestamoVendedor)
        .filter(PrestamoVendedor.empleado_id == empleado_id)
        .order_by(PrestamoVendedor.created_at.desc())
        .all()
    )
    return registros
