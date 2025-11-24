"""
Script para crear todas las tablas en la base de datos
"""
from app.database.database import engine, Base
from app.models.models import (
    Usuario, Cliente, Prestamo, Pago, Empleado,
    PagoCobrador, PagoVendedor, PrestamoVendedor,
    MovimientoCaja, CajaCierre,
    CajaEmpleadoMovimiento, CajaEmpleadoCierre
)

def create_tables():
    print("Creando todas las tablas...")
    Base.metadata.create_all(bind=engine)
    print("✓ Todas las tablas fueron creadas exitosamente")
    
    # Verificar tablas creadas
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print("\nTablas creadas:")
    for table in tables:
        print(f"  - {table}")

if __name__ == "__main__":
    create_tables()
