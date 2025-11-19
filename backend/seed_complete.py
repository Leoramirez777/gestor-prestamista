"""
Script para poblar la base de datos con datos de ejemplo más completos
"""
import sys
from pathlib import Path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.models import Cliente, Prestamo, Pago, Empleado, Usuario
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_complete(db: Session):
    # Verificar si ya hay datos
    if db.query(Usuario).count() > 0:
        print("✓ Ya existen usuarios en la base de datos")
    else:
        # Crear usuario admin
        admin = Usuario(
            username="admin",
            hashed_password=hash_password("admin123"),
            nombre_completo="Administrador",
            dni="11111111",
            telefono="1111111111",
            email="admin@gestor.com"
        )
        db.add(admin)
        db.commit()
        print("✓ Usuario admin creado (username: admin, password: admin123)")
    
    # Crear empleados si no existen
    if db.query(Empleado).count() > 0:
        print("✓ Ya existen empleados en la base de datos")
    else:
        empleados = [
            Empleado(
                nombre="Juan Pérez",
                dni="22222222",
                telefono="1122334455",
                direccion="Av. Principal 123",
                email="juan@gestor.com",
                puesto="Vendedor"
            ),
            Empleado(
                nombre="Ana Martínez",
                dni="33333333",
                telefono="1133445566",
                direccion="Calle Secundaria 456",
                email="ana@gestor.com",
                puesto="Cobrador"
            ),
            Empleado(
                nombre="Carlos López",
                dni="44444444",
                telefono="1144556677",
                direccion="Av. Central 789",
                email="carlos@gestor.com",
                puesto="Vendedor"
            ),
        ]
        db.add_all(empleados)
        db.commit()
        print(f"✓ {len(empleados)} empleados creados")
    
    # Agregar más clientes si es necesario
    clientes_actuales = db.query(Cliente).count()
    if clientes_actuales < 10:
        nuevos_clientes = [
            Cliente(nombre="Roberto Silva", dni="55555555", telefono="1155667788", direccion="Barrio Norte 100", email="roberto@example.com", ocupacion="Comerciante"),
            Cliente(nombre="Patricia Rojas", dni="66666666", telefono="1166778899", direccion="Barrio Sur 200", email="patricia@example.com", ocupacion="Empleada"),
            Cliente(nombre="Diego Morales", dni="77777777", telefono="1177889900", direccion="Centro 300", email="diego@example.com", ocupacion="Contador"),
            Cliente(nombre="Sofía Castro", dni="88888888", telefono="1188990011", direccion="Zona Este 400", email="sofia@example.com", ocupacion="Profesora"),
            Cliente(nombre="Martín Vega", dni="99999999", telefono="1199001122", direccion="Zona Oeste 500", email="martin@example.com", ocupacion="Ingeniero"),
            Cliente(nombre="Laura Méndez", dni="10101010", telefono="1110112233", direccion="Periferia 600", email="laura@example.com", ocupacion="Médica"),
        ]
        db.add_all(nuevos_clientes)
        db.commit()
        print(f"✓ {len(nuevos_clientes)} clientes adicionales creados")
    
    # Agregar más préstamos
    prestamos_actuales = db.query(Prestamo).count()
    if prestamos_actuales < 8:
        clientes = db.query(Cliente).all()
        hoy = date.today()
        
        nuevos_prestamos = [
            Prestamo(
                cliente_id=clientes[3].id,
                monto=5000,
                tasa_interes=12,
                plazo_dias=90,
                fecha_inicio=hoy - timedelta(days=30),
                fecha_vencimiento=hoy + timedelta(days=60),
                monto_total=5600,
                saldo_pendiente=4000,
                estado="activo",
                frecuencia_pago="mensual",
                cuotas_totales=3,
                cuotas_pagadas=1
            ),
            Prestamo(
                cliente_id=clientes[4].id,
                monto=3000,
                tasa_interes=15,
                plazo_dias=60,
                fecha_inicio=hoy - timedelta(days=20),
                fecha_vencimiento=hoy + timedelta(days=40),
                monto_total=3450,
                saldo_pendiente=3450,
                estado="activo",
                frecuencia_pago="quincenal"
            ),
            Prestamo(
                cliente_id=clientes[5].id,
                monto=10000,
                tasa_interes=10,
                plazo_dias=120,
                fecha_inicio=hoy - timedelta(days=60),
                fecha_vencimiento=hoy + timedelta(days=60),
                monto_total=11000,
                saldo_pendiente=5500,
                estado="activo",
                frecuencia_pago="mensual",
                cuotas_totales=4,
                cuotas_pagadas=2
            ),
            Prestamo(
                cliente_id=clientes[6].id,
                monto=1500,
                tasa_interes=20,
                plazo_dias=30,
                fecha_inicio=hoy - timedelta(days=5),
                fecha_vencimiento=hoy + timedelta(days=25),
                monto_total=1800,
                saldo_pendiente=1800,
                estado="activo",
                frecuencia_pago="semanal"
            ),
            Prestamo(
                cliente_id=clientes[7].id,
                monto=8000,
                tasa_interes=8,
                plazo_dias=180,
                fecha_inicio=hoy - timedelta(days=90),
                fecha_vencimiento=hoy + timedelta(days=90),
                monto_total=8640,
                saldo_pendiente=4320,
                estado="activo",
                frecuencia_pago="mensual",
                cuotas_totales=6,
                cuotas_pagadas=3
            ),
        ]
        db.add_all(nuevos_prestamos)
        db.commit()
        print(f"✓ {len(nuevos_prestamos)} préstamos adicionales creados")
    
    # Resumen
    print("\n=== RESUMEN DE DATOS ===")
    print(f"Usuarios: {db.query(Usuario).count()}")
    print(f"Empleados: {db.query(Empleado).count()}")
    print(f"Clientes: {db.query(Cliente).count()}")
    print(f"Préstamos: {db.query(Prestamo).count()}")
    print(f"Pagos: {db.query(Pago).count()}")
    print("\n✓ Base de datos poblada exitosamente")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_complete(db)
    finally:
        db.close()
