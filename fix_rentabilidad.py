# Script temporal para actualizar metrics_service.py
import re

file_path = r"c:\Users\ramir\Documents\GestorPrestamista\backend\app\metrics_service.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Reemplazar el cálculo incorrecto
old_code = """    # Ganancias brutas (intereses cobrados = recaudado - capital)
    ganancias_brutas = total_recaudado - capital_invertido
    
    # Ganancias netas (después de comisiones)
    ganancias_netas = ganancias_brutas - total_comisiones"""

new_code = """    # Ganancias netas (recaudado menos comisiones pagadas)
    ganancias_netas = total_recaudado - total_comisiones
    
    # Ganancias brutas (recaudado total, antes de descontar comisiones)
    ganancias_brutas = total_recaudado"""

content = content.replace(old_code, new_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Archivo actualizado correctamente")
