from datetime import date, datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Cliente, Prestamo, Pago, PagoVendedor, PagoCobrador
from app.amortization_service import generar_amortizacion


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
    
    # Calcular tasa de activación (clientes con préstamos activos / total clientes)
    activation_rate = (clientes_activos / total_clientes) if total_clientes > 0 else 0.0
    
    # Calcular comisiones (totales históricas)
    total_comisiones_vendedor = db.query(func.coalesce(func.sum(PagoVendedor.monto_comision), 0)).scalar() or 0.0
    total_comisiones_cobrador = db.query(func.coalesce(func.sum(PagoCobrador.monto_comision), 0)).scalar() or 0.0
    total_comisiones = total_comisiones_vendedor + total_comisiones_cobrador
    
    # Ingresos netos (recaudado menos comisiones pagadas)
    ingresos_netos = monto_total_recaudado - total_comisiones
    # Intereses cobrados (ganancia bruta antes de comisiones)
    intereses_cobrados = monto_total_recaudado - monto_total_prestado
    # Ganancias netas reales (intereses cobrados menos comisiones)
    ganancias_netas = intereses_cobrados - total_comisiones

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
        'clientes_activos': clientes_activos,
        'activation_rate': round(activation_rate, 4),
        'comisiones': {
            'vendedor': round(total_comisiones_vendedor, 2),
            'cobrador': round(total_comisiones_cobrador, 2),
            'total': round(total_comisiones, 2)
        },
        'ingresos_netos': round(ingresos_netos, 2),  # Recaudado - comisiones
        'intereses_cobrados': round(intereses_cobrados, 2),  # Recaudado - capital
        'ganancias_netas': round(ganancias_netas, 2),  # Intereses - comisiones
        'total_comisiones_pagadas': round(total_comisiones, 2)
    }


def get_due_today(db: Session) -> dict:
    """Monto esperado a cobrar hoy y cantidad de cuotas con fecha de hoy."""
    today = date.today().isoformat()
    monto = 0.0
    count = 0

    prestamos = db.query(Prestamo).all()
    for p in prestamos:
        cuotas = generar_amortizacion(p, db)
        for c in cuotas:
            if c['fecha'] == today:
                monto += float(c['monto'] or 0)
                count += 1

    return {
        'fecha': today,
        'monto_esperado_hoy': round(monto, 2),
        'cuotas_hoy': count
    }


def get_due_next(db: Session, days: int = 7) -> dict:
    """Monto y cantidad de cuotas que vencen en los próximos N días (excluye hoy)."""
    from datetime import timedelta
    base = date.today()
    limit = base + timedelta(days=days)

    total_monto = 0.0
    total_count = 0
    por_dia = {}

    prestamos = db.query(Prestamo).all()
    for p in prestamos:
        cuotas = generar_amortizacion(p, db)
        for c in cuotas:
            f = c['fecha']
            # rango: (hoy, hoy+days]
            if base.isoformat() < f <= limit.isoformat():
                total_monto += float(c['monto'] or 0)
                total_count += 1
                por_dia.setdefault(f, {'fecha': f, 'monto': 0.0, 'cantidad': 0})
                por_dia[f]['monto'] += float(c['monto'] or 0)
                por_dia[f]['cantidad'] += 1

    # Ordenar por fecha
    detalle = [por_dia[k] for k in sorted(por_dia.keys())]

    return {
        'desde': base.isoformat(),
        'hasta': limit.isoformat(),
        'monto_proximos': round(total_monto, 2),
        'cuotas_proximas': total_count,
        'por_dia': detalle
    }


def get_kpis(db: Session) -> dict:
    """Combina resumen + esperado hoy + recaudado hoy y cálculos derivados."""
    summary = get_summary_metrics(db)
    due_today = get_due_today(db)
    today = date.today()

    recaudado_hoy_monto = db.query(func.coalesce(func.sum(Pago.monto), 0)).filter(Pago.fecha_pago == today).scalar() or 0.0
    monto_esperado_hoy = due_today.get('monto_esperado_hoy', 0.0)
    if monto_esperado_hoy > 0:
        cumplimiento_hoy_pct = min(recaudado_hoy_monto / monto_esperado_hoy, 1.0)
    else:
        cumplimiento_hoy_pct = 0.0

    total_clientes = summary['total_clientes'] or 0
    clientes_activos = summary['clientes_activos'] or 0
    activation_rate = (clientes_activos / total_clientes) if total_clientes > 0 else 0.0

    return {
        'timestamp': summary['timestamp'],
        'total_clientes': total_clientes,
        'total_prestamos': summary['total_prestamos'],
        'monto_total_prestado': summary['monto_total_prestado'],
        'monto_total_recaudado': summary['monto_total_recaudado'],
        'monto_total_esperado': summary['monto_total_esperado'],
        'saldo_pendiente_total': summary['saldo_pendiente_total'],
        'prestamos_activos': summary['prestamos_activos'],
        'prestamos_vencidos': summary['prestamos_vencidos'],
        'pagos_hoy': summary['pagos_hoy'],
        'monto_esperado_hoy': monto_esperado_hoy,
        'recaudado_hoy_monto': round(recaudado_hoy_monto, 2),
        'cumplimiento_hoy_pct': round(cumplimiento_hoy_pct, 4),
        'tasa_recaudo': summary['tasa_recaudo'],
        'average_loan_size': summary['average_loan_size'],
        'ticket_promedio_pago': summary['ticket_promedio_pago'],
        'clientes_activos': clientes_activos,
        'activation_rate': round(activation_rate, 4)
    }


def get_daily_simple(db: Session, days: int = 1) -> dict:
    """Resumen simplificado del período: prestado, prestado con intereses,
    por cobrar (cuotas programadas) y cobrado en los últimos N días."""
    from datetime import timedelta
    today_date = date.today()
    start_date = today_date - timedelta(days=days - 1)

    # Préstamos creados en el período (principal y con intereses)
    prestado_hoy = db.query(func.coalesce(func.sum(Prestamo.monto), 0)).filter(
        func.date(Prestamo.created_at) >= start_date,
        func.date(Prestamo.created_at) <= today_date
    ).scalar() or 0.0
    prestado_con_intereses_hoy = db.query(func.coalesce(func.sum(Prestamo.monto_total), 0)).filter(
        func.date(Prestamo.created_at) >= start_date,
        func.date(Prestamo.created_at) <= today_date
    ).scalar() or 0.0

    # Cobrado en el período (pagos realizados)
    cobrado_hoy = db.query(func.coalesce(func.sum(Pago.monto), 0)).filter(
        Pago.fecha_pago >= start_date,
        Pago.fecha_pago <= today_date
    ).scalar() or 0.0

    # Por cobrar en el período (monto esperado de cuotas con fecha en el rango)
    # Generar tabla de amortización para todos los préstamos activos
    prestamos_activos = db.query(Prestamo).filter(Prestamo.saldo_pendiente > 0).all()
    por_cobrar_hoy = 0.0
    for prestamo in prestamos_activos:
        amortizacion = generar_amortizacion(prestamo, db)
        for cuota in amortizacion:
            from datetime import datetime as dt
            fecha_cuota = dt.fromisoformat(cuota['fecha']).date()
            if start_date <= fecha_cuota <= today_date:
                if cuota['estado'] != 'Pagado':  # Solo cuotas pendientes o vencidas
                    por_cobrar_hoy += cuota['monto']

    return {
        'fecha': today_date.isoformat(),
        'prestado_hoy': round(prestado_hoy, 2),
        'prestado_con_intereses_hoy': round(prestado_con_intereses_hoy, 2),
        'por_cobrar_hoy': round(por_cobrar_hoy, 2),
        'cobrado_hoy': round(cobrado_hoy, 2)
    }


def get_period_metrics(db: Session, period_type: str, start_date: date, end_date: Optional[date] = None) -> dict:
    """Obtiene métricas de un período específico (día, semana o mes)."""
    if end_date is None:
        end_date = start_date

    # Préstamos creados en el período
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    prestado = db.query(func.coalesce(func.sum(Prestamo.monto), 0)).filter(
        Prestamo.created_at >= start_datetime,
        Prestamo.created_at <= end_datetime
    ).scalar() or 0.0
    
    prestado_con_intereses = db.query(func.coalesce(func.sum(Prestamo.monto_total), 0)).filter(
        Prestamo.created_at >= start_datetime,
        Prestamo.created_at <= end_datetime
    ).scalar() or 0.0

    # Pagos realizados en el período
    cobrado = db.query(func.coalesce(func.sum(Pago.monto), 0)).filter(
        Pago.fecha_pago >= start_date,
        Pago.fecha_pago <= end_date
    ).scalar() or 0.0

    # Por cobrar: cuotas programadas en el período
    prestamos_activos = db.query(Prestamo).filter(Prestamo.saldo_pendiente > 0).all()
    por_cobrar = 0.0
    
    for prestamo in prestamos_activos:
        amortizacion = generar_amortizacion(prestamo, db)
        for cuota in amortizacion:
            from datetime import datetime as dt
            fecha_cuota = dt.fromisoformat(cuota['fecha']).date()
            if start_date <= fecha_cuota <= end_date:
                if cuota['estado'] != 'Pagado':  # Solo cuotas pendientes o vencidas
                    por_cobrar += cuota['monto']

    return {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'prestado': round(prestado, 2),
        'prestado_con_intereses': round(prestado_con_intereses, 2),
        'por_cobrar': round(por_cobrar, 2),
        'cobrado': round(cobrado, 2)
    }


def get_expectativas(db: Session, start_date: date, end_date: Optional[date] = None) -> dict:
    """Obtiene las expectativas de cobro para un período específico."""
    if end_date is None:
        end_date = start_date

    prestamos_activos = db.query(Prestamo).filter(Prestamo.saldo_pendiente > 0).all()
    monto_esperado = 0.0
    cantidad_cuotas = 0

    for prestamo in prestamos_activos:
        amortizacion = generar_amortizacion(prestamo, db)
        for cuota in amortizacion:
            from datetime import datetime as dt
            fecha_cuota = dt.fromisoformat(cuota['fecha']).date()
            if start_date <= fecha_cuota <= end_date:
                if cuota['estado'] != 'Pagado':  # Solo cuotas pendientes o vencidas
                    monto_esperado += cuota['monto']
                    cantidad_cuotas += 1

    return {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'monto_esperado': round(monto_esperado, 2),
        'cantidad_cuotas': cantidad_cuotas
    }


def get_segment_metrics(db: Session, dimension: str, start_date: Optional[date] = None, end_date: Optional[date] = None) -> dict:
    """Agrupa préstamos por dimensión solicitada."""
    query = db.query(Prestamo)
    if start_date and end_date:
        # Filtramos por fecha de inicio de préstamo en rango
        query = query.filter(Prestamo.fecha_inicio >= start_date, Prestamo.fecha_inicio <= end_date)

    prestamos = query.all()
    grupos = {}

    today = date.today()

    def bucket_tamano(monto: float) -> str:
        if monto < 500:
            return 'micro'
        if monto < 1000:
            return 'pequeno'
        if monto < 5000:
            return 'mediano'
        return 'grande'

    def bucket_antiguedad(dias: int) -> str:
        if dias <= 7:
            return '0-7'
        if dias <= 30:
            return '8-30'
        if dias <= 90:
            return '31-90'
        return '91+'

    def bucket_morosidad(p: Prestamo) -> str:
        if p.estado == 'pagado':  # type: ignore
            return 'pagado'
        if p.fecha_vencimiento < today and p.saldo_pendiente > 0:  # type: ignore
            return 'vencido'
        return 'al_dia'

    for p in prestamos:
        if dimension == 'frecuencia_pago':
            key = p.frecuencia_pago or 'desconocida'
        elif dimension == 'estado':
            key = p.estado or 'desconocido'
        elif dimension == 'tamano':
            key = bucket_tamano(float(p.monto))  # type: ignore[arg-type]
        elif dimension == 'antiguedad':
            dias = (today - p.fecha_inicio).days
            key = bucket_antiguedad(dias)
        elif dimension == 'morosidad':
            key = bucket_morosidad(p)
        else:
            key = 'otros'

        g = grupos.setdefault(key, {
            'grupo': key,
            'prestamos': 0,
            'monto_prestado': 0.0,
            'monto_total': 0.0,
            'saldo_pendiente': 0.0
        })
        g['prestamos'] += 1
        g['monto_prestado'] += p.monto
        g['monto_total'] += p.monto_total
        g['saldo_pendiente'] += p.saldo_pendiente

    items = []
    total_prestamos = 0
    for key, data in grupos.items():
        total_prestamos += data['prestamos']
        promedio = data['monto_prestado'] / data['prestamos'] if data['prestamos'] > 0 else 0.0
        items.append({
            'grupo': key,
            'prestamos': data['prestamos'],
            'monto_prestado': round(data['monto_prestado'], 2),
            'monto_total': round(data['monto_total'], 2),
            'saldo_pendiente': round(data['saldo_pendiente'], 2),
            'promedio_monto': round(promedio, 2)
        })

    items.sort(key=lambda x: x['grupo'])

    return {
        'dimension': dimension,
        'start_date': start_date.isoformat() if start_date else None,
        'end_date': end_date.isoformat() if end_date else None,
        'total_prestamos': total_prestamos,
        'items': items
    }


def get_top_clientes(db: Session, limit: int = 10) -> dict:
    """Obtiene los top clientes por diferentes métricas."""
    # Top por monto total prestado
    top_por_monto = db.query(
        Cliente.id,
        Cliente.nombre,
        func.sum(Prestamo.monto).label('total_prestado'),
        func.count(Prestamo.id).label('cantidad_prestamos')
    ).join(Prestamo).group_by(Cliente.id, Cliente.nombre).order_by(
        func.sum(Prestamo.monto).desc()
    ).limit(limit).all()

    # Top por cantidad de préstamos
    top_por_cantidad = db.query(
        Cliente.id,
        Cliente.nombre,
        func.count(Prestamo.id).label('cantidad_prestamos'),
        func.sum(Prestamo.monto).label('total_prestado')
    ).join(Prestamo).group_by(Cliente.id, Cliente.nombre).order_by(
        func.count(Prestamo.id).desc()
    ).limit(limit).all()

    # Top por monto pendiente (clientes con más deuda)
    top_deudores = db.query(
        Cliente.id,
        Cliente.nombre,
        func.sum(Prestamo.saldo_pendiente).label('saldo_pendiente'),
        func.count(Prestamo.id).label('prestamos_activos')
    ).join(Prestamo).filter(Prestamo.saldo_pendiente > 0).group_by(
        Cliente.id, Cliente.nombre
    ).order_by(func.sum(Prestamo.saldo_pendiente).desc()).limit(limit).all()

    return {
        'top_por_monto': [
            {
                'cliente_id': c.id,
                'nombre': c.nombre,
                'total_prestado': round(float(c.total_prestado), 2),
                'cantidad_prestamos': c.cantidad_prestamos
            } for c in top_por_monto
        ],
        'top_por_cantidad': [
            {
                'cliente_id': c.id,
                'nombre': c.nombre,
                'cantidad_prestamos': c.cantidad_prestamos,
                'total_prestado': round(float(c.total_prestado), 2)
            } for c in top_por_cantidad
        ],
        'top_deudores': [
            {
                'cliente_id': c.id,
                'nombre': c.nombre,
                'saldo_pendiente': round(float(c.saldo_pendiente), 2),
                'prestamos_activos': c.prestamos_activos
            } for c in top_deudores
        ]
    }


def get_rentabilidad(db: Session) -> dict:
    """Calcula métricas de rentabilidad del negocio."""
    # Total prestado (capital)
    capital_invertido = db.query(func.coalesce(func.sum(Prestamo.monto), 0)).scalar() or 0.0
    
    # Total recaudado
    total_recaudado = db.query(func.coalesce(func.sum(Pago.monto), 0)).scalar() or 0.0
    
    # Comisiones pagadas
    comisiones_vendedor = db.query(func.coalesce(func.sum(PagoVendedor.monto_comision), 0)).scalar() or 0.0
    comisiones_cobrador = db.query(func.coalesce(func.sum(PagoCobrador.monto_comision), 0)).scalar() or 0.0
    total_comisiones = comisiones_vendedor + comisiones_cobrador
    
    # Ganancias brutas (intereses cobrados = recaudado - capital)
    ganancias_brutas = total_recaudado - capital_invertido
    
    # Ganancias netas (después de comisiones)
    ganancias_netas = ganancias_brutas - total_comisiones
    
    # ROI (Return on Investment)
    roi = (ganancias_netas / capital_invertido) if capital_invertido > 0 else 0.0
    
    # Margen de ganancia
    margen = (ganancias_netas / total_recaudado) if total_recaudado > 0 else 0.0
    
    # Saldo pendiente por cobrar
    por_cobrar = db.query(func.coalesce(func.sum(Prestamo.saldo_pendiente), 0)).scalar() or 0.0
    
    # Capital en riesgo (prestado pero aún no cobrado completamente)
    prestamos_activos = db.query(Prestamo).filter(Prestamo.saldo_pendiente > 0).all()
    capital_en_riesgo = sum(float(p.monto) for p in prestamos_activos)  # type: ignore[arg-type]
    
    return {
        'capital_invertido': round(capital_invertido, 2),
        'total_recaudado': round(total_recaudado, 2),
        'ganancias_brutas': round(ganancias_brutas, 2),
        'total_comisiones': round(total_comisiones, 2),
        'ganancias_netas': round(ganancias_netas, 2),
        'roi': round(roi, 4),
        'roi_porcentaje': round(roi * 100, 2),
        'margen': round(margen, 4),
        'margen_porcentaje': round(margen * 100, 2),
        'por_cobrar': round(por_cobrar, 2),
        'capital_en_riesgo': round(capital_en_riesgo, 2)
    }


def get_evolucion_temporal(db: Session, periodo_dias: int = 30) -> dict:
    """Obtiene la evolución de métricas clave en los últimos N días."""
    from datetime import timedelta
    today = date.today()
    start = today - timedelta(days=periodo_dias - 1)
    
    # Generar lista de fechas
    fechas = []
    current = start
    while current <= today:
        fechas.append(current)
        current += timedelta(days=1)
    
    # Datos por día
    evolucion = []
    for fecha in fechas:
        # Préstamos creados ese día
        prestado = db.query(func.coalesce(func.sum(Prestamo.monto), 0)).filter(
            func.date(Prestamo.created_at) == fecha
        ).scalar() or 0.0
        
        # Pagos recibidos ese día
        cobrado = db.query(func.coalesce(func.sum(Pago.monto), 0)).filter(
            Pago.fecha_pago == fecha
        ).scalar() or 0.0
        
        # Cantidad de operaciones
        num_prestamos = db.query(func.count(Prestamo.id)).filter(
            func.date(Prestamo.created_at) == fecha
        ).scalar() or 0
        
        num_pagos = db.query(func.count(Pago.id)).filter(
            Pago.fecha_pago == fecha
        ).scalar() or 0
        
        evolucion.append({
            'fecha': fecha.isoformat(),
            'prestado': round(prestado, 2),
            'cobrado': round(cobrado, 2),
            'num_prestamos': num_prestamos,
            'num_pagos': num_pagos
        })
    
    return {
        'periodo_dias': periodo_dias,
        'start_date': start.isoformat(),
        'end_date': today.isoformat(),
        'evolucion': evolucion
    }
