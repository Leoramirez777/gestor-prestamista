from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.database.database import get_db
from app.schemas.schemas import MovimientoCajaCreate, MovimientoCaja, CierreCaja, CerrarDiaRequest, CajaCierreResponse, AbrirDiaRequest
from app.caja_service import crear_movimiento, listar_movimientos_por_fecha, get_cierre_caja, cerrar_dia, actualizar_totales_cierre, get_or_create_cierre, abrir_dia

router = APIRouter(prefix="/api/caja", tags=["Caja"])

@router.get("/movimientos", response_model=list[MovimientoCaja])
def listar_movimientos(fecha: str = Query(..., description="Fecha YYYY-MM-DD"), db: Session = Depends(get_db)):
    f = datetime.strptime(fecha, "%Y-%m-%d").date()
    return listar_movimientos_por_fecha(db, f)

@router.post("/movimientos", response_model=MovimientoCaja)
def crear_movimiento_endpoint(data: MovimientoCajaCreate, db: Session = Depends(get_db)):
    # Bloquear si el día está cerrado
    cierre = get_or_create_cierre(db, data.fecha)
    if cierre.cerrado:
        raise HTTPException(status_code=400, detail="El día está cerrado. Debes abrir la caja para registrar movimientos.")
    mov = crear_movimiento(db, data)
    # Recalcular totales del cierre para ese día
    actualizar_totales_cierre(db, data.fecha)
    return mov

@router.get("/cierre", response_model=CierreCaja)
def cierre_caja(fecha: str = Query(date.today().isoformat(), description="Fecha YYYY-MM-DD"), db: Session = Depends(get_db)):
    f = datetime.strptime(fecha, "%Y-%m-%d").date()
    return get_cierre_caja(db, f)

@router.post("/cerrar-dia", response_model=CajaCierreResponse)
def cerrar_dia_endpoint(request: CerrarDiaRequest, db: Session = Depends(get_db)):
    """Cierra formalmente el día con el saldo final confirmado."""
    try:
        cierre = cerrar_dia(db, request.fecha, request.saldo_final, usuario_id=None)  # TODO: obtener usuario_id del token
        return cierre
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/abrir-dia", response_model=CajaCierreResponse)
def abrir_dia_endpoint(request: AbrirDiaRequest, db: Session = Depends(get_db)):
    """Reabre la caja del día para permitir registrar movimientos nuevamente."""
    cierre = abrir_dia(db, request.fecha)
    return cierre
