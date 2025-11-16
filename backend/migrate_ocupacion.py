import sqlite3
import os

def migrate_add_ocupacion():
    """Agrega la columna 'ocupacion' a la tabla clientes"""
    db_path = os.path.join(os.path.dirname(__file__), "gestor_prestamista.db")
    
    print(f"🔧 Conectando a la base de datos: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(clientes)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'ocupacion' in columns:
            print("✅ La columna 'ocupacion' ya existe en la tabla 'clientes'")
            return
        
        # Agregar la columna ocupacion
        print("➕ Agregando columna 'ocupacion' a la tabla 'clientes'...")
        cursor.execute("ALTER TABLE clientes ADD COLUMN ocupacion VARCHAR(100)")
        conn.commit()
        
        print("✅ Migración completada exitosamente!")
        print("✅ Columna 'ocupacion' agregada a la tabla 'clientes'")
        
    except Exception as e:
        print(f"❌ Error durante la migración: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()
        print("🔒 Conexión cerrada")

if __name__ == "__main__":
    print("=" * 60)
    print("MIGRACIÓN: Agregar columna 'ocupacion' a tabla 'clientes'")
    print("=" * 60)
    migrate_add_ocupacion()
    print("=" * 60)
