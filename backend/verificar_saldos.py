"""
Script para verificar y corregir saldos pendientes
"""
import sqlite3

def verificar_saldos():
    conn = sqlite3.connect('gestor_prestamista.db')
    cursor = conn.cursor()
    
    try:
        # Obtener todos los préstamos
        cursor.execute("""
            SELECT p.id, p.monto_total, p.saldo_pendiente, 
                   COALESCE(SUM(pg.monto), 0) as total_pagado
            FROM prestamos p
            LEFT JOIN pagos pg ON p.id = pg.prestamo_id
            GROUP BY p.id
        """)
        
        prestamos = cursor.fetchall()
        
        print("\n=== VERIFICACIÓN DE SALDOS ===\n")
        
        for prestamo in prestamos:
            prestamo_id, monto_total, saldo_actual, total_pagado = prestamo
            saldo_correcto = monto_total - total_pagado
            
            print(f"Préstamo #{prestamo_id}:")
            print(f"  Monto Total: ${monto_total:.2f}")
            print(f"  Total Pagado: ${total_pagado:.2f}")
            print(f"  Saldo Actual en BD: ${saldo_actual:.2f}")
            print(f"  Saldo Correcto: ${saldo_correcto:.2f}")
            
            if abs(saldo_actual - saldo_correcto) > 0.01:
                print(f"  ⚠️  CORRIGIENDO saldo...")
                cursor.execute("""
                    UPDATE prestamos 
                    SET saldo_pendiente = ?
                    WHERE id = ?
                """, (saldo_correcto, prestamo_id))
                print(f"  ✓ Saldo corregido")
            else:
                print(f"  ✓ Saldo correcto")
            print()
        
        conn.commit()
        print("✓ Verificación completada")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    verificar_saldos()
