"""Script para probar autenticación y endpoint /me"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("=== Test de Autenticación ===\n")

# 1. Hacer login
print("1. Haciendo login con admin/admin123...")
try:
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        print(f"✅ Login exitoso!")
        print(f"Token: {token[:50]}...\n")
        
        # 2. Probar endpoint /me
        print("2. Obteniendo datos del usuario autenticado...")
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if me_response.status_code == 200:
            user_data = me_response.json()
            print("✅ Datos del usuario:")
            print(json.dumps(user_data, indent=2, ensure_ascii=False))
            
            # 3. Actualizar datos
            print("\n3. Actualizando datos del usuario...")
            update_response = requests.put(
                f"{BASE_URL}/api/auth/me",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={
                    "nombre_completo": "Administrador Principal",
                    "dni": "12345678",
                    "telefono": "1122334455",
                    "email": "admin@ejemplo.com",
                    "direccion": "Calle Principal 123"
                }
            )
            
            if update_response.status_code == 200:
                updated_data = update_response.json()
                print("✅ Datos actualizados:")
                print(json.dumps(updated_data, indent=2, ensure_ascii=False))
            else:
                print(f"❌ Error al actualizar: {update_response.status_code}")
                print(update_response.text)
        else:
            print(f"❌ Error al obtener /me: {me_response.status_code}")
            print(me_response.text)
    else:
        print(f"❌ Error en login: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Error de conexión: {e}")
    print("\n⚠️  Asegúrate de que el backend esté corriendo:")
    print("   cd backend")
    print("   uvicorn main:app --reload --host 127.0.0.1 --port 8000")
