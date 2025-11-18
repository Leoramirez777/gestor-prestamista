from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import MovimientoCaja, Prestamo, Pago, CajaCierre


def backfill_caja_movimientos(db: Session):
    """Si la tabla de movimientos está vacía, crear movimientos históricos
    a partir de préstamos (egresos) y pagos (ingresos)."""
    existe = db.query(func.count(MovimientoCaja.id)).scalar() or 0
    if existe > 0:
        return 0

    creados = 0
    # Egresos por desembolso de préstamos (monto principal)
    prestamos = db.query(Prestamo).all()
    for p in prestamos:
        movimiento = MovimientoCaja(
            fecha=p.fecha_inicio,
            tipo="egreso",
            categoria="desembolso_prestamo",
            descripcion=f"Desembolso préstamo #{p.id} cliente {p.cliente_id}",
            monto=p.monto,
            referencia_tipo="prestamo",
            referencia_id=p.id
        )
        db.add(movimiento)
        creados += 1

    # Ingresos por pagos
    pagos = db.query(Pago).all()
    for pg in pagos:
        movimiento = MovimientoCaja(
            fecha=pg.fecha_pago,
            tipo="ingreso",
            categoria="pago_cuota",
            descripcion=f"Pago #{pg.id} préstamo {pg.prestamo_id}",
            monto=pg.monto,
            referencia_tipo="pago",
            referencia_id=pg.id
        )
        db.add(movimiento)
        creados += 1

    db.commit()
    return creados


def get_saldo_anterior(db: Session, fecha: date) -> float:
    """Obtiene el saldo_final del cierre del día anterior, o 0.0 si no existe."""
    dia_anterior = fecha - timedelta(days=1)
    cierre_anterior = db.query(CajaCierre).filter(CajaCierre.fecha == dia_anterior).first()
    if cierre_anterior and cierre_anterior.saldo_final is not None:
        return cierre_anterior.saldo_final
    return 0.0


def get_or_create_cierre(db: Session, fecha: date) -> CajaCierre:
    """Obtiene o crea el cierre del día. Calcula saldo_inicial desde día anterior."""
    cierre = db.query(CajaCierre).filter(CajaCierre.fecha == fecha).first()
    if not cierre:
        saldo_inicial = get_saldo_anterior(db, fecha)
        cierre = CajaCierre(
            fecha=fecha,
            saldo_inicial=saldo_inicial,
            ingresos=0.0,
            egresos=0.0,
            saldo_esperado=saldo_inicial,
            cerrado=False
        )
        db.add(cierre)
        db.commit()
        db.refresh(cierre)
    return cierre


def actualizar_totales_cierre(db: Session, fecha: date):
    """Recalcula ingresos, egresos y saldo_esperado del cierre basándose en movimientos."""
    cierre = get_or_create_cierre(db, fecha)
    
    movimientos = listar_movimientos_por_fecha(db, fecha)
    ingresos = sum(m.monto for m in movimientos if m.tipo == "ingreso")
    egresos = sum(m.monto for m in movimientos if m.tipo == "egreso")
    
    cierre.ingresos = ingresos
    cierre.egresos = egresos
    cierre.saldo_esperado = cierre.saldo_inicial + ingresos - egresos
    
    db.commit()
    db.refresh(cierre)
    return cierre


def cerrar_dia(db: Session, fecha: date, saldo_final: float, usuario_id: int = None):
    """Realiza el cierre formal del día. Valida y bloquea el día."""
    cierre = get_or_create_cierre(db, fecha)
    
    if cierre.cerrado:
        raise ValueError(f"El día {fecha} ya está cerrado.")
    
    # Actualizar totales antes de cerrar
    actualizar_totales_cierre(db, fecha)
    
    cierre.saldo_final = saldo_final
    cierre.diferencia = saldo_final - cierre.saldo_esperado
    cierre.cerrado = True
    cierre.usuario_id = usuario_id
    cierre.closed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(cierre)
    return cierre


def crear_movimiento(db: Session, data) -> MovimientoCaja:
    movimiento = MovimientoCaja(
        fecha=data.fecha,
        tipo=data.tipo,
        categoria=data.categoria,
        descripcion=data.descripcion,
        monto=data.monto,
        referencia_tipo=data.referencia_tipo,
        referencia_id=data.referencia_id
    )
    db.add(movimiento)
    db.commit()
    db.refresh(movimiento)
    return movimiento


def listar_movimientos_por_fecha(db: Session, fecha: date):
    return db.query(MovimientoCaja).filter(MovimientoCaja.fecha == fecha).order_by(MovimientoCaja.id.asc()).all()


def get_cierre_caja(db: Session, fecha: date):
    """Obtiene el cierre del día con saldo_inicial, ingresos, egresos, saldo_esperado, saldo_final, cerrado."""
    cierre = get_or_create_cierre(db, fecha)
    actualizar_totales_cierre(db, fecha)
    
    movimientos = listar_movimientos_por_fecha(db, fecha)
    detalle_ingresos = {}
    detalle_egresos = {}

    for m in movimientos:
        if m.tipo == "ingreso":
            detalle_ingresos.setdefault(m.categoria or "otros", 0.0)
            detalle_ingresos[m.categoria or "otros"] += m.monto
        else:
            detalle_egresos.setdefault(m.categoria or "otros", 0.0)
            detalle_egresos[m.categoria or "otros"] += m.monto

    return {
        "fecha": fecha.isoformat(),
        "saldo_inicial": round(cierre.saldo_inicial, 2),
        "ingresos": round(cierre.ingresos, 2),
        "egresos": round(cierre.egresos, 2),
        "saldo_esperado": round(cierre.saldo_esperado, 2),
        "saldo_final": round(cierre.saldo_final, 2) if cierre.saldo_final is not None else None,
        "diferencia": round(cierre.diferencia, 2) if cierre.diferencia is not None else None,
        "cerrado": cierre.cerrado,
        "detalle_ingresos": {k: round(v, 2) for k, v in detalle_ingresos.items()},
        "detalle_egresos": {k: round(v, 2) for k, v in detalle_egresos.items()},
    }
