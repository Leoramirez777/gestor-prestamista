"""
Script para verificar usuarios en la base de datos
"""
from app.database.database import SessionLocal
from app.models.models import Usuario

def check_users():
    db = SessionLocal()
    try:
        usuarios = db.query(Usuario).all()
        print(f"\n📋 Total de usuarios: {len(usuarios)}\n")
        
        if not usuarios:
            print("⚠️  No hay usuarios en la base de datos")
        else:
            for usuario in usuarios:
                print(f"ID: {usuario.id}")
                print(f"Username: {usuario.username}")
                print(f"Nombre: {usuario.nombre_completo}")
                print(f"Password hash: {usuario.hashed_password[:50]}...")
                print("-" * 50)
    except Exception as e:
        print(f"❌ Error al verificar usuarios: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
