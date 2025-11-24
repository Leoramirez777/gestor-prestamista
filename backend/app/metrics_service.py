from datetime import date, datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Cliente, Prestamo, Pago, PagoVendedor, PagoCobrador, PrestamoVendedor
from app.amortization_service import generar_amortizacion


def get_summary_metrics(db: Session, empleado_id: Optional[int] = None) -> dict:
    today = date.today()

    # Si hay empleado_id, filtrar por vendedor usando PrestamoVendedor
    prestamos_query = db.query(Prestamo)
    pagos_query = db.query(Pago)
    
    if empleado_id:
        # Obtener IDs de préstamos del vendedor
        prestamos_ids = db.query(PrestamoVendedor.prestamo_id).filter(
            PrestamoVendedor.empleado_id == empleado_id
        ).distinct().all()
        prestamo_ids_list = [p[0] for p in prestamos_ids]
        
        if prestamo_ids_list:
            prestamos_query = prestamos_query.filter(Prestamo.id.in_(prestamo_ids_list))
            pagos_query = pagos_query.filter(Pago.prestamo_id.in_(prestamo_ids_list))
            
            # Clientes únicos de esos préstamos
            cliente_ids = db.query(Prestamo.cliente_id).filter(Prestamo.id.in_(prestamo_ids_list)).distinct().all()
            total_clientes = len(cliente_ids)
        else:
            total_clientes = 0
    else:
        total_clientes = db.query(func.count(Cliente.id)).scalar() or 0

    total_prestamos = prestamos_query.count() or 0
    total_pagos = pagos_query.count() or 0

    monto_total_recaudado = pagos_query.with_entities(func.coalesce(func.sum(Pago.monto), 0)).scalar() or 0.0
    saldo_pendiente_total = prestamos_query.with_entities(func.coalesce(func.sum(Prestamo.saldo_pendiente), 0)).scalar() or 0.0

    # Calcular prestado, esperado e intereses iterando préstamos filtrados
    todos_prestamos = prestamos_query.all()
    monto_total_prestado = 0.0
    monto_total_esperado = 0.0
    intereses_generados = 0.0
    
    for p in todos_prestamos:
        capital = float(p.monto)
        tasa = float(p.tasa_interes)
        interes = capital * (tasa / 100.0)
        total = capital + interes
        
        monto_total_prestado += capital
        monto_total_esperado += total
        intereses_generados += interes

    prestamos_activos_query = prestamos_query.filter(Prestamo.saldo_pendiente > 0, Prestamo.estado == 'activo')
    prestamos_activos = prestamos_activos_query.count() or 0
    
    prestamos_vencidos_query = prestamos_query.filter(
        Prestamo.saldo_pendiente > 0,
        Prestamo.fecha_vencimiento < today
    )
    prestamos_vencidos = prestamos_vencidos_query.count() or 0

    pagos_hoy_query = pagos_query.filter(Pago.fecha_pago == today)
    pagos_hoy = pagos_hoy_query.count() or 0

    average_loan_size = (monto_total_prestado / total_prestamos) if total_prestamos > 0 else 0.0
    ticket_promedio_pago = (monto_total_recaudado / total_pagos) if total_pagos > 0 else 0.0

    # Clientes activos: count distinct de cliente_id donde saldo > 0
    if empleado_id:
        if prestamo_ids_list:
            clientes_activos = db.query(func.count(func.distinct(Prestamo.cliente_id))).filter(
                Prestamo.saldo_pendiente > 0,
                Prestamo.id.in_(prestamo_ids_list)
            ).scalar() or 0
        else:
            clientes_activos = 0
    else:
        clientes_activos = db.query(func.count(func.distinct(Prestamo.cliente_id))).filter(
            Prestamo.saldo_pendiente > 0
        ).scalar() or 0
    
    # Calcular tasa de activación (clientes con préstamos activos / total clientes)
    activation_rate = (clientes_activos / total_clientes) if total_clientes > 0 else 0.0
    
    # Calcular comisiones (totales históricas globales)
    total_comisiones_vendedor = db.query(func.coalesce(func.sum(PagoVendedor.monto_comision), 0)).scalar() or 0.0
    total_comisiones_cobrador = db.query(func.coalesce(func.sum(PagoCobrador.monto_comision), 0)).scalar() or 0.0
    total_comisiones = total_comisiones_vendedor + total_comisiones_cobrador

    # Si se filtra por empleado, calcular sus ganancias históricas (todas las comisiones)
    mis_ganancias = None
    if empleado_id:
        mis_vendedor = db.query(func.coalesce(func.sum(PagoVendedor.monto_comision), 0)).filter(
            PagoVendedor.empleado_id == empleado_id
        ).scalar() or 0.0
        mis_cobrador = db.query(func.coalesce(func.sum(PagoCobrador.monto_comision), 0)).filter(
            PagoCobrador.empleado_id == empleado_id
        ).scalar() or 0.0
        mis_ganancias = round(mis_vendedor + mis_cobrador, 2)
    
    # Ganancias netas sin intereses: recaudado - comisiones pagadas.
    ganancias_netas = monto_total_recaudado - total_comisiones
    tasa_cobro = min(monto_total_recaudado / monto_total_esperado, 1.0) if monto_total_esperado > 0 else 0.0

    result = {
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
        'average_loan_size': round(average_loan_size, 2),
        'ticket_promedio_pago': round(ticket_promedio_pago, 2),
        'clientes_activos': clientes_activos,
        'activation_rate': round(activation_rate, 4),
        'comisiones': {
            'vendedor': round(total_comisiones_vendedor, 2),
            'cobrador': round(total_comisiones_cobrador, 2),
            'total': round(total_comisiones, 2)
        },
        'ganancias_netas': round(ganancias_netas, 2),  # Recaudado - comisiones
        'total_comisiones_pagadas': round(total_comisiones, 2),
        'intereses_generados': round(intereses_generados, 2),
        'tasa_cobro': round(tasa_cobro, 4)
    }

    if mis_ganancias is not None:
        result['mis_ganancias'] = mis_ganancias

    return result


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
        'average_loan_size': summary['average_loan_size'],
        'ticket_promedio_pago': summary['ticket_promedio_pago'],
        'clientes_activos': clientes_activos,
        'activation_rate': round(activation_rate, 4),
        'tasa_cobro': summary.get('tasa_cobro', 0.0)
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
        'por_cobrar_hoy': round(por_cobrar_hoy, 2),
        'cobrado_hoy': round(cobrado_hoy, 2)
    }


def get_period_metrics(db: Session, period_type: str, start_date: date, end_date: Optional[date] = None, empleado_id: Optional[int] = None) -> dict:
    """Obtiene métricas de un período específico (día, semana o mes).
    IMPORTANTE: Intereses Generados es el interés pactado de los préstamos CREADOS en el período.
    Fórmula: Para cada préstamo del período, Interés = monto * (tasa_interes / 100)
    """
    if end_date is None:
        end_date = start_date

    # Préstamos creados en el período (usar fecha_inicio, no created_at)
    prestamos_query = db.query(Prestamo).filter(
        Prestamo.fecha_inicio >= start_date,
        Prestamo.fecha_inicio <= end_date
    )
    
    # Filtrar por empleado si no es admin
    if empleado_id:
        prestamos_ids = db.query(PrestamoVendedor.prestamo_id).filter(
            PrestamoVendedor.empleado_id == empleado_id
        ).distinct().all()
        prestamo_ids_list = [p[0] for p in prestamos_ids]
        if prestamo_ids_list:
            prestamos_query = prestamos_query.filter(Prestamo.id.in_(prestamo_ids_list))
        else:
            prestamos_query = prestamos_query.filter(Prestamo.id == -1)  # No results
    
    prestamos_periodo = prestamos_query.all()
    
    # Calcular capital, total e intereses
    prestado = 0.0
    prestado_con_intereses = 0.0
    intereses_generados = 0.0
    
    for p in prestamos_periodo:
        capital = float(p.monto)
        tasa = float(p.tasa_interes)
        
        # Calcular interés: capital * (tasa / 100)
        interes_prestamo = capital * (tasa / 100.0)
        total_prestamo = capital + interes_prestamo
        
        prestado += capital
        prestado_con_intereses += total_prestamo
        intereses_generados += interes_prestamo

    # Pagos (cobrado) en el período
    pagos_query = db.query(func.coalesce(func.sum(Pago.monto), 0)).filter(
        Pago.fecha_pago >= start_date,
        Pago.fecha_pago <= end_date
    )
    if empleado_id and prestamo_ids_list:
        pagos_query = pagos_query.filter(Pago.prestamo_id.in_(prestamo_ids_list))
    cobrado = pagos_query.scalar() or 0.0

    # Por cobrar (cuotas programadas pendientes en el rango)
    prestamos_activos_query = db.query(Prestamo).filter(Prestamo.saldo_pendiente > 0)
    if empleado_id and prestamo_ids_list:
        prestamos_activos_query = prestamos_activos_query.filter(Prestamo.id.in_(prestamo_ids_list))
    prestamos_activos = prestamos_activos_query.all()
    por_cobrar = 0.0
    try:
        for prestamo in prestamos_activos:
            try:
                for cuota in generar_amortizacion(prestamo, db):
                    from datetime import datetime as dt
                    fecha_cuota = dt.fromisoformat(cuota['fecha']).date()
                    if start_date <= fecha_cuota <= end_date and cuota['estado'] != 'Pagado':
                        por_cobrar += cuota['monto']
            except Exception as e:
                print(f"Error procesando amortización para préstamo {prestamo.id}: {e}")
                continue
    except Exception as e:
        print(f"Error en cálculo de por_cobrar: {e}")
        por_cobrar = 0.0

    # Comisiones pagadas en el período (filtradas por empleado si corresponde)
    comisiones_vendedor_query = db.query(func.coalesce(func.sum(PagoVendedor.monto_comision), 0)).join(
        Pago, PagoVendedor.pago_id == Pago.id
    ).filter(Pago.fecha_pago >= start_date, Pago.fecha_pago <= end_date)
    comisiones_cobrador_query = db.query(func.coalesce(func.sum(PagoCobrador.monto_comision), 0)).join(
        Pago, PagoCobrador.pago_id == Pago.id
    ).filter(Pago.fecha_pago >= start_date, Pago.fecha_pago <= end_date)
    if empleado_id:
        comisiones_vendedor_query = comisiones_vendedor_query.filter(PagoVendedor.empleado_id == empleado_id)
        comisiones_cobrador_query = comisiones_cobrador_query.filter(PagoCobrador.empleado_id == empleado_id)
    comisiones_pagadas_vendedor = comisiones_vendedor_query.scalar() or 0.0
    comisiones_pagadas_cobrador = comisiones_cobrador_query.scalar() or 0.0
    comisiones_pagadas = comisiones_pagadas_vendedor + comisiones_pagadas_cobrador
    
    # Tasa de cobro: cobrado vs monto total esperado del período
    tasa_cobro_periodo = min(cobrado / prestado_con_intereses, 1.0) if prestado_con_intereses > 0 else 0.0
    
    # Cálculo de ganancias del período
    # Si es vista de EMPLEADO: las "ganancias" son simplemente sus comisiones cobradas en el período (vendedor + cobrador).
    # Si es vista ADMIN: ganancias = parte de intereses recuperados en los pagos del período - comisiones pagadas (no debe ser negativa).
    if empleado_id:
        intereses_cobrados_periodo = 0.0  # No relevante para empleado en este contexto
        ganancias_netas = comisiones_pagadas  # Sus comisiones siempre son positivas
    else:
        # Aproximación: intereses recuperados en el período = max(0, cobrado - prestado)
        intereses_cobrados_periodo = max(0.0, cobrado - prestado)
        ganancias_netas = max(intereses_cobrados_periodo - comisiones_pagadas, 0.0)

    return {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'prestado': round(prestado, 2),
        'prestado_con_intereses': round(prestado_con_intereses, 2),
        'por_cobrar': round(por_cobrar, 2),
        'cobrado': round(cobrado, 2),
        'comisiones_pagadas': round(comisiones_pagadas, 2),  # total (filtrado si empleado)
        'comisiones_vendedor_periodo': round(comisiones_pagadas_vendedor, 2),
        'comisiones_cobrador_periodo': round(comisiones_pagadas_cobrador, 2),
        'intereses_cobrados_periodo': round(intereses_cobrados_periodo, 2),
        'intereses_generados': round(intereses_generados, 2),
        'tasa_cobro': round(tasa_cobro_periodo, 4),
        'ganancias_netas': round(ganancias_netas, 2)
    }


def get_expectativas(db: Session, start_date: date, end_date: Optional[date] = None, empleado_id: Optional[int] = None) -> dict:
    """Obtiene las expectativas de cobro para un período específico."""
    if end_date is None:
        end_date = start_date

    prestamos_activos_query = db.query(Prestamo).filter(Prestamo.saldo_pendiente > 0)
    
    # Filtrar por empleado si no es admin
    if empleado_id:
        prestamos_ids = db.query(PrestamoVendedor.prestamo_id).filter(
            PrestamoVendedor.empleado_id == empleado_id
        ).distinct().all()
        prestamo_ids_list = [p[0] for p in prestamos_ids]
        if prestamo_ids_list:
            prestamos_activos_query = prestamos_activos_query.filter(Prestamo.id.in_(prestamo_ids_list))
        else:
            prestamos_activos_query = prestamos_activos_query.filter(Prestamo.id == -1)  # No results
    
    prestamos_activos = prestamos_activos_query.all()
    monto_esperado = 0.0
    cantidad_cuotas = 0
    ganancias_esperadas = 0.0

    try:
        for prestamo in prestamos_activos:
            try:
                amortizacion = generar_amortizacion(prestamo, db)
                # Si se solicita por empleado (vendedor), calcular su comisión esperada distribuida por cuota
                per_cuota_comision = 0.0
                if empleado_id:
                    try:
                        reg = db.query(PrestamoVendedor).filter(
                            PrestamoVendedor.prestamo_id == prestamo.id,
                            PrestamoVendedor.empleado_id == empleado_id
                        ).first()
                        if reg and (reg.monto_comision or 0) > 0:
                            total_cuotas = prestamo.cuotas_totales or len(amortizacion) or 0
                            if total_cuotas > 0:
                                per_cuota_comision = float(reg.monto_comision) / float(total_cuotas)
                    except Exception as e:
                        print(f"Error obteniendo comisión vendedor para préstamo {prestamo.id}: {e}")
                for cuota in amortizacion:
                    from datetime import datetime as dt
                    fecha_cuota = dt.fromisoformat(cuota['fecha']).date()
                    if start_date <= fecha_cuota <= end_date:
                        if cuota['estado'] != 'Pagado':  # Solo cuotas pendientes o vencidas
                            monto_esperado += cuota['monto']
                            cantidad_cuotas += 1
                            if per_cuota_comision > 0:
                                ganancias_esperadas += per_cuota_comision
            except Exception as e:
                print(f"Error procesando expectativas para préstamo {prestamo.id}: {e}")
                continue
    except Exception as e:
        print(f"Error en get_expectativas: {e}")
        monto_esperado = 0.0
        cantidad_cuotas = 0
        ganancias_esperadas = 0.0

    result = {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'monto_esperado': round(monto_esperado, 2),
        'cantidad_cuotas': cantidad_cuotas
    }
    # Solo tiene sentido reportar ganancias_esperadas cuando filtramos por un vendedor
    if empleado_id:
        result['ganancias_esperadas'] = round(ganancias_esperadas, 2)
    return result


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
    
    # Capital en riesgo (prestado pero aún no cobrado completamente)
    prestamos_activos = db.query(Prestamo).filter(Prestamo.saldo_pendiente > 0).all()
    capital_en_riesgo = sum(float(p.monto) for p in prestamos_activos)  # type: ignore[arg-type]

    # Capital recuperado = capital invertido que ya volvió
    capital_recuperado = capital_invertido - capital_en_riesgo

    # Intereses cobrados = lo recaudado menos el capital recuperado
    intereses_cobrados = max(total_recaudado - capital_recuperado, 0.0)

    # Ganancias brutas = intereses cobrados (antes de comisiones)
    ganancias_brutas = intereses_cobrados

    # Ganancias netas = intereses cobrados - comisiones
    ganancias_netas = intereses_cobrados - total_comisiones

    # ROI (Return on Investment) = utilidad neta / capital invertido
    roi = (ganancias_netas / capital_invertido) if capital_invertido > 0 else 0.0
    
    # Margen de ganancia
    margen = (ganancias_netas / total_recaudado) if total_recaudado > 0 else 0.0
    
    # Saldo pendiente por cobrar
    por_cobrar = db.query(func.coalesce(func.sum(Prestamo.saldo_pendiente), 0)).scalar() or 0.0
    
    # Nota: capital_en_riesgo ya calculado arriba
    
    # Calcular total esperado e intereses generados
    todos_prestamos = db.query(Prestamo).all()
    monto_total_esperado = 0.0
    intereses_generados_total = 0.0
    
    for p in todos_prestamos:
        capital = float(p.monto)
        tasa = float(p.tasa_interes)
        interes = capital * (tasa / 100.0)
        total = capital + interes
        
        monto_total_esperado += total
        intereses_generados_total += interes
    
    # Nuevas métricas
    # 1. Tasa de Recuperación: cuánto del capital ya recuperaste
    tasa_recuperacion = (total_recaudado / capital_invertido) if capital_invertido > 0 else 0.0
    
    # 2. Eficiencia de Cobro: cuánto cobraste vs lo que deberías cobrar (capital + intereses)
    eficiencia_cobro = (total_recaudado / monto_total_esperado) if monto_total_esperado > 0 else 0.0
    
    # 3. Clientes activos
    clientes_activos = db.query(func.count(func.distinct(Prestamo.cliente_id))).filter(
        Prestamo.saldo_pendiente > 0
    ).scalar() or 0
    
    # 4. Costo de Adquisición (comisiones por cliente activo)
    costo_adquisicion = (total_comisiones / clientes_activos) if clientes_activos > 0 else 0.0
    
    # 5. Valor Promedio por Préstamo
    total_prestamos = db.query(func.count(Prestamo.id)).scalar() or 0
    valor_promedio_prestamo = (capital_invertido / total_prestamos) if total_prestamos > 0 else 0.0
    
    # 6. Ratio Comisiones/Ganancias
    ratio_comisiones = (total_comisiones / ganancias_brutas) if ganancias_brutas > 0 else 0.0
    
    # 7. Capital Recuperado (parte del capital que ya volvió)
    # ya calculado arriba
    
    # 8. Intereses Pendientes (intereses que aún esperamos cobrar)
    intereses_pendientes = por_cobrar - capital_en_riesgo if por_cobrar > capital_en_riesgo else 0.0
    
    # 9. Tiempo Promedio de Recuperación (en días)
    prestamos_pagados = db.query(Prestamo).filter(Prestamo.saldo_pendiente == 0).all()
    if prestamos_pagados:
        tiempos = []
        for p in prestamos_pagados:
            if p.fecha_inicio and p.fecha_vencimiento:
                dias = (p.fecha_vencimiento - p.fecha_inicio).days
                tiempos.append(dias)
        tiempo_promedio = sum(tiempos) / len(tiempos) if tiempos else 0
    else:
        tiempo_promedio = 0
    
    # 10. Tasa de Morosidad
    total_prestamos_count = db.query(func.count(Prestamo.id)).scalar() or 0
    prestamos_vencidos = db.query(func.count(Prestamo.id)).filter(
        Prestamo.saldo_pendiente > 0,
        Prestamo.fecha_vencimiento < date.today()
    ).scalar() or 0
    tasa_morosidad = (prestamos_vencidos / total_prestamos_count) if total_prestamos_count > 0 else 0.0
    
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
        'capital_en_riesgo': round(capital_en_riesgo, 2),
        # Nuevas métricas
        'tasa_recuperacion': round(tasa_recuperacion, 4),
        'tasa_recuperacion_porcentaje': round(tasa_recuperacion * 100, 2),
        'eficiencia_cobro': round(eficiencia_cobro, 4),
        'eficiencia_cobro_porcentaje': round(eficiencia_cobro * 100, 2),
        'costo_adquisicion': round(costo_adquisicion, 2),
        'clientes_activos': clientes_activos,
        'valor_promedio_prestamo': round(valor_promedio_prestamo, 2),
        'ratio_comisiones': round(ratio_comisiones, 4),
        'ratio_comisiones_porcentaje': round(ratio_comisiones * 100, 2),
        'capital_recuperado': round(capital_recuperado, 2),
        'intereses_generados': round(intereses_generados_total, 2),
        'intereses_pendientes': round(intereses_pendientes, 2),
        'monto_total_esperado': round(monto_total_esperado, 2),
        'tiempo_promedio_recuperacion': round(tiempo_promedio, 1),
        'tasa_morosidad': round(tasa_morosidad, 4),
        'tasa_morosidad_porcentaje': round(tasa_morosidad * 100, 2),
        'prestamos_vencidos': prestamos_vencidos,
        'total_prestamos': total_prestamos_count
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
