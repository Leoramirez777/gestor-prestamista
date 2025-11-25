from app.database.database import SessionLocal
from app.models.models import Pago, PagoCobrador, Empleado, Usuario
from datetime import date

db = SessionLocal()

# Encontrar usuario cobrador
user = db.query(Usuario).filter(Usuario.role == 'cobrador').first()
print(f'Usuario cobrador: {user.username if user else None}')
print(f'Empleado ID: {user.empleado_id if user else None}')

if user and user.empleado_id:
    # Ver todos los pagos del cobrador
    pagos = db.query(Pago).join(PagoCobrador).filter(
        PagoCobrador.empleado_id == user.empleado_id
    ).all()
    
    print(f'\nTotal pagos del cobrador: {len(pagos)}')
    print('\nPrimeros 5 pagos:')
    for p in pagos[:5]:
        pc = db.query(PagoCobrador).filter(PagoCobrador.pago_id == p.id).first()
        print(f'  Pago #{p.id}: ${p.monto}, fecha: {p.fecha_pago}, comision: ${pc.monto_comision if pc else 0}')
    
    # Verificar fecha de hoy
    hoy = date.today()
    print(f'\nFecha de hoy: {hoy}')
    
    pagos_hoy = [p for p in pagos if p.fecha_pago == hoy]
    print(f'Pagos del cobrador para hoy: {len(pagos_hoy)}')
    
    if len(pagos_hoy) == 0:
        print('\n⚠️ NO HAY PAGOS PARA HOY. La caja mostrará $0.00')
        print('Los pagos existentes son de otras fechas.')

db.close()
