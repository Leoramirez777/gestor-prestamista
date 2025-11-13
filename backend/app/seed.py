import sys
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.models import Cliente, Prestamo, Pago


def seed(db: Session):
    # Evitar duplicados si ya hay datos
    if db.query(Cliente).count() > 0:
        return

    # Clientes
    clientes = [
        Cliente(nombre="Lucas Fernández", dni="12345678", telefono="1123456789", direccion="Calle 1", email="lucas@example.com"),
        Cliente(nombre="María Gómez", dni="23456789", telefono="1133344455", direccion="Calle 2", email="maria@example.com"),
        Cliente(nombre="Javier Torres", dni="34567890", telefono="1145678901", direccion="Calle 3", email="javier@example.com"),
        Cliente(nombre="Camila Ruiz", dni="45678901", telefono="1167788990", direccion="Calle 4", email="camila@example.com"),
    ]
    db.add_all(clientes)
    db.flush()  # para obtener IDs

    # Prestamos
    hoy = date.today()
    prestamos = [
        Prestamo(
            cliente_id=clientes[0].id,
            monto=1000,
            tasa_interes=10,
            plazo_dias=30,
            fecha_inicio=hoy,
            fecha_vencimiento=hoy + timedelta(days=30),
            monto_total=1100,
            saldo_pendiente=1100,
            estado="activo",
        ),
        Prestamo(
            cliente_id=clientes[2].id,
            monto=2000,
            tasa_interes=8,
            plazo_dias=60,
            fecha_inicio=hoy,
            fecha_vencimiento=hoy + timedelta(days=60),
            monto_total=2160,
            saldo_pendiente=2160,
            estado="activo",
        ),
    ]
    db.add_all(prestamos)
    db.flush()

    # Pagos (uno al primer préstamo)
    pagos = [
        Pago(
            prestamo_id=prestamos[0].id,
            monto=300,
            fecha_pago=hoy + timedelta(days=7),
            metodo_pago="efectivo",
            notas="Primer pago",
        )
    ]
    db.add_all(pagos)

    # Ajustar saldo pendiente del primer préstamo
    prestamos[0].saldo_pendiente -= 300

    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
        print("Seed completado")
    finally:
        db.close()
