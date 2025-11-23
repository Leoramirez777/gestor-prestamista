"""
Script para resetear la contraseña del usuario admin
"""
from app.database.database import SessionLocal
from app.models.models import Usuario
import bcrypt

def reset_admin_password():
    db = SessionLocal()
    try:
        # Buscar el usuario admin
        admin = db.query(Usuario).filter(Usuario.username == "admin").first()
        
        if not admin:
            print("❌ Usuario 'admin' no encontrado")
            return
        
        # Nueva contraseña
        new_password = "admin123"
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Actualizar contraseña
        admin.hashed_password = hashed_password
        db.commit()
        
        print("✅ Contraseña del usuario 'admin' reseteada exitosamente!")
        print(f"Usuario: admin")
        print(f"Contraseña: {new_password}")
        print(f"Hash: {hashed_password[:50]}...")
        
    except Exception as e:
        print(f"❌ Error al resetear contraseña: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_password()
