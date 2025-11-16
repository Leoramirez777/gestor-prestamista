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

  // Filtros de barra
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMontoMin, setFiltroMontoMin] = useState("");
  const [filtroMontoMax, setFiltroMontoMax] = useState("");
  const [filtroTasaMin, setFiltroTasaMin] = useState("");
  const [filtroTasaMax, setFiltroTasaMax] = useState("");
  const [filtroFechaCreacion, setFiltroFechaCreacion] = useState("");

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
    // Extraer solo la parte de fecha (YYYY-MM-DD) para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
  };

  // Filtrar préstamos según los filtros
  const prestamosFiltrados = prestamos.filter((prestamo) => {
    // Nombre de cliente
    const cliente = clientes.find(c => c.id === prestamo.cliente_id);
    const nombreCliente = cliente ? cliente.nombre.toLowerCase() : "";
    if (filtroNombre && !nombreCliente.includes(filtroNombre.toLowerCase())) return false;
    // Estado
    if (filtroEstado && prestamo.estado !== filtroEstado) return false;
    // Monto
    if (filtroMontoMin && prestamo.monto < parseFloat(filtroMontoMin)) return false;
    if (filtroMontoMax && prestamo.monto > parseFloat(filtroMontoMax)) return false;
    // Tasa de interés
    if (filtroTasaMin && prestamo.tasa_interes < parseFloat(filtroTasaMin)) return false;
    if (filtroTasaMax && prestamo.tasa_interes > parseFloat(filtroTasaMax)) return false;
    // Fecha de creación (exacta)
    if (filtroFechaCreacion) {
      const fechaPrestamo = new Date(prestamo.fecha_inicio.split('T')[0]).toISOString().split('T')[0];
      if (fechaPrestamo !== filtroFechaCreacion) return false;
    }
    return true;
  });

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

  // ...existing code...
  return (
    <div className="container my-5">
      {/* Encabezado con botón de regreso */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold text-dark m-0">Gestión de Préstamos</h1>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>← Volver al Menú</button>
      </div>

      <div className="card mb-4 shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px' }}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-white fw-bold mb-0">
              <i className="fas fa-filter me-2"></i>Filtros de Búsqueda
            </h5>
            <button 
              type="button" 
              className="btn btn-sm btn-light"
              onClick={() => {
                setFiltroNombre("");
                setFiltroEstado("");
                setFiltroMontoMin("");
                setFiltroMontoMax("");
                setFiltroTasaMin("");
                setFiltroTasaMax("");
                setFiltroFechaCreacion("");
              }}
            >
              <i className="fas fa-times me-1"></i>Limpiar
            </button>
          </div>
          
          {/* Primera fila de filtros */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label text-white mb-1 small">Nombre del Cliente</label>
              <input 
                type="text" 
                className="form-control" 
                value={filtroNombre} 
                onChange={e => setFiltroNombre(e.target.value)} 
                placeholder="Buscar por nombre..."
                style={{ borderRadius: '8px' }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label text-white mb-1 small">Estado del Préstamo</label>
              <select 
                className="form-select" 
                value={filtroEstado} 
                onChange={e => setFiltroEstado(e.target.value)}
                style={{ borderRadius: '8px' }}
              >
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="pagado">Pagado</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label text-white mb-1 small">Monto Mínimo</label>
              <input 
                type="number" 
                className="form-control" 
                value={filtroMontoMin} 
                onChange={e => setFiltroMontoMin(e.target.value)} 
                placeholder="$ Min" 
                min="0"
                style={{ borderRadius: '8px' }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label text-white mb-1 small">Monto Máximo</label>
              <input 
                type="number" 
                className="form-control" 
                value={filtroMontoMax} 
                onChange={e => setFiltroMontoMax(e.target.value)} 
                placeholder="$ Max" 
                min="0"
                style={{ borderRadius: '8px' }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label text-white mb-1 small">Fecha de Creación</label>
              <input 
                type="date" 
                className="form-control" 
                value={filtroFechaCreacion} 
                onChange={e => setFiltroFechaCreacion(e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </div>
          </div>
          
          {/* Segunda fila de filtros */}
          <div className="row g-3">
            <div className="col-md-2">
              <label className="form-label text-white mb-1 small">Tasa Mínima (%)</label>
              <input 
                type="number" 
                className="form-control" 
                value={filtroTasaMin} 
                onChange={e => setFiltroTasaMin(e.target.value)} 
                placeholder="% Min" 
                min="0" 
                step="0.1"
                style={{ borderRadius: '8px' }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label text-white mb-1 small">Tasa Máxima (%)</label>
              <input 
                type="number" 
                className="form-control" 
                value={filtroTasaMax} 
                onChange={e => setFiltroTasaMax(e.target.value)} 
                placeholder="% Max" 
                min="0" 
                step="0.1"
                style={{ borderRadius: '8px' }}
              />
            </div>
            <div className="col-md-8 d-flex align-items-end">
              <div className="alert alert-light mb-0 py-2 w-100" style={{ borderRadius: '8px' }}>
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  Mostrando <strong>{prestamosFiltrados.length}</strong> de <strong>{prestamos.length}</strong> préstamos
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
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
              <h5 className="card-title text-success">{prestamos.filter(p => p.estado === 'activo').length}</h5>
              <p className="card-text small">Activos</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-primary">{formatCurrency(prestamos.reduce((sum, p) => sum + (p.monto || 0), 0))}</h5>
              <p className="card-text small">Total Prestado</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-dark">{formatCurrency(prestamos.reduce((sum, p) => sum + (p.saldo_pendiente || 0), 0))}</h5>
              <p className="card-text small">Saldo Pendiente</p>
            </div>
          </div>
        </div>
      </div>

      {prestamosFiltrados.length === 0 ? (
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
            Crear Primer Préstamo
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
                  {prestamosFiltrados.map((prestamo) => (
                    <tr 
                      key={prestamo.id}
                      onClick={() => navigate(`/prestamos/${prestamo.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
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
                        <span className="tasainteres">{prestamo.tasa_interes}%</span>
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
                      <td onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => navigate('/pagos', { state: { prestamoId: prestamo.id } })}
                        >
                          Pagar
                        </button>
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

