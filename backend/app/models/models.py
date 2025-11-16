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
    created_at = Column(DateTime, default=datetime.utcnow)


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    dni = Column(String(20))
    telefono = Column(String(20), nullable=False)
    direccion = Column(String(200))
    email = Column(String(100))
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
