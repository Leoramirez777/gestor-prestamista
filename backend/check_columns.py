import sqlite3

conn = sqlite3.connect('app/database/prestamos.db')
cursor = conn.cursor()

# Verificar estructura de caja_movimientos
cursor.execute('PRAGMA table_info(caja_movimientos)')
columns = cursor.fetchall()

print("Columnas en caja_movimientos:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

conn.close()
