"""
Migración: Sistema de cuotas con saldo a favor/contra
Agrega campos para manejar cuotas, saldo acumulado y tipo de pago
"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'gestor_prestamista.db')

print(f"Conectando a la base de datos: {db_path}")

def migrate():
    if not os.path.exists(db_path):
        print(f"ERROR: No se encontró la base de datos en {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("\n=== MIGRACIÓN: SISTEMA DE CUOTAS ===\n")
        
        # Agregar columnas a la tabla prestamos
        print("Agregando columnas a la tabla prestamos...")
        
        columnas_prestamo = [
            ("cuotas_totales", "INTEGER DEFAULT 0"),
            ("cuotas_pagadas", "INTEGER DEFAULT 0"),
            ("valor_cuota", "REAL DEFAULT 0.0"),
            ("saldo_cuota", "REAL DEFAULT 0.0")
        ]
        
        for columna, tipo in columnas_prestamo:
            try:
                cursor.execute(f"ALTER TABLE prestamos ADD COLUMN {columna} {tipo}")
                print(f"✓ Columna {columna} agregada")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print(f"✓ Columna {columna} ya existe")
                else:
                    raise
        
        # Agregar columna a la tabla pagos
        print("\nAgregando columna a la tabla pagos...")
        
        try:
            cursor.execute("ALTER TABLE pagos ADD COLUMN tipo_pago VARCHAR(20) DEFAULT 'parcial'")
            print("✓ Columna tipo_pago agregada")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("✓ Columna tipo_pago ya existe")
            else:
                raise
        
        # Calcular y actualizar valores para préstamos existentes
        print("\nActualizando préstamos existentes con valores de cuotas...")
        
        cursor.execute("""
            SELECT id, monto, tasa_interes, plazo_dias, frecuencia_pago, monto_total
            FROM prestamos
            WHERE cuotas_totales = 0 OR valor_cuota = 0.0
        """)
        
        prestamos = cursor.fetchall()
        
        for prestamo in prestamos:
            id_prestamo, monto, tasa_interes, plazo_dias, frecuencia_pago, monto_total = prestamo
            
            # Calcular cuotas según frecuencia
            if frecuencia_pago == "mensual":
                cuotas_totales = max(1, round(plazo_dias / 30))
            else:  # semanal
                cuotas_totales = max(1, round(plazo_dias / 7))
            
            # Si monto_total no existe, calcularlo
            if not monto_total:
                monto_interes = monto * (tasa_interes / 100)
                monto_total = monto + monto_interes
            
            valor_cuota = monto_total / cuotas_totales if cuotas_totales > 0 else monto_total
            
            # Calcular cuotas pagadas basado en pagos existentes
            cursor.execute("""
                SELECT COUNT(*) FROM pagos WHERE prestamo_id = ?
            """, (id_prestamo,))
            cuotas_pagadas = cursor.fetchone()[0]
            
            # Calcular saldo_cuota basado en pagos
            cursor.execute("""
                SELECT SUM(monto) FROM pagos WHERE prestamo_id = ?
            """, (id_prestamo,))
            total_pagado = cursor.fetchone()[0] or 0
            
            # Saldo esperado hasta ahora vs pagado
            monto_esperado = cuotas_pagadas * valor_cuota
            saldo_cuota = monto_esperado - total_pagado
            
            cursor.execute("""
                UPDATE prestamos
                SET cuotas_totales = ?, 
                    cuotas_pagadas = ?, 
                    valor_cuota = ?,
                    saldo_cuota = ?
                WHERE id = ?
            """, (cuotas_totales, cuotas_pagadas, valor_cuota, saldo_cuota, id_prestamo))
            
            print(f"✓ Préstamo #{id_prestamo}: {cuotas_totales} cuotas de ${valor_cuota:.2f}, {cuotas_pagadas} pagadas, saldo_cuota: ${saldo_cuota:.2f}")
        
        conn.commit()
        print("\n✅ Migración completada exitosamente\n")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error durante la migración: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
