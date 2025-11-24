from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    nombre_completo = Column(String(100), nullable=False)
    dni = Column(String(20))
    telefono = Column(String(20))
    direccion = Column(String(200))
    email = Column(String(100))
    role = Column(String(20), default="admin")  # admin | vendedor | cobrador
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    dni = Column(String(20))
    telefono = Column(String(20), nullable=False)
    direccion = Column(String(200))
    email = Column(String(100))
    ocupacion = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación con préstamos
    prestamos = relationship("Prestamo", back_populates="cliente")


class Prestamo(Base):
    __tablename__ = "prestamos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    monto = Column(Float, nullable=False)
    tasa_interes = Column(Float, nullable=False)  # Porcentaje
    plazo_dias = Column(Integer, nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    monto_total = Column(Float, nullable=False)  # Monto + interés
    saldo_pendiente = Column(Float, nullable=False)
    estado = Column(String(20), default="activo")  # activo, pagado, vencido
    frecuencia_pago = Column(String(20), default="semanal")  # semanal, mensual
    # Sistema de cuotas
    cuotas_totales = Column(Integer, default=0)
    cuotas_pagadas = Column(Integer, default=0)
    valor_cuota = Column(Float, default=0.0)
    saldo_cuota = Column(Float, default=0.0)  # + debe más, - tiene a favor
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    cliente = relationship("Cliente", back_populates="prestamos")
    pagos = relationship("Pago", back_populates="prestamo")


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    prestamo_id = Column(Integer, ForeignKey("prestamos.id"), nullable=False)
    monto = Column(Float, nullable=False)
    fecha_pago = Column(Date, nullable=False)
    metodo_pago = Column(String(50))  # efectivo, transferencia, etc.
    notas = Column(String(200))
    tipo_pago = Column(String(20), default="parcial")  # cuota, parcial, total
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación
    prestamo = relationship("Prestamo", back_populates="pagos")


# === EMPLEADOS ===
class Empleado(Base):
    __tablename__ = "empleados"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    puesto = Column(String(50), default="Cobrador")  # Cobrador, Vendedor, Otro
    telefono = Column(String(20))
    dni = Column(String(20))
    email = Column(String(100))
    direccion = Column(String(200))
    fecha_nacimiento = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PagoCobrador(Base):
    __tablename__ = "pagos_cobradores"

    id = Column(Integer, primary_key=True, index=True)
    pago_id = Column(Integer, ForeignKey("pagos.id"), nullable=False)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=True)
    empleado_nombre = Column(String(100))  # seguridad por si se elimina el empleado
    porcentaje = Column(Float, nullable=False)  # % del pago (no del préstamo)
    monto_comision = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PagoVendedor(Base):
    __tablename__ = "pagos_vendedores"

    id = Column(Integer, primary_key=True, index=True)
    pago_id = Column(Integer, ForeignKey("pagos.id"), nullable=False)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=True)
    empleado_nombre = Column(String(100))  # seguridad por si se elimina el empleado
    porcentaje = Column(Float, nullable=False)  # % del pago según préstamo
    monto_comision = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# === COMISION VENDEDOR POR PRÉSTAMO ===
class PrestamoVendedor(Base):
    __tablename__ = "prestamos_vendedores"

    id = Column(Integer, primary_key=True, index=True)
    prestamo_id = Column(Integer, ForeignKey("prestamos.id"), nullable=False)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=True)
    empleado_nombre = Column(String(100))  # respaldo del nombre
    porcentaje = Column(Float, nullable=False)  # % sobre base
    base_tipo = Column(String(20), default="total")  # total | interes
    monto_base = Column(Float, nullable=False)
    monto_comision = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# === MOVIMIENTOS DE CAJA ===
class MovimientoCaja(Base):
    __tablename__ = "caja_movimientos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    tipo = Column(String(20), nullable=False)  # ingreso | egreso
    categoria = Column(String(50), nullable=True)  # desembolso_prestamo, pago_cuota, ajuste, gastos_operativos, ingreso_extra
    descripcion = Column(String(200), nullable=True)
    monto = Column(Float, nullable=False)
    referencia_tipo = Column(String(30), nullable=True)  # prestamo | pago | manual
    referencia_id = Column(Integer, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# === CIERRES DE CAJA ===
class CajaCierre(Base):
    __tablename__ = "caja_cierres"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, unique=True, index=True)
    saldo_inicial = Column(Float, default=0.0)
    ingresos = Column(Float, default=0.0)
    egresos = Column(Float, default=0.0)
    saldo_esperado = Column(Float, default=0.0)  # saldo_inicial + ingresos - egresos
    saldo_final = Column(Float, nullable=True)  # confirmado al cerrar
    diferencia = Column(Float, nullable=True)  # saldo_final - saldo_esperado
    cerrado = Column(Boolean, default=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

