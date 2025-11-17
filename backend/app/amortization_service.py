"""
Servicio para generar tablas de amortización de préstamos.
"""
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.models import Prestamo


def add_days(start: date, days: int) -> date:
    """Suma días a una fecha."""
    return start + timedelta(days=days)


def add_months(start: date, months: int) -> date:
    """Suma meses a una fecha."""
    return start + relativedelta(months=months)


def generar_amortizacion(prestamo: Prestamo, db: Session) -> List[Dict]:
    """
    Genera la tabla de amortización para un préstamo.
    
    Args:
        prestamo: instancia del modelo Prestamo
        db: sesión de base de datos
    
    Returns:
        Lista de diccionarios con: numero, fecha, monto, estado
    """
    if not prestamo:
        return []
    
    hoy = date.today()
    
    # Número de cuotas según frecuencia
    numero_cuotas = prestamo.cuotas_totales if prestamo.cuotas_totales else 0
    if not numero_cuotas or numero_cuotas <= 0:
        frecuencia = prestamo.frecuencia_pago or 'semanal'
        if frecuencia == 'semanal':
            numero_cuotas = (prestamo.plazo_dias + 6) // 7
        elif frecuencia == 'mensual':
            numero_cuotas = (prestamo.plazo_dias + 29) // 30
        else:
            numero_cuotas = prestamo.plazo_dias  # diario
    
    # Valor de cada cuota
    valor_cuota = prestamo.valor_cuota if prestamo.valor_cuota else 0
    if not valor_cuota or valor_cuota <= 0:
        valor_cuota = prestamo.monto_total / numero_cuotas if numero_cuotas > 0 else 0
    
    # Cuotas pagadas
    cuotas_pagadas = prestamo.cuotas_pagadas if prestamo.cuotas_pagadas else 0
    
    resultado = []
    inicio = prestamo.fecha_inicio
    frecuencia = prestamo.frecuencia_pago or 'semanal'
    
    for i in range(1, int(numero_cuotas) + 1):
        # La primera cuota es una semana/mes después del inicio
        if frecuencia == 'semanal':
            fecha_esperada = add_days(inicio, i * 7)
        elif frecuencia == 'mensual':
            fecha_esperada = add_months(inicio, i)
        else:
            # Diario: la primera cuota es al día siguiente
            fecha_esperada = add_days(inicio, i)
        
        # Determinar estado
        estado_prestamo = (prestamo.estado or '').lower()
        if estado_prestamo == 'pagado':
            estado = 'Pagado'
        elif i <= cuotas_pagadas:
            estado = 'Pagado'
        elif fecha_esperada < hoy:
            estado = 'Vencido'
        else:
            estado = 'Pendiente'
        
        resultado.append({
            'numero': i,
            'fecha': fecha_esperada.isoformat(),
            'monto': round(float(valor_cuota), 2),
            'estado': estado
        })
    
    return resultado
