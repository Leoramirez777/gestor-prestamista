"""
Script para crear el usuario administrador inicial
"""
from app.database.database import SessionLocal
from app.models.models import Usuario
import bcrypt

def create_admin_user():
    db = SessionLocal()
    try:
        # Verificar si ya existe el usuario admin
        existing_user = db.query(Usuario).filter(Usuario.username == "admin").first()
        if existing_user:
            print("El usuario 'admin' ya existe.")
            return
        
        # Crear usuario admin
        password = "admin123"
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin_user = Usuario(
            username="admin",
            hashed_password=hashed_password,
            nombre_completo="Administrador",
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        print("✅ Usuario administrador creado exitosamente!")
        print("Usuario: admin")
        print("Contraseña: admin123")
        print("\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer inicio de sesión.")
    except Exception as e:
        print(f"❌ Error al crear usuario: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
