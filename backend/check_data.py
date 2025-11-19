import sqlite3

conn = sqlite3.connect('gestor_prestamista.db')
cursor = conn.cursor()

tables = ['clientes', 'prestamos', 'pagos', 'empleados', 'usuarios']
print('Conteo de registros:')
for t in tables:
    try:
        count = cursor.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f'  {t}: {count}')
    except:
        print(f'  {t}: (tabla no existe)')

conn.close()
