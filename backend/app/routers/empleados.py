from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.database import get_db
from app.models.models import Usuario
from app.routers.auth import get_password_hash

router = APIRouter(prefix="/api/empleados", tags=["Empleados"])


class EmpleadoCreate(BaseModel):
    username: str
    password: str
    nombre_completo: str


class EmpleadoResponse(BaseModel):
    id: int
    username: str
    nombre_completo: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[EmpleadoResponse])
def listar_empleados(db: Session = Depends(get_db)):
    usuarios = db.query(Usuario).all()
    return usuarios


@router.post("/", response_model=EmpleadoResponse, status_code=status.HTTP_201_CREATED)
def crear_empleado(empleado: EmpleadoCreate, db: Session = Depends(get_db)):
    # Verificar si el username existe
    if db.query(Usuario).filter(Usuario.username == empleado.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    hashed = get_password_hash(empleado.password)
    nuevo = Usuario(username=empleado.username, hashed_password=hashed, nombre_completo=empleado.nombre_completo)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo
