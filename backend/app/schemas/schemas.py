from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

# ===== CLIENTES =====
class ClienteBase(BaseModel):
    nombre: str
    dni: Optional[str] = None
    telefono: str
    direccion: Optional[str] = None
    email: Optional[str] = None
    ocupacion: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    dni: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    ocupacion: Optional[str] = None

class Cliente(ClienteBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True



# ===== PRÉSTAMOS =====
class PrestamoBase(BaseModel):
    cliente_id: int
    monto: float
    tasa_interes: float
    plazo_dias: int
    fecha_inicio: date
    frecuencia_pago: Optional[str] = "semanal"  # semanal o mensual

class PrestamoCreate(PrestamoBase):
    # Campos para comisión de vendedor (opcionales)
    vendedor_id: Optional[int] = None
    vendedor_nombre: Optional[str] = None
    vendedor_porcentaje: Optional[float] = None  # % sobre base
    vendedor_base: Optional[str] = "total"  # total | interes

class AprobarPrestamo(BaseModel):
    porcentaje: float  # porcentaje de comisión del vendedor
    base_tipo: Optional[str] = "total"  # total | interes
    # permitir ajustar vendedor si fuera necesario
    vendedor_empleado_id: Optional[int] = None

class PrestamoUpdate(BaseModel):
    monto: Optional[float] = None
    tasa_interes: Optional[float] = None
    estado: Optional[str] = None

class Prestamo(PrestamoBase):
    id: int
    fecha_vencimiento: date
    monto_total: float
    saldo_pendiente: float
    estado: str
    cuotas_totales: int
    cuotas_pagadas: int
    valor_cuota: float
    saldo_cuota: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class PrestamoVendedor(BaseModel):
    id: int
    prestamo_id: int
    empleado_id: Optional[int]
    empleado_nombre: Optional[str]
    porcentaje: float
    base_tipo: str
    monto_base: float
    monto_comision: float
    created_at: datetime

    class Config:
        from_attributes = True

class RefinanciacionCreate(BaseModel):
    interes_adicional: float  # porcentaje, ej: 10 para 10%
    cuotas: int
    frecuencia_pago: Optional[str] = "semanal"  # semanal o mensual
    fecha_inicio: Optional[date] = None


# ===== PAGOS =====
class PagoBase(BaseModel):
    prestamo_id: int
    monto: float
    fecha_pago: date
    metodo_pago: Optional[str] = "efectivo"
    tipo_pago: Optional[str] = "parcial"  # cuota, parcial, total
    notas: Optional[str] = None

class PagoCreate(PagoBase):
    # Campos adicionales solo para creación (no pertenecen al modelo Pago)
    cobrador_id: Optional[int] = None
    cobrador_nombre: Optional[str] = None
    porcentaje_cobrador: Optional[float] = None  # % sobre el monto del pago

class Pago(PagoBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ===== EMPLEADOS =====
class EmpleadoBase(BaseModel):
    nombre: str
    puesto: Optional[str] = "Cobrador"
    telefono: Optional[str] = None
    dni: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None

class EmpleadoCreate(EmpleadoBase):
    pass

class EmpleadoUpdate(BaseModel):
    nombre: Optional[str] = None
    puesto: Optional[str] = None
    telefono: Optional[str] = None
    dni: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None

class Empleado(EmpleadoBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class GananciasEmpleado(BaseModel):
    empleado_id: int
    start_date: date
    end_date: date
    total_comisiones_vendedor: float
    total_comisiones_cobrador: float
    ganancias_netas: float  # suma total de comisiones
    rol: str | None = None


# ===== COMISION COBRADOR (respuesta)
class PagoCobrador(BaseModel):
    id: int
    pago_id: int
    empleado_id: Optional[int] = None
    empleado_nombre: Optional[str] = None
    porcentaje: float
    monto_comision: float
    created_at: datetime

    class Config:
        from_attributes = True


class PagoVendedor(BaseModel):
    id: int
    pago_id: int
    empleado_id: Optional[int] = None
    empleado_nombre: Optional[str] = None
    porcentaje: float
    monto_comision: float
    created_at: datetime

    class Config:
        from_attributes = True

# ===== APROBACIÓN COMISIÓN COBRADOR =====
class AprobarPagoCobrador(BaseModel):
    porcentaje: float  # porcentaje sobre el monto del pago
    empleado_id: Optional[int] = None  # permitir ajustar cobrador si fuera necesario


# ===== METRICAS =====
class SummaryMetrics(BaseModel):
    timestamp: str
    total_clientes: int
    total_prestamos: int
    total_pagos: int
    monto_total_prestado: float
    monto_total_recaudado: float
    monto_total_esperado: float
    saldo_pendiente_total: float
    prestamos_activos: int
    prestamos_vencidos: int
    pagos_hoy: int
    average_loan_size: float
    ticket_promedio_pago: float
    clientes_activos: int
    activation_rate: float
    ganancias_netas: float
    total_comisiones_pagadas: float
    comisiones: dict  # {vendedor, cobrador, total}
    intereses_generados: float
    tasa_cobro: float | None = None  # ratio cobrado / esperado (0-1)
    mis_ganancias: float | None = None  # Ganancias históricas (todas las comisiones) del empleado si vista filtrada por empleado

class KPIMetrics(BaseModel):
    timestamp: str
    total_clientes: int
    total_prestamos: int
    monto_total_prestado: float
    monto_total_recaudado: float
    saldo_pendiente_total: float
    prestamos_activos: int
    prestamos_vencidos: int
    pagos_hoy: int
    monto_esperado_hoy: float
    recaudado_hoy_monto: float
    cumplimiento_hoy_pct: float
    average_loan_size: float
    ticket_promedio_pago: float
    clientes_activos: int
    activation_rate: float

class DailySimpleMetrics(BaseModel):
    fecha: str
    prestado_hoy: float
    por_cobrar_hoy: float
    cobrado_hoy: float


# ===== AMORTIZACIÓN =====
class Cuota(BaseModel):
    numero: int
    fecha: str  # ISO date
    monto: float
    estado: str  # Pagado, Vencido, Pendiente


# ===== CAJA / MOVIMIENTOS =====
class MovimientoCajaBase(BaseModel):
    fecha: date
    tipo: str  # ingreso | egreso
    monto: float
    categoria: Optional[str] = None  # prestamo | pago | comision | ajuste | otros
    descripcion: Optional[str] = None
    referencia_tipo: Optional[str] = None  # prestamo | pago | manual
    referencia_id: Optional[int] = None
    usuario_id: Optional[int] = None

class MovimientoCajaCreate(MovimientoCajaBase):
    pass

class MovimientoCaja(MovimientoCajaBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CierreCaja(BaseModel):
    fecha: date
    saldo_inicial: float
    ingresos: float
    egresos: float
    saldo_esperado: float
    saldo_final: Optional[float] = None
    diferencia: Optional[float] = None
    cerrado: bool
    detalle_ingresos: dict
    detalle_egresos: dict
    comisiones: dict | None = None
    flujo_neto: dict | None = None

class CerrarDiaRequest(BaseModel):
    fecha: date
    saldo_final: float

class AbrirDiaRequest(BaseModel):
    fecha: date

class CajaCierreResponse(BaseModel):
    id: int
    fecha: date
    saldo_inicial: float
    ingresos: float
    egresos: float
    saldo_esperado: float
    saldo_final: Optional[float]
    diferencia: Optional[float]
    cerrado: bool
    created_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ===== SEGMENTACIÓN MÉTRICAS =====
class SegmentItem(BaseModel):
    grupo: str
    prestamos: int
    monto_prestado: float
    monto_total: float
    saldo_pendiente: float
    promedio_monto: float

class SegmentResponse(BaseModel):
    dimension: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_prestamos: int
    items: list[SegmentItem]


# ===== CAJA EMPLEADO =====
class CajaEmpleadoMovimientoCreate(BaseModel):
    fecha: date
    tipo: str  # ingreso | egreso
    monto: float
    categoria: Optional[str] = None  # deposito_caja | otros
    descripcion: Optional[str] = None

class CajaEmpleadoMovimiento(BaseModel):
    id: int
    fecha: date
    empleado_id: int
    tipo: str
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    monto: float
    referencia_tipo: Optional[str] = None
    referencia_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CajaEmpleadoResumen(BaseModel):
    fecha: date
    empleado_id: int
    ingresos_cobrados: float
    comision_ganada: float
    ingresos_otros: float
    egresos: float
    depositos: float
    saldo_esperado_entregar: float
    entregado: Optional[float] = None
    diferencia: Optional[float] = None
    cerrado: bool

class CajaEmpleadoCerrarRequest(BaseModel):
    fecha: date
    entregado: float

class CajaEmpleadoAbrirRequest(BaseModel):
    fecha: date
