import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPrestamos } from '../api/prestamos';
import { fetchCliente } from '../api/clientes';
import { fetchPagosByPrestamo } from '../api/pagos';
import '../styles/DetallePrestamo.css';

export default function DetallePrestamo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prestamo, setPrestamo] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar todos los préstamos y encontrar el específico
        const prestamosData = await fetchPrestamos();
        const prestamoEncontrado = prestamosData.find(p => p.id === parseInt(id));
        
        if (!prestamoEncontrado) {
          setError('Préstamo no encontrado');
          setLoading(false);
          return;
        }

        setPrestamo(prestamoEncontrado);

        // Cargar datos del cliente y pagos
        const [clienteData, pagosData] = await Promise.all([
          fetchCliente(prestamoEncontrado.cliente_id),
          fetchPagosByPrestamo(id)
        ]);

        setCliente(clienteData);
        setPagos(pagosData || []);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos del préstamo');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const calcularIntereses = () => {
    if (!prestamo) return 0;
    return prestamo.monto_total - prestamo.monto;
  };

  const calcularValorCuota = () => {
    if (!prestamo) return 0;
    // Calcular número de cuotas según frecuencia
    let numeroCuotas;
    if (prestamo.frecuencia_pago === 'semanal') {
      numeroCuotas = Math.ceil(prestamo.plazo_dias / 7);
    } else if (prestamo.frecuencia_pago === 'mensual') {
      numeroCuotas = Math.ceil(prestamo.plazo_dias / 30);
    } else {
      numeroCuotas = prestamo.plazo_dias; // Por si es diario
    }
    return prestamo.monto_total / numeroCuotas;
  };

  const calcularCuotasPagadas = () => {
    return pagos.length;
  };

  const getEstadoInfo = () => {
    if (!prestamo) return { texto: 'Desconocido', color: 'text-secondary' };
    
    const hoy = new Date();
    const vencimiento = new Date(prestamo.fecha_vencimiento);
    
    if (prestamo.saldo_pendiente <= 0) {
      return { texto: 'Pagado', color: 'text-success' };
    } else if (vencimiento < hoy) {
      return { texto: 'Vencido', color: 'text-danger' };
    } else {
      return { texto: 'Vigente', color: 'text-warning' };
    }
  };

  if (loading) {
    return (
      <div className="container my-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !prestamo) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger">
          {error || 'Préstamo no encontrado'}
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/prestamos')}>
          ← Volver a Préstamos
        </button>
      </div>
    );
  }

  const estadoInfo = getEstadoInfo();

  return (
    <div className="container my-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold text-dark">Detalle del Préstamo</h1>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/prestamos')}>
          ← Volver a Préstamos
        </button>
      </div>

      {/* Card principal con información del cliente */}
      <div className="card shadow-sm mb-4 detalle-card">
        <div className="card-body text-center py-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="mb-3">
            <div className="rounded-circle bg-white d-inline-flex align-items-center justify-content-center" 
                 style={{ width: '80px', height: '80px' }}>
              <i className="fas fa-user fa-2x" style={{ color: '#667eea' }}></i>
            </div>
          </div>
          <h3 className="text-white mb-0">{cliente?.nombre || 'Cargando...'}</h3>
        </div>
      </div>

      {/* Grid de información principal */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Fecha:</label>
            <p className="info-value text-warning">{formatDate(prestamo.fecha_inicio)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Vencimiento:</label>
            <p className="info-value text-warning">{formatDate(prestamo.fecha_vencimiento)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Monto:</label>
            <p className="info-value text-warning">{formatCurrency(prestamo.monto)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Tasa de Interés:</label>
            <p className="info-value text-warning">{prestamo.tasa_interes}%</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Intereses:</label>
            <p className="info-value text-warning">{formatCurrency(calcularIntereses())}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Total:</label>
            <p className="info-value text-warning">{formatCurrency(prestamo.monto_total)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Frecuencia de Pago:</label>
            <p className="info-value text-warning text-capitalize">{prestamo.frecuencia_pago || 'Semanal'}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Cantidad de Cuotas:</label>
            <p className="info-value text-warning">
              {prestamo.frecuencia_pago === 'semanal' 
                ? Math.ceil(prestamo.plazo_dias / 7)
                : Math.ceil(prestamo.plazo_dias / 30)}
            </p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Valor de Cuota:</label>
            <p className="info-value text-warning">{formatCurrency(calcularValorCuota())}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Cuotas Pagadas:</label>
            <p className="info-value text-warning">{calcularCuotasPagadas()}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Saldo:</label>
            <p className="info-value text-warning">{formatCurrency(prestamo.saldo_pendiente)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Estatus:</label>
            <p className={`info-value ${estadoInfo.color}`}>{estadoInfo.texto}</p>
          </div>
        </div>
      </div>

      {/* Historial de pagos */}
      {pagos.length > 0 && (
        <div className="card shadow-sm">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">Historial de Pagos</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td>{formatDate(pago.fecha_pago)}</td>
                      <td className="text-success fw-bold">{formatCurrency(pago.monto)}</td>
                      <td className="text-capitalize">{pago.metodo_pago || 'Efectivo'}</td>
                      <td>{pago.notas || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
