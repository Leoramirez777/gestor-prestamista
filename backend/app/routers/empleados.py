from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.models.models import Empleado, PagoCobrador, PagoVendedor, PrestamoVendedor
from app.schemas.schemas import Empleado as EmpleadoSchema, EmpleadoCreate, EmpleadoUpdate, PagoCobrador as PagoCobradorSchema, PagoVendedor as PagoVendedorSchema, PrestamoVendedor as PrestamoVendedorSchema, GananciasEmpleado
from app.routers.auth import get_current_user
from app.models.models import Usuario
from datetime import date
from sqlalchemy import func

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

@router.put("/{empleado_id}", response_model=EmpleadoSchema)
def actualizar_empleado(empleado_id: int, datos: EmpleadoUpdate, db: Session = Depends(get_db)):
    emp = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    cambios = datos.model_dump(exclude_unset=True)
    for k, v in cambios.items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    return emp


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


@router.get("/{empleado_id}/comisiones-pago-vendedor", response_model=List[PagoVendedorSchema])
def obtener_comisiones_pago_vendedor(empleado_id: int, db: Session = Depends(get_db)):
    """Obtener todas las comisiones del vendedor por pagos realizados"""
    emp = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    comisiones = db.query(PagoVendedor).filter(PagoVendedor.empleado_id == empleado_id).order_by(PagoVendedor.created_at.desc()).all()
    return comisiones

@router.get("/{empleado_id}/ganancias", response_model=GananciasEmpleado)
def obtener_ganancias_empleado(empleado_id: int, start_date: date | None = None, end_date: date | None = None, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Ganancia neta del empleado = suma de comisiones (vendedor + cobrador) en el rango.
    Si no se especifica rango se usa el mes actual.
    Empleado solo puede ver su propia info; admin puede ver cualquiera.
    """
    # Permisos
    if current_user.role != 'admin':
        if not current_user.empleado_id or current_user.empleado_id != empleado_id:
            raise HTTPException(status_code=403, detail="Acceso denegado")

    emp = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Rango por defecto: mes actual
    today = date.today()
    if not start_date:
        start_date = date(today.year, today.month, 1)
    if not end_date:
        # último día del mes
        from calendar import monthrange
        end_date = date(today.year, today.month, monthrange(today.year, today.month)[1])
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date no puede ser mayor que end_date")

    # Comisiones vendedor (pagos)
    total_vendedor = db.query(func.coalesce(func.sum(PagoVendedor.monto_comision), 0)).join(
        PagoVendedor, PagoVendedor.id == PagoVendedor.id
    ).filter(
        PagoVendedor.empleado_id == empleado_id
    ).join(
        # join pago para filtrar por fecha
        PagoVendedor, isouter=False
    )
    # Corrección: necesitamos join con pagos reales
    from app.models.models import Pago
    total_vendedor = db.query(func.coalesce(func.sum(PagoVendedor.monto_comision), 0)).join(
        Pago, PagoVendedor.pago_id == Pago.id
    ).filter(
        PagoVendedor.empleado_id == empleado_id,
        Pago.fecha_pago >= start_date,
        Pago.fecha_pago <= end_date
    ).scalar() or 0.0

    # Comisiones cobrador (pagos)
    from app.models.models import PagoCobrador as PC
    total_cobrador = db.query(func.coalesce(func.sum(PC.monto_comision), 0)).join(
        Pago, PC.pago_id == Pago.id
    ).filter(
        PC.empleado_id == empleado_id,
        Pago.fecha_pago >= start_date,
        Pago.fecha_pago <= end_date
    ).scalar() or 0.0

    ganancias = total_vendedor + total_cobrador

    # Determinar rol simple
    rol_lower = (emp.puesto or '').lower()
    rol = None
    if 'vend' in rol_lower:
        rol = 'vendedor'
    elif 'cobr' in rol_lower:
        rol = 'cobrador'
    else:
        rol = emp.puesto or 'Empleado'

    return GananciasEmpleado(
        empleado_id=empleado_id,
        start_date=start_date,
        end_date=end_date,
        total_comisiones_vendedor=round(total_vendedor, 2),
        total_comisiones_cobrador=round(total_cobrador, 2),
        ganancias_netas=round(ganancias, 2),
        rol=rol
    )
