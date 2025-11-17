from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.metrics_service import get_summary_metrics, get_due_today, get_due_next
from app.schemas.schemas import SummaryMetrics

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
