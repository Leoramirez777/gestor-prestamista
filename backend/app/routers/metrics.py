from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.metrics_service import get_summary_metrics
from app.schemas.schemas import SummaryMetrics

router = APIRouter()

@router.get("/summary", response_model=SummaryMetrics)
def metrics_summary(db: Session = Depends(get_db)):
    """Obtener métricas financieras resumidas del sistema."""
    data = get_summary_metrics(db)
    return data
