"""
Script para agregar la columna frecuencia_pago a la tabla prestamos
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('gestor_prestamista.db')
    cursor = conn.cursor()
    
    try:
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(prestamos)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'frecuencia_pago' not in columns:
            print("Agregando columna frecuencia_pago...")
            cursor.execute("""
                ALTER TABLE prestamos 
                ADD COLUMN frecuencia_pago TEXT DEFAULT 'semanal'
            """)
            conn.commit()
            print("✓ Columna frecuencia_pago agregada exitosamente")
        else:
            print("✓ La columna frecuencia_pago ya existe")
            
    except Exception as e:
        print(f"✗ Error durante la migración: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
