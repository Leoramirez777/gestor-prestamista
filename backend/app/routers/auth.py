from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
import bcrypt

from app.database.database import get_db
from app.models.models import Usuario
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Configuración de seguridad
SECRET_KEY = "tu_clave_secreta_super_segura_cambiala_en_produccion_12345"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    empleado_id: Optional[int] = None

class TokenData(BaseModel):
    username: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str
    nombre_completo: str
    role: str = "vendedor"  # admin | vendedor | cobrador (solo admin puede asignar)
    empleado_id: Optional[int] = None
    dni: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    nombre_completo: str
    role: str
    empleado_id: Optional[int] = None
    dni: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    
    class Config:
        from_attributes = True

# Funciones de utilidad
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")  # type: ignore
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# Rutas
def require_admin(current_user: Usuario = Depends(get_current_user)):
    if getattr(current_user, 'role', 'admin') != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear usuarios")
    return current_user

@router.post("/admin/create-user", response_model=UserResponse)
def admin_create_user(user: UserCreate, db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)):
    db_user = db.query(Usuario).filter(Usuario.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    if user.role not in ("admin", "vendedor", "cobrador"):
        raise HTTPException(status_code=400, detail="Rol inválido")
    hashed_password = get_password_hash(user.password)
    new_user = Usuario(
        username=user.username,
        hashed_password=hashed_password,
        nombre_completo=user.nombre_completo,
        role=user.role,
        empleado_id=user.empleado_id,
        dni=user.dni,
        telefono=user.telefono,
        direccion=user.direccion,
        email=user.email
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": getattr(user, 'role', 'admin'),
        "empleado_id": getattr(user, 'empleado_id', None)
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: Usuario = Depends(get_current_user)):
    return current_user

@router.get("/usuarios", response_model=list[UserResponse])
def list_usuarios(db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)):
    usuarios = db.query(Usuario).all()
    return usuarios

class UserUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    dni: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None  # permitir cambio de contraseña

@router.put("/me", response_model=UserResponse)
def update_me(datos: UserUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    cambios = datos.model_dump(exclude_unset=True)
    if 'password' in cambios:
        hashed = get_password_hash(cambios.pop('password'))
        setattr(current_user, 'hashed_password', hashed)
    for k, v in cambios.items():
        setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/logout")
def logout():
    return {"message": "Sesión cerrada exitosamente"}
