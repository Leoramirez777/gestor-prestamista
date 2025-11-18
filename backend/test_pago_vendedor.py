"""
Script de prueba para verificar que las comisiones del vendedor
se registren automáticamente al crear un pago
"""
import requests
import json
from datetime import date

BASE_URL = "http://127.0.0.1:8000/api"

def test_pago_vendedor():
    print("=== Test: Comisión automática del vendedor al registrar pago ===\n")
    
    # 1. Obtener un préstamo que tenga vendedor
    print("1. Buscando préstamos con vendedor...")
    prestamos_response = requests.get(f"{BASE_URL}/prestamos/")
    prestamos = prestamos_response.json()
    
    prestamo_con_vendedor = None
    for prestamo in prestamos:
        # Verificar si tiene vendedor
        vendedor_response = requests.get(f"{BASE_URL}/prestamos/{prestamo['id']}/vendedor")
        if vendedor_response.status_code == 200:
            vendedor_data = vendedor_response.json()
            if vendedor_data.get('porcentaje', 0) > 0:
                prestamo_con_vendedor = prestamo
                print(f"   ✓ Préstamo #{prestamo['id']} tiene vendedor con {vendedor_data['porcentaje']}%")
                print(f"     Vendedor: {vendedor_data['empleado_nombre']}")
                break
    
    if not prestamo_con_vendedor:
        print("   ✗ No hay préstamos con vendedor para probar")
        return
    
    # 2. Registrar un pago
    print(f"\n2. Registrando pago para préstamo #{prestamo_con_vendedor['id']}...")
    monto_pago = 100.0
    pago_data = {
        "prestamo_id": prestamo_con_vendedor['id'],
        "monto": monto_pago,
        "metodo_pago": "efectivo",
        "notas": "Test comisión vendedor",
        "tipo_pago": "cuota"
    }
    
    pago_response = requests.post(f"{BASE_URL}/pagos/", json=pago_data)
    
    if pago_response.status_code != 201:
        print(f"   ✗ Error al crear pago: {pago_response.status_code}")
        print(f"   {pago_response.json()}")
        return
    
    pago = pago_response.json()
    print(f"   ✓ Pago #{pago['id']} creado exitosamente")
    print(f"     Monto: ${monto_pago}")
    
    # 3. Verificar que se creó la comisión del vendedor automáticamente
    print(f"\n3. Verificando comisión del vendedor para pago #{pago['id']}...")
    vendedor_pago_response = requests.get(f"{BASE_URL}/pagos/{pago['id']}/vendedor")
    
    if vendedor_pago_response.status_code == 200:
        comision_vendedor = vendedor_pago_response.json()
        print(f"   ✓ Comisión del vendedor registrada automáticamente:")
        print(f"     Empleado: {comision_vendedor['empleado_nombre']}")
        print(f"     Porcentaje: {comision_vendedor['porcentaje']}%")
        print(f"     Monto comisión: ${comision_vendedor['monto_comision']}")
        print(f"\n   ✓ El hook funciona correctamente!")
    else:
        print(f"   ✗ No se encontró comisión del vendedor (status {vendedor_pago_response.status_code})")
        print(f"   {vendedor_pago_response.json()}")

if __name__ == "__main__":
    test_pago_vendedor()
