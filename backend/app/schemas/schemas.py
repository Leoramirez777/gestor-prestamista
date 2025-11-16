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
    pass

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
    pass

class Pago(PagoBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
