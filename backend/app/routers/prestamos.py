from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta, date
from app.database.database import get_db
from app.models.models import Prestamo, Cliente, Empleado, PrestamoVendedor, MovimientoCaja, Usuario
from app.schemas.schemas import Prestamo as PrestamoSchema, PrestamoCreate, PrestamoUpdate, RefinanciacionCreate, Cuota, PrestamoVendedor as PrestamoVendedorSchema
from app.amortization_service import generar_amortizacion
from app.caja_service import actualizar_totales_cierre, get_or_create_cierre
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/preview-vendedor")
def preview_vendedor(monto: float, tasa_interes: float, porcentaje: float, base: str = "total"):
    """Calcular comisión de vendedor sin persistir.
    base=total -> sobre monto + interés
    base=interes -> solo interés generado
    """
    if porcentaje < 0 or porcentaje > 100:
        raise HTTPException(status_code=400, detail="Porcentaje inválido (0-100)")
    monto_interes = monto * (tasa_interes / 100.0)
    if base not in ["total", "interes"]:
        raise HTTPException(status_code=400, detail="Base inválida (total|interes)")
    monto_base = (monto + monto_interes) if base == "total" else monto_interes
    monto_comision = monto_base * (porcentaje / 100.0)
    return {"monto_base": round(monto_base, 2), "monto_comision": round(monto_comision, 2)}

@router.get("/", response_model=List[PrestamoSchema])
def get_prestamos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Obtener préstamos según el rol del usuario"""
    try:
        # Si es admin, ve todos los préstamos
        if current_user.role == 'admin':
            prestamos = db.query(Prestamo).offset(skip).limit(limit).all()
            return prestamos
        
        # Si es vendedor, solo ve préstamos donde está asignado como vendedor
        if not current_user.empleado_id:
            return []
        
        # Obtener IDs de préstamos donde el usuario está asignado
        prestamos_ids = db.query(PrestamoVendedor.prestamo_id).filter(
            PrestamoVendedor.empleado_id == current_user.empleado_id
        ).distinct().all()
        
        if not prestamos_ids:
            return []
        
        prestamo_ids_list = [p[0] for p in prestamos_ids]
        
        prestamos = db.query(Prestamo).filter(
            Prestamo.id.in_(prestamo_ids_list)
        ).offset(skip).limit(limit).all()
        
        return prestamos
    except Exception as e:
        print(f"Error en get_prestamos: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    prestamos = db.query(Prestamo).offset(skip).limit(limit).all()
    return prestamos

@router.get("/{prestamo_id}", response_model=PrestamoSchema)
def get_prestamo(prestamo_id: int, db: Session = Depends(get_db)):
    """Obtener un préstamo por ID"""
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    return prestamo

@router.get("/cliente/{cliente_id}", response_model=List[PrestamoSchema])
def get_prestamos_by_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Obtener préstamos de un cliente"""
    prestamos = db.query(Prestamo).filter(Prestamo.cliente_id == cliente_id).all()
    return prestamos

@router.post("/", response_model=PrestamoSchema, status_code=status.HTTP_201_CREATED)
def create_prestamo(prestamo: PrestamoCreate, db: Session = Depends(get_db)):
    """Crear un nuevo préstamo"""
    # Verificar que el cliente existe
    cliente = db.query(Cliente).filter(Cliente.id == prestamo.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Calcular valores del préstamo
    monto_interes = prestamo.monto * (prestamo.tasa_interes / 100)
    monto_total = prestamo.monto + monto_interes
    fecha_vencimiento = prestamo.fecha_inicio + timedelta(days=prestamo.plazo_dias)
    
    # Calcular cuotas según frecuencia de pago
    if prestamo.frecuencia_pago == "mensual":
        cuotas_totales = max(1, round(prestamo.plazo_dias / 30))
    else:  # semanal
        cuotas_totales = max(1, round(prestamo.plazo_dias / 7))
    
    valor_cuota = monto_total / cuotas_totales
    
    # Bloquear si el día está cerrado para la fecha de inicio
    cierre_fecha = get_or_create_cierre(db, prestamo.fecha_inicio)
    if cierre_fecha.cerrado:
        raise HTTPException(status_code=400, detail="El día está cerrado. Abre la caja para registrar préstamos.")

    db_prestamo = Prestamo(
        cliente_id=prestamo.cliente_id,
        monto=prestamo.monto,
        tasa_interes=prestamo.tasa_interes,
        plazo_dias=prestamo.plazo_dias,
        fecha_inicio=prestamo.fecha_inicio,
        fecha_vencimiento=fecha_vencimiento,
        monto_total=monto_total,
        saldo_pendiente=monto_total,
        estado="activo",
        frecuencia_pago=prestamo.frecuencia_pago,
        cuotas_totales=cuotas_totales,
        cuotas_pagadas=0,
        valor_cuota=valor_cuota,
        saldo_cuota=0.0
    )
    
    db.add(db_prestamo)
    db.commit()
    db.refresh(db_prestamo)

    # Crear movimiento de caja automático (egreso por desembolso)
    cliente = db.query(Cliente).filter(Cliente.id == db_prestamo.cliente_id).first()
    cliente_nombre = cliente.nombre if cliente else f"Cliente {db_prestamo.cliente_id}"
    
    movimiento_caja = MovimientoCaja(
        fecha=db_prestamo.fecha_inicio,
        tipo="egreso",
        categoria="prestamo",
        descripcion=f"Desembolso préstamo #{db_prestamo.id} - {cliente_nombre}",
        monto=db_prestamo.monto,
        referencia_tipo="prestamo",
        referencia_id=db_prestamo.id,
        usuario_id=None  # TODO: obtener del token
    )
    db.add(movimiento_caja)
    db.commit()
    
    # Actualizar totales del cierre del día
    actualizar_totales_cierre(db, db_prestamo.fecha_inicio)

    # Comisión vendedor (opcional)
    if prestamo.vendedor_porcentaje and prestamo.vendedor_porcentaje > 0 and prestamo.vendedor_id:
        if prestamo.vendedor_porcentaje < 0 or prestamo.vendedor_porcentaje > 100:
            raise HTTPException(status_code=400, detail="Porcentaje vendedor inválido (0-100)")
        base_tipo = (prestamo.vendedor_base or "total").lower()
        if base_tipo not in ["total", "interes"]:
            raise HTTPException(status_code=400, detail="Base vendedor inválida (total|interes)")
        empleado = db.query(Empleado).filter(Empleado.id == prestamo.vendedor_id).first()
        if not empleado:
            raise HTTPException(status_code=404, detail="Vendedor no encontrado")
        monto_interes = prestamo.monto * (prestamo.tasa_interes / 100)
        monto_base = (prestamo.monto + monto_interes) if base_tipo == "total" else monto_interes
        monto_comision = monto_base * (prestamo.vendedor_porcentaje / 100.0)
        registro = PrestamoVendedor(
            prestamo_id=db_prestamo.id,
            empleado_id=empleado.id,
            empleado_nombre=empleado.nombre,
            porcentaje=prestamo.vendedor_porcentaje,
            base_tipo=base_tipo,
            monto_base=monto_base,
            monto_comision=monto_comision,
        )
        db.add(registro)
        db.commit()
    return db_prestamo

@router.put("/{prestamo_id}", response_model=PrestamoSchema)
def update_prestamo(prestamo_id: int, prestamo: PrestamoUpdate, db: Session = Depends(get_db)):
    """Actualizar un préstamo"""
    db_prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not db_prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    update_data = prestamo.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_prestamo, key, value)
    
    db.commit()
    db.refresh(db_prestamo)
    return db_prestamo

@router.delete("/{prestamo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prestamo(prestamo_id: int, db: Session = Depends(get_db)):
    """Eliminar un préstamo"""
    db_prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not db_prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    db.delete(db_prestamo)
    db.commit()
    return None

@router.post("/{prestamo_id}/refinanciar", response_model=PrestamoSchema, status_code=status.HTTP_201_CREATED)
def refinanciar_prestamo(prestamo_id: int, params: RefinanciacionCreate, db: Session = Depends(get_db)):
    """Refinanciar un préstamo impago: crea un nuevo préstamo a partir del saldo pendiente."""
    db_prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not db_prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    if db_prestamo.saldo_pendiente <= 0:
        raise HTTPException(status_code=400, detail="El préstamo no tiene saldo pendiente para refinanciar")

    # Debe haber terminado el plan original (todas las cuotas) o estar marcado como impago
    if not (db_prestamo.cuotas_pagadas >= db_prestamo.cuotas_totales or db_prestamo.estado.lower() in ["impago", "vencido"]):
        raise HTTPException(status_code=400, detail="Solo se puede refinanciar préstamos impagos o con plan original finalizado")

    interes = params.interes_adicional / 100.0
    capital_refinanciado = round(db_prestamo.saldo_pendiente * (1 + interes), 2)

    # Calcular plazo según frecuencia y cuotas
    frecuencia = (params.frecuencia_pago or db_prestamo.frecuencia_pago or "semanal").lower()
    cuotas_totales = max(1, int(params.cuotas))
    if frecuencia == "mensual":
        plazo_dias = cuotas_totales * 30
    else:
        plazo_dias = cuotas_totales * 7

    fecha_inicio = params.fecha_inicio or date.today()
    fecha_vencimiento = fecha_inicio + timedelta(days=plazo_dias)
    valor_cuota = capital_refinanciado / cuotas_totales

    # Crear nuevo préstamo (refinanciado)
    nuevo = Prestamo(
        cliente_id=db_prestamo.cliente_id,
        monto=db_prestamo.saldo_pendiente,  # capital original adeudado
        tasa_interes=params.interes_adicional,
        plazo_dias=plazo_dias,
        fecha_inicio=fecha_inicio,
        fecha_vencimiento=fecha_vencimiento,
        monto_total=capital_refinanciado,
        saldo_pendiente=capital_refinanciado,
        estado="activo",
        frecuencia_pago=frecuencia,
        cuotas_totales=cuotas_totales,
        cuotas_pagadas=0,
        valor_cuota=valor_cuota,
        saldo_cuota=0.0,
    )

    db.add(nuevo)

    # Actualizar préstamo original a 'refinanciado'
    db_prestamo.estado = "refinanciado"
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/{prestamo_id}/amortizacion", response_model=List[Cuota])
def get_amortizacion(prestamo_id: int, db: Session = Depends(get_db)):
    """Obtener la tabla de amortización de un préstamo"""
    prestamo = db.query(Prestamo).filter(Prestamo.id == prestamo_id).first()
    if not prestamo:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    cuotas = generar_amortizacion(prestamo, db)
    return cuotas


@router.get("/{prestamo_id}/vendedor", response_model=PrestamoVendedorSchema)
def get_comision_vendedor(prestamo_id: int, db: Session = Depends(get_db)):
    registro = db.query(PrestamoVendedor).filter(PrestamoVendedor.prestamo_id == prestamo_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Comisión de vendedor no encontrada")
    return registro
