"""
Script para agregar la columna usuario_id a una base de datos existente sin perder datos
"""
import sqlite3
import shutil
from pathlib import Path
from datetime import datetime

# Rutas
DB_PATH = Path("gestor_prestamista.db")
BACKUP_PATH = Path(f"gestor_prestamista_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")

def migrate_add_usuario_id():
    if not DB_PATH.exists():
        print("✗ No se encontró la base de datos gestor_prestamista.db")
        return
    
    # Crear backup
    print(f"Creando backup en {BACKUP_PATH}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print("✓ Backup creado")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Verificar si las tablas existen
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='caja_movimientos'")
        if not cursor.fetchone():
            print("✗ La tabla caja_movimientos no existe")
            conn.close()
            return
        
        # Verificar columnas actuales
        cursor.execute("PRAGMA table_info(caja_movimientos)")
        columns = {col[1] for col in cursor.fetchall()}
        
        if 'usuario_id' in columns:
            print("✓ La columna usuario_id ya existe en caja_movimientos")
        else:
            print("Agregando columna usuario_id a caja_movimientos...")
            cursor.execute("""
                ALTER TABLE caja_movimientos 
                ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)
            """)
            conn.commit()
            print("✓ Columna usuario_id agregada a caja_movimientos")
        
        # Verificar caja_cierres
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='caja_cierres'")
        if cursor.fetchone():
            cursor.execute("PRAGMA table_info(caja_cierres)")
            columns = {col[1] for col in cursor.fetchall()}
            
            if 'usuario_id' not in columns:
                print("Agregando columna usuario_id a caja_cierres...")
                cursor.execute("""
                    ALTER TABLE caja_cierres 
                    ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)
                """)
                conn.commit()
                print("✓ Columna usuario_id agregada a caja_cierres")
            else:
                print("✓ La columna usuario_id ya existe en caja_cierres")
        
        # Mostrar resumen de datos
        cursor.execute("SELECT COUNT(*) FROM clientes")
        clientes = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM prestamos")
        prestamos = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM pagos")
        pagos = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM empleados")
        empleados = cursor.fetchone()[0]
        
        print("\n✓ Migración completada exitosamente")
        print(f"\nDatos en la base de datos:")
        print(f"  - Clientes: {clientes}")
        print(f"  - Préstamos: {prestamos}")
        print(f"  - Pagos: {pagos}")
        print(f"  - Empleados: {empleados}")
        
    except Exception as e:
        print(f"✗ Error durante la migración: {e}")
        conn.rollback()
        print(f"\nSe puede restaurar desde: {BACKUP_PATH}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_add_usuario_id()
