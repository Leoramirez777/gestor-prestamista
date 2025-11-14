import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPrestamos } from '../api/prestamos';
import { fetchClientes } from '../api/clientes';
import '../styles/Prestamos.css';

export default function Prestamos() {
  const navigate = useNavigate();
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar préstamos y clientes en paralelo
        const [prestamosData, clientesData] = await Promise.all([
          fetchPrestamos(),
          fetchClientes()
        ]);
        
        setPrestamos(prestamosData || []);
        setClientes(clientesData || []);
        setError(null);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los préstamos');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const getClienteNombre = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'Cliente desconocido';
  };

  const getEstadoClass = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo': return 'badge bg-success';
      case 'pagado': return 'badge bg-primary';
      case 'vencido': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
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

  return (
    <div className="container my-5">
      {/* Header con botón de regreso */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold text-dark">💰 Gestión de Préstamos</h1>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={() => navigate('/nuevos-prestamos')}
          >
            ➕ Nuevo Préstamo
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate('/')}
          >
            ← Volver al Menú
          </button>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError(null)}
          ></button>
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-primary">{prestamos.length}</h5>
              <p className="card-text small">Total Préstamos</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-success">
                {prestamos.filter(p => p.estado === 'activo').length}
              </h5>
              <p className="card-text small">Activos</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-primary">
                {formatCurrency(prestamos.reduce((sum, p) => sum + (p.monto || 0), 0))}
              </h5>
              <p className="card-text small">Total Prestado</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-warning">
                {formatCurrency(prestamos.reduce((sum, p) => sum + (p.saldo_pendiente || 0), 0))}
              </h5>
              <p className="card-text small">Saldo Pendiente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de préstamos */}
      {prestamos.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="fas fa-hand-holding-usd text-muted" style={{ fontSize: '4rem' }}></i>
          </div>
          <h4 className="text-muted">No hay préstamos registrados</h4>
          <p className="text-muted">Comienza agregando tu primer préstamo</p>
          <button
            className="btn btn-success"
            onClick={() => navigate('/nuevos-prestamos')}
          >
            ➕ Crear Primer Préstamo
          </button>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <h5 className="mb-0">Lista de Préstamos</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Tasa (%)</th>
                    <th>Inicio</th>
                    <th>Vencimiento</th>
                    <th>Saldo Pendiente</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {prestamos.map((prestamo) => (
                    <tr key={prestamo.id}>
                      <td>
                        <span className="fw-bold text-primary">#{prestamo.id}</span>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold">{getClienteNombre(prestamo.cliente_id)}</div>
                          <small className="text-muted">ID: {prestamo.cliente_id}</small>
                        </div>
                      </td>
                      <td>
                        <span className="fw-bold">{formatCurrency(prestamo.monto)}</span>
                      </td>
                      <td>
                        <span className="badge bg-info">{prestamo.tasa_interes}%</span>
                      </td>
                      <td>{formatDate(prestamo.fecha_inicio)}</td>
                      <td>{formatDate(prestamo.fecha_vencimiento)}</td>
                      <td>
                        <span className={`fw-bold ${prestamo.saldo_pendiente > 0 ? 'text-danger' : 'text-success'}`}>
                          {formatCurrency(prestamo.saldo_pendiente)}
                        </span>
                      </td>
                      <td>
                        <span className={getEstadoClass(prestamo.estado)}>
                          {prestamo.estado || 'Sin estado'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-primary btn-sm"
                            title="Ver detalles"
                            onClick={() => {
                              // Aquí podrías navegar a detalles del préstamo
                              console.log('Ver detalles de préstamo:', prestamo.id);
                            }}
                          >
                            👁️
                          </button>
                          <button 
                            className="btn btn-outline-success btn-sm"
                            title="Registrar pago"
                            onClick={() => {
                              navigate('/pagos', { state: { prestamoId: prestamo.id } });
                            }}
                          >
                            💵
                          </button>
                        </div>
                      </td>
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
