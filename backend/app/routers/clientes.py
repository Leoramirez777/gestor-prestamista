from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.models.models import Cliente, Prestamo, Usuario
from app.schemas.schemas import Cliente as ClienteSchema, ClienteCreate, ClienteUpdate
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[ClienteSchema])
def get_clientes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Obtener clientes según el rol del usuario"""
    try:
        # Si es admin, ve todos los clientes
        if current_user.role == 'admin':
            clientes = db.query(Cliente).offset(skip).limit(limit).all()
            return clientes
        
        # Si es vendedor o cobrador, solo ve clientes con préstamos donde está asignado
        if not current_user.empleado_id:
            return []
        
        # Importar PrestamoVendedor
        from app.models.models import PrestamoVendedor
        
        # Obtener IDs de préstamos donde el usuario está asignado como vendedor
        prestamos_ids = db.query(PrestamoVendedor.prestamo_id).filter(
            PrestamoVendedor.empleado_id == current_user.empleado_id
        ).distinct().all()
        
        if not prestamos_ids:
            return []
        
        prestamo_ids_list = [p[0] for p in prestamos_ids]
        
        # Obtener clientes de esos préstamos
        clientes_ids = db.query(Prestamo.cliente_id).filter(
            Prestamo.id.in_(prestamo_ids_list)
        ).distinct().all()
        
        cliente_ids_list = [c[0] for c in clientes_ids]
        
        if not cliente_ids_list:
            return []
        
        clientes = db.query(Cliente).filter(Cliente.id.in_(cliente_ids_list)).offset(skip).limit(limit).all()
        return clientes
    except Exception as e:
        print(f"Error en get_clientes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{cliente_id}", response_model=ClienteSchema)
def get_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Obtener un cliente por ID"""
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@router.post("/", response_model=ClienteSchema, status_code=status.HTTP_201_CREATED)
def create_cliente(cliente: ClienteCreate, db: Session = Depends(get_db)):
    """Crear un nuevo cliente"""
    db_cliente = Cliente(**cliente.model_dump())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@router.put("/{cliente_id}", response_model=ClienteSchema)
def update_cliente(cliente_id: int, cliente: ClienteUpdate, db: Session = Depends(get_db)):
    """Actualizar un cliente"""
    db_cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    update_data = cliente.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cliente, key, value)
    
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Eliminar un cliente"""
    db_cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    db.delete(db_cliente)
    db.commit()
    return None
