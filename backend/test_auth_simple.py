"""Script para probar autenticación usando solo librerías estándar"""
import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

print("=== Test de Autenticación ===\n")

try:
    # 1. Hacer login
    print("1. Haciendo login con admin/admin123...")
    
    login_data = urllib.parse.urlencode({
        'username': 'admin',
        'password': 'admin123'
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=login_data,
        method='POST'
    )
    
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        token = data.get('access_token')
        print(f"✅ Login exitoso!")
        print(f"Username: {data.get('username')}")
        print(f"Token: {token[:50]}...\n")
        
        # 2. Probar endpoint /me
        print("2. Obteniendo datos del usuario autenticado...")
        
        me_req = urllib.request.Request(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        with urllib.request.urlopen(me_req) as me_response:
            user_data = json.loads(me_response.read().decode('utf-8'))
            print("✅ Datos del usuario:")
            print(json.dumps(user_data, indent=2, ensure_ascii=False))
            
            # 3. Actualizar datos
            print("\n3. Actualizando datos del usuario...")
            
            update_data = json.dumps({
                "nombre_completo": "Administrador Principal",
                "dni": "12345678",
                "telefono": "1122334455",
                "email": "admin@ejemplo.com",
                "direccion": "Calle Principal 123"
            }).encode('utf-8')
            
            update_req = urllib.request.Request(
                f"{BASE_URL}/api/auth/me",
                data=update_data,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                method='PUT'
            )
            
            with urllib.request.urlopen(update_req) as update_response:
                updated_data = json.loads(update_response.read().decode('utf-8'))
                print("✅ Datos actualizados:")
                print(json.dumps(updated_data, indent=2, ensure_ascii=False))
                
                print("\n" + "="*50)
                print("✅ TODO FUNCIONANDO CORRECTAMENTE!")
                print("="*50)
                print("\nAhora puedes:")
                print("1. Ir al frontend (http://localhost:5173)")
                print("2. Login con: admin / admin123")
                print("3. Ir a Ajustes → verás 'Mi Perfil' con tus datos")
                print("4. Editar y guardar cambios")
        
except urllib.error.HTTPError as e:
    print(f"❌ Error HTTP {e.code}: {e.reason}")
    print(e.read().decode('utf-8'))
except urllib.error.URLError as e:
    print(f"❌ Error de conexión: {e.reason}")
    print("\n⚠️  Asegúrate de que el backend esté corriendo:")
    print("   Terminal uvicorn debe mostrar:")
    print("   INFO:     Uvicorn running on http://127.0.0.1:8000")
except Exception as e:
    print(f"❌ Error inesperado: {e}")
