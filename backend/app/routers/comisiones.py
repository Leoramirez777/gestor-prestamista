from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import Optional
from app.database.database import get_db
from app.models.models import PrestamoVendedor, PagoVendedor, PagoCobrador, Prestamo, Pago, Empleado

router = APIRouter()


@router.get("/vendedor/resumen")
def resumen_comisiones_vendedor(
    vendedor_id: Optional[int] = None,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Resumen de comisiones del vendedor:
    - Esperadas (de PrestamoVendedor)
    - Cobradas (de PagoVendedor)
    - Pendientes (esperadas - cobradas)
    """
    
    # Filtro base para vendedor específico
    query_esperadas = db.query(PrestamoVendedor)
    query_cobradas = db.query(PagoVendedor)
    
    if vendedor_id:
        query_esperadas = query_esperadas.filter(PrestamoVendedor.empleado_id == vendedor_id)
        query_cobradas = query_cobradas.filter(PagoVendedor.empleado_id == vendedor_id)
    
    # Calcular comisiones esperadas (totales de todos los préstamos)
    comisiones_esperadas = query_esperadas.with_entities(
        func.sum(PrestamoVendedor.monto_comision)
    ).scalar() or 0.0
    
    # Calcular comisiones cobradas
    query_cobradas_con_fecha = query_cobradas.join(Pago, PagoVendedor.pago_id == Pago.id)
    
    if fecha_desde:
        fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
        query_cobradas_con_fecha = query_cobradas_con_fecha.filter(Pago.fecha_pago >= fecha_desde_obj)
    
    if fecha_hasta:
        fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
        query_cobradas_con_fecha = query_cobradas_con_fecha.filter(Pago.fecha_pago <= fecha_hasta_obj)
    
    comisiones_cobradas = query_cobradas_con_fecha.with_entities(
        func.sum(PagoVendedor.monto_comision)
    ).scalar() or 0.0
    
    comisiones_pendientes = comisiones_esperadas - comisiones_cobradas
    porcentaje_cobrado = (comisiones_cobradas / comisiones_esperadas * 100) if comisiones_esperadas > 0 else 0
    
    return {
        "comisiones_esperadas": round(comisiones_esperadas, 2),
        "comisiones_cobradas": round(comisiones_cobradas, 2),
        "comisiones_pendientes": round(comisiones_pendientes, 2),
        "porcentaje_cobrado": round(porcentaje_cobrado, 2)
    }


@router.get("/vendedor/detalle")
def detalle_comisiones_vendedor(
    vendedor_id: int,
    db: Session = Depends(get_db)
):
    """
    Detalle por préstamo de las comisiones de un vendedor específico.
    """
    
    # Obtener información del vendedor
    vendedor = db.query(Empleado).filter(Empleado.id == vendedor_id).first()
    if not vendedor:
        return {"error": "Vendedor no encontrado"}
    
    # Obtener todos los préstamos del vendedor
    prestamos_vendedor = db.query(PrestamoVendedor).filter(
        PrestamoVendedor.empleado_id == vendedor_id
    ).all()
    
    detalle = []
    
    for pv in prestamos_vendedor:
        prestamo = db.query(Prestamo).filter(Prestamo.id == pv.prestamo_id).first()
        if not prestamo:
            continue
        
        # Calcular comisiones cobradas de este préstamo
        comisiones_cobradas_prestamo = db.query(
            func.sum(PagoVendedor.monto_comision)
        ).join(Pago, PagoVendedor.pago_id == Pago.id).filter(
            Pago.prestamo_id == prestamo.id,
            PagoVendedor.empleado_id == vendedor_id
        ).scalar() or 0.0
        
        detalle.append({
            "prestamo_id": prestamo.id,
            "cliente_id": prestamo.cliente_id,
            "monto_prestamo": prestamo.monto,
            "monto_total": prestamo.monto_total,
            "cuotas_totales": prestamo.cuotas_totales,
            "cuotas_pagadas": prestamo.cuotas_pagadas,
            "estado": prestamo.estado,
            "porcentaje_vendedor": pv.porcentaje,
            "comision_esperada": pv.monto_comision,
            "comision_cobrada": round(comisiones_cobradas_prestamo, 2),
            "comision_pendiente": round(pv.monto_comision - comisiones_cobradas_prestamo, 2)
        })
    
    return {
        "vendedor": {
            "id": vendedor.id,
            "nombre": vendedor.nombre
        },
        "prestamos": detalle,
        "totales": {
            "comision_esperada_total": sum(p["comision_esperada"] for p in detalle),
            "comision_cobrada_total": sum(p["comision_cobrada"] for p in detalle),
            "comision_pendiente_total": sum(p["comision_pendiente"] for p in detalle)
        }
    }


@router.get("/cobrador/resumen")
def resumen_comisiones_cobrador(
    cobrador_id: Optional[int] = None,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Resumen de comisiones del cobrador (solo históricas, no hay esperadas).
    """
    
    query = db.query(PagoCobrador)
    
    if cobrador_id:
        query = query.filter(PagoCobrador.empleado_id == cobrador_id)
    
    # Filtrar por fecha del pago
    query = query.join(Pago, PagoCobrador.pago_id == Pago.id)
    
    if fecha_desde:
        fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
        query = query.filter(Pago.fecha_pago >= fecha_desde_obj)
    
    if fecha_hasta:
        fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
        query = query.filter(Pago.fecha_pago <= fecha_hasta_obj)
    
    comisiones_cobradas = query.with_entities(
        func.sum(PagoCobrador.monto_comision)
    ).scalar() or 0.0
    
    cantidad_pagos = query.count()
    
    return {
        "comisiones_cobradas": round(comisiones_cobradas, 2),
        "cantidad_pagos": cantidad_pagos,
        "promedio_por_pago": round(comisiones_cobradas / cantidad_pagos, 2) if cantidad_pagos > 0 else 0
    }


@router.get("/dia")
def comisiones_del_dia(
    fecha: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Resumen de comisiones de un día específico (hoy si no se especifica).
    """
    
    if fecha:
        fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    else:
        fecha_obj = date.today()
    
    # Comisiones vendedor del día (cobradas)
    comisiones_vendedor = db.query(
        func.sum(PagoVendedor.monto_comision)
    ).join(Pago, PagoVendedor.pago_id == Pago.id).filter(
        Pago.fecha_pago == fecha_obj
    ).scalar() or 0.0
    
    # Comisiones cobrador del día
    comisiones_cobrador = db.query(
        func.sum(PagoCobrador.monto_comision)
    ).join(Pago, PagoCobrador.pago_id == Pago.id).filter(
        Pago.fecha_pago == fecha_obj
    ).scalar() or 0.0
    
    # Total de pagos del día
    total_pagos = db.query(
        func.sum(Pago.monto)
    ).filter(Pago.fecha_pago == fecha_obj).scalar() or 0.0
    
    return {
        "fecha": fecha_obj.isoformat(),
        "total_pagos_cobrados": round(total_pagos, 2),
        "comisiones": {
            "vendedor": round(comisiones_vendedor, 2),
            "cobrador": round(comisiones_cobrador, 2),
            "total": round(comisiones_vendedor + comisiones_cobrador, 2)
        },
        "ingreso_neto": round(total_pagos - comisiones_vendedor - comisiones_cobrador, 2)
    }


@router.get("/empleados/ranking")
def ranking_empleados(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Ranking de empleados por comisiones (vendedores y cobradores separados).
    """
    
    # Ranking vendedores (comisiones cobradas)
    query_vendedores = db.query(
        PagoVendedor.empleado_id,
        PagoVendedor.empleado_nombre,
        func.sum(PagoVendedor.monto_comision).label('total_comisiones'),
        func.count(PagoVendedor.id).label('cantidad_pagos')
    ).join(Pago, PagoVendedor.pago_id == Pago.id)
    
    if fecha_desde:
        fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
        query_vendedores = query_vendedores.filter(Pago.fecha_pago >= fecha_desde_obj)
    
    if fecha_hasta:
        fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
        query_vendedores = query_vendedores.filter(Pago.fecha_pago <= fecha_hasta_obj)
    
    vendedores = query_vendedores.group_by(
        PagoVendedor.empleado_id,
        PagoVendedor.empleado_nombre
    ).order_by(func.sum(PagoVendedor.monto_comision).desc()).all()
    
    # Ranking cobradores
    query_cobradores = db.query(
        PagoCobrador.empleado_id,
        PagoCobrador.empleado_nombre,
        func.sum(PagoCobrador.monto_comision).label('total_comisiones'),
        func.count(PagoCobrador.id).label('cantidad_pagos')
    ).join(Pago, PagoCobrador.pago_id == Pago.id)
    
    if fecha_desde:
        query_cobradores = query_cobradores.filter(Pago.fecha_pago >= fecha_desde_obj)
    
    if fecha_hasta:
        query_cobradores = query_cobradores.filter(Pago.fecha_pago <= fecha_hasta_obj)
    
    cobradores = query_cobradores.group_by(
        PagoCobrador.empleado_id,
        PagoCobrador.empleado_nombre
    ).order_by(func.sum(PagoCobrador.monto_comision).desc()).all()
    
    return {
        "vendedores": [
            {
                "empleado_id": v.empleado_id,
                "nombre": v.empleado_nombre,
                "total_comisiones": round(v.total_comisiones, 2),
                "cantidad_pagos": v.cantidad_pagos
            }
            for v in vendedores
        ],
        "cobradores": [
            {
                "empleado_id": c.empleado_id,
                "nombre": c.empleado_nombre,
                "total_comisiones": round(c.total_comisiones, 2),
                "cantidad_pagos": c.cantidad_pagos
            }
            for c in cobradores
        ]
    }
