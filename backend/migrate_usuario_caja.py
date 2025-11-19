"""
Migración para agregar columna usuario_id a caja_movimientos
"""
import sqlite3
from pathlib import Path

# Ruta a la base de datos
DB_PATH = Path(__file__).parent / "app" / "database" / "prestamos.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(caja_movimientos)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'usuario_id' not in columns:
            print("Agregando columna usuario_id a caja_movimientos...")
            cursor.execute("""
                ALTER TABLE caja_movimientos 
                ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)
            """)
            conn.commit()
            print("✓ Columna usuario_id agregada exitosamente")
        else:
            print("✓ La columna usuario_id ya existe")
        
        # Verificar que CajaCierre también tenga usuario_id
        cursor.execute("PRAGMA table_info(caja_cierres)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'usuario_id' not in columns:
            print("Agregando columna usuario_id a caja_cierres...")
            cursor.execute("""
                ALTER TABLE caja_cierres 
                ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)
            """)
            conn.commit()
            print("✓ Columna usuario_id agregada a caja_cierres exitosamente")
        else:
            print("✓ La columna usuario_id ya existe en caja_cierres")
            
    except Exception as e:
        print(f"✗ Error durante la migración: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
