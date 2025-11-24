"""
Agregar columnas 'role' y 'empleado_id' a la tabla usuarios en SQLite sin perder datos.
"""
import sqlite3
import shutil
from pathlib import Path
from datetime import datetime

DB_PATH = Path("gestor_prestamista.db")
BACKUP_PATH = Path(f"gestor_prestamista_backup_roles_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")

def migrate_add_roles():
    if not DB_PATH.exists():
        print("✗ No se encontró la base de datos gestor_prestamista.db")
        return
    print(f"Creando backup en {BACKUP_PATH}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print("✓ Backup creado")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        # verificar tabla usuarios
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
        if not cur.fetchone():
            print("✗ La tabla usuarios no existe")
            return
        cur.execute("PRAGMA table_info(usuarios)")
        cols = {row[1] for row in cur.fetchall()}
        if 'role' not in cols:
            print("Agregando columna role a usuarios...")
            cur.execute("ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'admin'")
            conn.commit()
            print("✓ role agregada")
        else:
            print("✓ role ya existe")
        if 'empleado_id' not in cols:
            print("Agregando columna empleado_id a usuarios...")
            cur.execute("ALTER TABLE usuarios ADD COLUMN empleado_id INTEGER REFERENCES empleados(id)")
            conn.commit()
            print("✓ empleado_id agregada")
        else:
            print("✓ empleado_id ya existe")
        print("✓ Migración completada")
    except Exception as e:
        print("✗ Error en migración:", e)
        conn.rollback()
        print(f"Restaura desde: {BACKUP_PATH}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_add_roles()
