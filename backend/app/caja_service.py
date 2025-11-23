from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import MovimientoCaja, Prestamo, Pago, CajaCierre, PagoVendedor, PagoCobrador, Cliente


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
        cliente = db.query(Cliente).filter(Cliente.id == p.cliente_id).first()
        nombre = cliente.nombre if cliente else f"Cliente {p.cliente_id}"
        movimiento = MovimientoCaja(
            fecha=p.fecha_inicio,
            tipo="egreso",
            categoria="prestamo",
            descripcion=f"Desembolso préstamo #{p.id} - {nombre}",
            monto=p.monto,
            referencia_tipo="prestamo",
            referencia_id=p.id
        )
        db.add(movimiento)
        creados += 1

    # Ingresos por pagos
    pagos = db.query(Pago).all()
    for pg in pagos:
        prestamo = db.query(Prestamo).filter(Prestamo.id == pg.prestamo_id).first()
        cliente = db.query(Cliente).filter(Cliente.id == prestamo.cliente_id).first() if prestamo else None
        nombre = cliente.nombre if cliente else (f"Cliente {prestamo.cliente_id}" if prestamo else "Cliente")
        movimiento = MovimientoCaja(
            fecha=pg.fecha_pago,
            tipo="ingreso",
            categoria="pago",
            descripcion=f"Pago #{pg.id} préstamo {pg.prestamo_id} - {nombre}",
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


def abrir_dia(db: Session, fecha: date, usuario_id: int | None = None) -> CajaCierre:
    """Reabre la caja del día: borra saldo_final/diferencia y marca como abierto."""
    cierre = get_or_create_cierre(db, fecha)
    if not cierre.cerrado:
        return cierre
    # Reabrir
    cierre.cerrado = False
    cierre.saldo_final = None
    cierre.diferencia = None
    cierre.closed_at = None
    # Recalcular totales y saldo esperado
    actualizar_totales_cierre(db, fecha)
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


def autocerrar_dias_pendientes(db: Session):
    """Cierra automáticamente todos los días anteriores a hoy que estén abiertos.
    Usa saldo_esperado como saldo_final para no introducir diferencias.
    """
    hoy = date.today()
    pendientes = db.query(CajaCierre).filter(CajaCierre.fecha < hoy, CajaCierre.cerrado == False).all()
    for c in pendientes:
        # Asegurar totales actualizados
        actualizar_totales_cierre(db, c.fecha)
        c.saldo_final = c.saldo_esperado
        c.diferencia = 0.0
        c.cerrado = True
        c.closed_at = datetime.utcnow()
    if pendientes:
        db.commit()

def normalizar_descripciones_movimientos(db: Session):
    """Actualiza descripciones antiguas que usan 'cliente X' para incluir el nombre real."""
    movimientos = db.query(MovimientoCaja).all()
    cambios = 0
    for m in movimientos:
        if m.categoria == "prestamo" and "cliente" in (m.descripcion or "") and " - " not in m.descripcion:
            # Extraer id cliente desde texto
            parts = m.descripcion.split("cliente")
            if len(parts) > 1:
                num = parts[-1].strip()
                try:
                    cid = int(num)
                    cliente = db.query(Cliente).filter(Cliente.id == cid).first()
                    if cliente:
                        m.descripcion = m.descripcion.replace(f"cliente {cid}", f"- {cliente.nombre}")
                        cambios += 1
                except ValueError:
                    pass
        if m.categoria == "pago" and "préstamo" in (m.descripcion or "") and " - " not in m.descripcion:
            # Añadir nombre del cliente del préstamo
            # Buscar número de préstamo
            try:
                # Buscar último número en la cadena
                tokens = [t for t in m.descripcion.split() if t.startswith("préstamo") or t.startswith("préstamo")]
            except Exception:
                tokens = []
            # Simpler: parse after word 'préstamo'
            if "préstamo" in m.descripcion:
                try:
                    idx = m.descripcion.index("préstamo")
                    resto = m.descripcion[idx+8:].strip()
                    pid = int(resto.split()[0].replace("#","")) if resto else None
                    if pid:
                        prestamo = db.query(Prestamo).filter(Prestamo.id == pid).first()
                        if prestamo:
                            cliente = db.query(Cliente).filter(Cliente.id == prestamo.cliente_id).first()
                            if cliente:
                                m.descripcion = m.descripcion + f" - {cliente.nombre}"
                                cambios += 1
                except Exception:
                    pass
    if cambios:
        db.commit()
    return cambios


def get_cierre_caja(db: Session, fecha: date):
    """Obtiene el cierre del día con saldo_inicial, ingresos, egresos, saldo_esperado, saldo_final, cerrado.
    Incluye cálculo de comisiones y flujo neto real."""
    # Antes de responder, autocerrar días anteriores abiertos (olvidos al pasar 00:00)
    autocerrar_dias_pendientes(db)
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

    # Calcular comisiones del día
    comisiones_vendedor = db.query(
        func.sum(PagoVendedor.monto_comision)
    ).join(Pago, PagoVendedor.pago_id == Pago.id).filter(
        Pago.fecha_pago == fecha
    ).scalar() or 0.0
    
    comisiones_cobrador = db.query(
        func.sum(PagoCobrador.monto_comision)
    ).join(Pago, PagoCobrador.pago_id == Pago.id).filter(
        Pago.fecha_pago == fecha
    ).scalar() or 0.0
    
    total_comisiones = comisiones_vendedor + comisiones_cobrador
    
    # Ingresos netos (descontando comisiones que se pagarán)
    ingresos_netos = cierre.ingresos - total_comisiones
    
    # Flujo neto del día
    flujo_neto = ingresos_netos - cierre.egresos

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
        "comisiones": {
            "vendedor": round(comisiones_vendedor, 2),
            "cobrador": round(comisiones_cobrador, 2),
            "total": round(total_comisiones, 2)
        },
        "flujo_neto": {
            "ingresos_brutos": round(cierre.ingresos, 2),
            "comisiones_a_pagar": round(total_comisiones, 2),
            "ingresos_netos": round(ingresos_netos, 2),
            "egresos": round(cierre.egresos, 2),
            "flujo_del_dia": round(flujo_neto, 2)
        }
    }
