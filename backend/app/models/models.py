from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
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
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación
    prestamo = relationship("Prestamo", back_populates="pagos")
