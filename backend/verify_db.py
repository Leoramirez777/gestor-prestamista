"""Script para verificar y actualizar la base de datos SQLite"""
import sqlite3
import sys

DB_PATH = 'gestor_prestamista.db'

print("=== Verificación de Base de Datos ===\n")

try:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Verificar estructura de tabla usuarios
    print("1. Estructura de tabla 'usuarios':")
    cur.execute("PRAGMA table_info(usuarios)")
    columns = cur.fetchall()
    
    if not columns:
        print("❌ La tabla 'usuarios' no existe!")
        print("\nEjecuta primero:")
        print("  uvicorn main:app --reload")
        print("  (para que SQLAlchemy cree las tablas)")
        sys.exit(1)
    
    print("Columnas encontradas:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    
    # Verificar columnas nuevas
    column_names = [col[1] for col in columns]
    required_columns = ['dni', 'telefono', 'direccion', 'email']
    missing = [c for c in required_columns if c not in column_names]
    
    if missing:
        print(f"\n⚠️  Faltan columnas: {', '.join(missing)}")
        print("Agregándolas...")
        
        for col in missing:
            cur.execute(f"ALTER TABLE usuarios ADD COLUMN {col} TEXT")
            print(f"  ✅ Agregada columna '{col}'")
        
        conn.commit()
        print("\n✅ Columnas agregadas exitosamente!")
    else:
        print("\n✅ Todas las columnas necesarias están presentes!")
    
    # 2. Verificar usuarios existentes
    print("\n2. Usuarios en la base de datos:")
    cur.execute("SELECT id, username, nombre_completo, dni, telefono, email FROM usuarios")
    users = cur.fetchall()
    
    if not users:
        print("⚠️  No hay usuarios. Ejecuta: python create_admin.py")
    else:
        print(f"Total: {len(users)} usuario(s)")
        for user in users:
            print(f"  ID: {user[0]} | User: {user[1]} | Nombre: {user[2]}")
            if user[3] or user[4] or user[5]:
                print(f"    DNI: {user[3]} | Tel: {user[4]} | Email: {user[5]}")
    
    conn.close()
    print("\n✅ Verificación completada!")
    
except sqlite3.Error as e:
    print(f"❌ Error de SQLite: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
