"""
Script administrativo para borrar TODOS los préstamos y sus datos relacionados,
sin eliminar clientes.

Elimina en este orden:
1) Comisiones de cobradores y vendedores (relacionadas a pagos)
2) Pagos
3) Relaciones PrestamoVendedor
4) Préstamos
5) Movimientos de caja que referencian préstamos o pagos
6) Recalcula cierres de caja para todas las fechas existentes

Uso (desde la carpeta backend):
  python delete_all_prestamos.py

Si usas un entorno virtual:
  .\\venv\\Scripts\\python.exe delete_all_prestamos.py
"""
from sqlalchemy import delete
from app.database.database import SessionLocal
from app.models.models import (
    Prestamo, Pago, PrestamoVendedor,
    PagoCobrador, PagoVendedor, MovimientoCaja, CajaCierre
)
from app.caja_service import actualizar_totales_cierre


def main():
    db = SessionLocal()
    try:
        print("Iniciando borrado masivo de préstamos (sin tocar clientes)...")
        # Contadores previos
        total_pagos = db.query(Pago).count()
        total_prestamos = db.query(Prestamo).count()
        total_pv = db.query(PrestamoVendedor).count()
        total_pc = db.query(PagoCobrador).count()
        total_pven = db.query(PagoVendedor).count()
        total_movs = db.query(MovimientoCaja).count()
        print(f"Antes: prestamos={total_prestamos}, pagos={total_pagos}, prestamo_vendedor={total_pv}, pago_cobrador={total_pc}, pago_vendedor={total_pven}, movs={total_movs}")

        # 1) Comisiones
        db.execute(delete(PagoCobrador))
        db.execute(delete(PagoVendedor))
        db.commit()

        # 2) Pagos
        db.execute(delete(Pago))
        db.commit()

        # 3) PrestamoVendedor
        db.execute(delete(PrestamoVendedor))
        db.commit()

        # 4) Prestamos
        db.execute(delete(Prestamo))
        db.commit()

        # 5) Movimientos de caja que referencian préstamos o pagos
        db.query(MovimientoCaja).filter(MovimientoCaja.referencia_tipo.in_(["prestamo", "pago"]))\
            .delete(synchronize_session=False)
        db.commit()

        # 6) Recalcular cierres existentes
        fechas_cierre = [c.fecha for c in db.query(CajaCierre).all()]
        for f in fechas_cierre:
            actualizar_totales_cierre(db, f)
        db.commit()

        # Post
        total_pagos = db.query(Pago).count()
        total_prestamos = db.query(Prestamo).count()
        total_pv = db.query(PrestamoVendedor).count()
        total_pc = db.query(PagoCobrador).count()
        total_pven = db.query(PagoVendedor).count()
        total_movs = db.query(MovimientoCaja).count()
        print(f"Después: prestamos={total_prestamos}, pagos={total_pagos}, prestamo_vendedor={total_pv}, pago_cobrador={total_pc}, pago_vendedor={total_pven}, movs={total_movs}")
        print("✓ Borrado completado.")
    except Exception as e:
        db.rollback()
        print("✗ Error durante el borrado:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
