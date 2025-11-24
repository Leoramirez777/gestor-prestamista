from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.database.database import get_db
from app.schemas.schemas import (
    MovimientoCajaCreate, MovimientoCaja, CierreCaja, CerrarDiaRequest, CajaCierreResponse, AbrirDiaRequest,
    CajaEmpleadoMovimientoCreate, CajaEmpleadoMovimiento, CajaEmpleadoResumen, CajaEmpleadoCerrarRequest, CajaEmpleadoAbrirRequest
)
from app.caja_service import (
    crear_movimiento, listar_movimientos_por_fecha, get_cierre_caja, cerrar_dia, actualizar_totales_cierre, get_or_create_cierre, abrir_dia,
    crear_movimiento_empleado, calcular_resumen_empleado, cerrar_dia_empleado, abrir_dia_empleado,
    listar_movimientos_empleado_por_fecha
)
from app.routers.auth import get_current_user
from app.models.models import Usuario

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


# ===== CAJA EMPLEADO =====
@router.get("/empleado/resumen", response_model=CajaEmpleadoResumen)
def caja_empleado_resumen(fecha: str = Query(...), db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    f = datetime.strptime(fecha, "%Y-%m-%d").date()
    if not current_user.empleado_id:
        raise HTTPException(status_code=400, detail="Usuario no está asociado a un empleado")
    cierre = calcular_resumen_empleado(db, f, current_user.empleado_id)
    return {
        "fecha": f,
        "empleado_id": current_user.empleado_id,
        "ingresos_cobrados": round(cierre.ingresos_cobrados, 2),
        "comision_ganada": round(cierre.comision_ganada, 2),
        "ingresos_otros": round(cierre.ingresos_otros, 2),
        "egresos": round(cierre.egresos, 2),
        "depositos": round(cierre.depositos, 2),
        "saldo_esperado_entregar": round(cierre.saldo_esperado_entregar, 2),
        "entregado": cierre.entregado,
        "diferencia": cierre.diferencia,
        "cerrado": cierre.cerrado
    }


@router.post("/empleado/movimientos", response_model=CajaEmpleadoMovimiento)
def caja_empleado_movimiento(data: CajaEmpleadoMovimientoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if not current_user.empleado_id:
        raise HTTPException(status_code=400, detail="Usuario no está asociado a un empleado")
    mov = crear_movimiento_empleado(db, data.fecha, current_user.empleado_id, data.tipo, data.monto, data.categoria, data.descripcion)
    return mov

@router.get("/empleado/movimientos", response_model=list[CajaEmpleadoMovimiento])
def caja_empleado_listar_movimientos(fecha: str = Query(...), db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    f = datetime.strptime(fecha, "%Y-%m-%d").date()
    if not current_user.empleado_id:
        raise HTTPException(status_code=400, detail="Usuario no está asociado a un empleado")
    return listar_movimientos_empleado_por_fecha(db, f, current_user.empleado_id)


@router.post("/empleado/cerrar-dia", response_model=CajaEmpleadoResumen)
def caja_empleado_cerrar(request: CajaEmpleadoCerrarRequest, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if not current_user.empleado_id:
        raise HTTPException(status_code=400, detail="Usuario no está asociado a un empleado")
    cierre = cerrar_dia_empleado(db, request.fecha, current_user.empleado_id, request.entregado)
    return {
        "fecha": cierre.fecha,
        "empleado_id": current_user.empleado_id,
        "ingresos_cobrados": round(cierre.ingresos_cobrados, 2),
        "comision_ganada": round(cierre.comision_ganada, 2),
        "ingresos_otros": round(cierre.ingresos_otros, 2),
        "egresos": round(cierre.egresos, 2),
        "depositos": round(cierre.depositos, 2),
        "saldo_esperado_entregar": round(cierre.saldo_esperado_entregar, 2),
        "entregado": cierre.entregado,
        "diferencia": cierre.diferencia,
        "cerrado": cierre.cerrado
    }


@router.post("/empleado/abrir-dia", response_model=CajaEmpleadoResumen)
def caja_empleado_abrir(request: CajaEmpleadoAbrirRequest, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if not current_user.empleado_id:
        raise HTTPException(status_code=400, detail="Usuario no está asociado a un empleado")
    cierre = abrir_dia_empleado(db, request.fecha, current_user.empleado_id)
    cierre = calcular_resumen_empleado(db, request.fecha, current_user.empleado_id)
    return {
        "fecha": cierre.fecha,
        "empleado_id": current_user.empleado_id,
        "ingresos_cobrados": round(cierre.ingresos_cobrados, 2),
        "comision_ganada": round(cierre.comision_ganada, 2),
        "ingresos_otros": round(cierre.ingresos_otros, 2),
        "egresos": round(cierre.egresos, 2),
        "depositos": round(cierre.depositos, 2),
        "saldo_esperado_entregar": round(cierre.saldo_esperado_entregar, 2),
        "entregado": cierre.entregado,
        "diferencia": cierre.diferencia,
        "cerrado": cierre.cerrado
    }
