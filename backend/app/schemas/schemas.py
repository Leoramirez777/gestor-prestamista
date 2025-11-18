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
    tasa_recaudo: float
    average_loan_size: float
    ticket_promedio_pago: float
    clientes_activos: int
    activation_rate: float

class KPIMetrics(BaseModel):
    timestamp: str
    total_clientes: int
    total_prestamos: int
    monto_total_prestado: float
    monto_total_recaudado: float
    monto_total_esperado: float
    saldo_pendiente_total: float
    prestamos_activos: int
    prestamos_vencidos: int
    pagos_hoy: int
    monto_esperado_hoy: float
    recaudado_hoy_monto: float
    cumplimiento_hoy_pct: float
    tasa_recaudo: float
    average_loan_size: float
    ticket_promedio_pago: float
    clientes_activos: int
    activation_rate: float

class DailySimpleMetrics(BaseModel):
    fecha: str
    prestado_hoy: float
    prestado_con_intereses_hoy: float
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
    categoria: Optional[str] = None  # desembolso_prestamo, pago_cuota, ajuste, gastos_operativos, ingreso_extra
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

class CerrarDiaRequest(BaseModel):
    fecha: date
    saldo_final: float

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
