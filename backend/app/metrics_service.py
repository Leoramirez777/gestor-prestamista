from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Cliente, Prestamo, Pago


def get_summary_metrics(db: Session) -> dict:
    today = date.today()

    total_clientes = db.query(func.count(Cliente.id)).scalar() or 0
    total_prestamos = db.query(func.count(Prestamo.id)).scalar() or 0
    total_pagos = db.query(func.count(Pago.id)).scalar() or 0

    monto_total_prestado = db.query(func.coalesce(func.sum(Prestamo.monto), 0)).scalar() or 0.0
    monto_total_recaudado = db.query(func.coalesce(func.sum(Pago.monto), 0)).scalar() or 0.0
    monto_total_esperado = db.query(func.coalesce(func.sum(Prestamo.monto_total), 0)).scalar() or 0.0
    saldo_pendiente_total = db.query(func.coalesce(func.sum(Prestamo.saldo_pendiente), 0)).scalar() or 0.0

    prestamos_activos = db.query(func.count(Prestamo.id)).filter(Prestamo.saldo_pendiente > 0, Prestamo.estado == 'activo').scalar() or 0
    prestamos_vencidos = db.query(func.count(Prestamo.id)).filter(
        Prestamo.saldo_pendiente > 0,
        Prestamo.fecha_vencimiento < today
    ).scalar() or 0

    pagos_hoy = db.query(func.count(Pago.id)).filter(Pago.fecha_pago == today).scalar() or 0

    # Tasa de recaudo basada en monto total esperado (capital + interés) y limitada a 100%
    if monto_total_esperado > 0:
        tasa_recaudo = min(monto_total_recaudado / monto_total_esperado, 1.0)
    else:
        tasa_recaudo = 0.0
    average_loan_size = (monto_total_prestado / total_prestamos) if total_prestamos > 0 else 0.0
    ticket_promedio_pago = (monto_total_recaudado / total_pagos) if total_pagos > 0 else 0.0

    clientes_activos = db.query(func.count(func.distinct(Prestamo.cliente_id))).filter(Prestamo.saldo_pendiente > 0).scalar() or 0

    return {
        'timestamp': today.isoformat(),
        'total_clientes': total_clientes,
        'total_prestamos': total_prestamos,
        'total_pagos': total_pagos,
        'monto_total_prestado': round(monto_total_prestado, 2),
        'monto_total_recaudado': round(monto_total_recaudado, 2),
        'monto_total_esperado': round(monto_total_esperado, 2),
        'saldo_pendiente_total': round(saldo_pendiente_total, 2),
        'prestamos_activos': prestamos_activos,
        'prestamos_vencidos': prestamos_vencidos,
        'pagos_hoy': pagos_hoy,
        'tasa_recaudo': round(tasa_recaudo, 4),
        'average_loan_size': round(average_loan_size, 2),
        'ticket_promedio_pago': round(ticket_promedio_pago, 2),
        'clientes_activos': clientes_activos
    }
