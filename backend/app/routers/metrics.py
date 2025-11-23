from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from calendar import monthrange
from app.database.database import get_db
from app.metrics_service import (
    get_summary_metrics,
    get_due_today,
    get_due_next,
    get_kpis,
    get_daily_simple,
    get_period_metrics,
    get_expectativas,
    get_segment_metrics
)
from app.schemas.schemas import SummaryMetrics, KPIMetrics, DailySimpleMetrics, SegmentResponse

router = APIRouter()

@router.get("/summary", response_model=SummaryMetrics)
def metrics_summary(db: Session = Depends(get_db)):
    """Obtener métricas financieras resumidas del sistema."""
    data = get_summary_metrics(db)
    return data


@router.get("/due-today")
def metrics_due_today(db: Session = Depends(get_db)):
    """Monto esperado y cantidad de cuotas con fecha de hoy."""
    return get_due_today(db)


@router.get("/due-next")
def metrics_due_next(days: int = 7, db: Session = Depends(get_db)):
    """Monto y cantidad de cuotas que vencen en los próximos N días (excluye hoy)."""
    return get_due_next(db, days)


@router.get("/kpis", response_model=KPIMetrics)
def metrics_kpis(db: Session = Depends(get_db)):
    """KPIs consolidados para la franja superior del dashboard."""
    return get_kpis(db)


@router.get("/daily-simple", response_model=DailySimpleMetrics)
def metrics_daily_simple(days: int = 1, db: Session = Depends(get_db)):
    """Resumen simplificado del período (1, 7 o 30 días) para caja principal."""
    return get_daily_simple(db, days)


@router.get("/period/date")
def metrics_period_date(date: str = Query(...), db: Session = Depends(get_db)):
    """Métricas de un día específico."""
    try:
        target_date = datetime.strptime(date, '%Y-%m-%d').date()
        result = get_period_metrics(db, 'date', target_date)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise


@router.get("/period/week")
def metrics_period_week(start_date: str = Query(...), end_date: str = Query(...), db: Session = Depends(get_db)):
    """Métricas de una semana específica."""
    start = datetime.strptime(start_date, '%Y-%m-%d').date()
    end = datetime.strptime(end_date, '%Y-%m-%d').date()
    return get_period_metrics(db, 'week', start, end)


@router.get("/period/month")
def metrics_period_month(month: str = Query(...), db: Session = Depends(get_db)):
    """Métricas de un mes específico (formato YYYY-MM)."""
    year, month_num = map(int, month.split('-'))
    start = date(year, month_num, 1)
    # Último día del mes usando monthrange
    _, last_day = monthrange(year, month_num)
    end = date(year, month_num, last_day)
    return get_period_metrics(db, 'month', start, end)


@router.get("/expectativas/date")
def expectativas_date(date: str = Query(...), db: Session = Depends(get_db)):
    """Expectativas de cobro para un día específico."""
    target_date = datetime.strptime(date, '%Y-%m-%d').date()
    return get_expectativas(db, target_date)


@router.get("/expectativas/week")
def expectativas_week(start_date: str = Query(...), end_date: str = Query(...), db: Session = Depends(get_db)):
    """Expectativas de cobro para una semana específica."""
    start = datetime.strptime(start_date, '%Y-%m-%d').date()
    end = datetime.strptime(end_date, '%Y-%m-%d').date()
    return get_expectativas(db, start, end)


@router.get("/expectativas/month")
def expectativas_month(month: str = Query(...), db: Session = Depends(get_db)):
    """Expectativas de cobro para un mes específico (formato YYYY-MM)."""
    year, month_num = map(int, month.split('-'))
    start = date(year, month_num, 1)
    # Último día del mes usando monthrange
    _, last_day = monthrange(year, month_num)
    end = date(year, month_num, last_day)
    return get_expectativas(db, start, end)


@router.get("/segment", response_model=SegmentResponse)
def metrics_segment(
    dimension: str = Query(..., description="Dimensión: frecuencia_pago | estado | tamano | antiguedad | morosidad"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: Session = Depends(get_db)
):
    sd = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else None
    ed = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else None
    return get_segment_metrics(db, dimension, sd, ed)


@router.get("/top-clientes")
def metrics_top_clientes(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    """Obtiene los top clientes por diferentes métricas."""
    from app.metrics_service import get_top_clientes
    return get_top_clientes(db, limit)


@router.get("/rentabilidad")
def metrics_rentabilidad(db: Session = Depends(get_db)):
    """Calcula métricas de rentabilidad del negocio."""
    from app.metrics_service import get_rentabilidad
    return get_rentabilidad(db)


@router.get("/evolucion")
def metrics_evolucion(periodo_dias: int = Query(30, ge=7, le=365), db: Session = Depends(get_db)):
    """Obtiene la evolución de métricas clave en los últimos N días."""
    from app.metrics_service import get_evolucion_temporal
    return get_evolucion_temporal(db, periodo_dias)
