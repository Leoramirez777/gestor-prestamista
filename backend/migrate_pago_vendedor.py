"""
Script de migración para crear la tabla pagos_vendedores
Ejecutar desde backend/: python migrate_pago_vendedor.py
"""
from app.database.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Crear tabla pagos_vendedores
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pagos_vendedores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pago_id INTEGER NOT NULL,
                empleado_id INTEGER,
                empleado_nombre VARCHAR(100),
                porcentaje REAL NOT NULL,
                monto_comision REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE CASCADE,
                FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE SET NULL
            )
        """))
        conn.commit()
        print("✓ Tabla pagos_vendedores creada exitosamente")

if __name__ == "__main__":
    migrate()
