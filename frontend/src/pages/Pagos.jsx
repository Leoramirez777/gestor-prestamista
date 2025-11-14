import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchPagos, createPago } from '../api/pagos';
import { fetchPrestamos } from '../api/prestamos';
import { fetchClientes } from '../api/clientes';
import '../styles/Pagos.css';

export default function Pagos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pagos, setPagos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    prestamo_id: '',
    monto: '',
    metodo_pago: 'efectivo',
    notas: ''
  });
  const [creatingPago, setCreatingPago] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar todos los datos en paralelo
        const [pagosData, prestamosData, clientesData] = await Promise.all([
          fetchPagos(),
          fetchPrestamos(),
          fetchClientes()
        ]);
        
        setPagos(pagosData || []);
        setPrestamos(prestamosData || []);
        setClientes(clientesData || []);
        
        // Si viene desde préstamos con un préstamo específico
        if (location.state?.prestamoId) {
          setFormData(prev => ({ ...prev, prestamo_id: location.state.prestamoId }));
          setShowModal(true);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los pagos');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [location.state]);

  const getPrestamoInfo = (prestamoId) => {
    const prestamo = prestamos.find(p => p.id === prestamoId);
    if (!prestamo) return { info: 'Préstamo desconocido', cliente: 'Cliente desconocido' };
    
    const cliente = clientes.find(c => c.id === prestamo.cliente_id);
    return {
      info: `Préstamo #${prestamo.id} - $${prestamo.monto}`,
      cliente: cliente ? cliente.nombre : 'Cliente desconocido'
    };
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

  const getMetodoPagoClass = (metodo) => {
    switch (metodo?.toLowerCase()) {
      case 'efectivo': return 'badge bg-success';
      case 'transferencia': return 'badge bg-primary';
      case 'cheque': return 'badge bg-warning';
      case 'tarjeta': return 'badge bg-info';
      default: return 'badge bg-secondary';
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreatePago = async (e) => {
    e.preventDefault();
    setCreatingPago(true);
    setError(null);

    try {
      // Validaciones del lado del cliente
      if (!formData.prestamo_id || !formData.monto) {
        throw new Error('Por favor complete todos los campos requeridos');
      }

      if (parseFloat(formData.monto) <= 0) {
        throw new Error('El monto debe ser mayor a cero');
      }

      const pagoData = {
        prestamo_id: parseInt(formData.prestamo_id),
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        notas: formData.notas || '',
        fecha_pago: new Date().toISOString().split('T')[0]
      };

      console.log('Enviando datos del pago:', pagoData);

      const nuevoPago = await createPago(pagoData);
      console.log('Pago creado exitosamente:', nuevoPago);
      
      // Recargar datos
      const pagosData = await fetchPagos();
      setPagos(pagosData || []);
      
      // Mostrar mensaje de éxito
      alert('¡Pago registrado exitosamente!');
      
      // Limpiar formulario y cerrar modal
      setFormData({
        prestamo_id: '',
        monto: '',
        metodo_pago: 'efectivo',
        notas: ''
      });
      setShowModal(false);
      
    } catch (error) {
      console.error('Error al crear pago:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Error al registrar el pago';
      setError(errorMessage);
    } finally {
      setCreatingPago(false);
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

  const totalPagos = pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0);
  const pagosHoy = pagos.filter(p => new Date(p.fecha_pago).toDateString() === new Date().toDateString());

  return (
    <div className="container my-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold text-dark">💵 Gestión de Pagos</h1>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={() => setShowModal(true)}
          >
            ➕ Registrar Pago
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

      {/* Estadísticas */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-primary">{pagos.length}</h5>
              <p className="card-text small">Total Pagos</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-success">
                {formatCurrency(totalPagos)}
              </h5>
              <p className="card-text small">Total Recaudado</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-warning">{pagosHoy.length}</h5>
              <p className="card-text small">Pagos Hoy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de pagos */}
      {pagos.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="fas fa-money-bill-wave text-muted" style={{ fontSize: '4rem' }}></i>
          </div>
          <h4 className="text-muted">No hay pagos registrados</h4>
          <p className="text-muted">Comienza registrando el primer pago</p>
          <button
            className="btn btn-success"
            onClick={() => setShowModal(true)}
          >
            ➕ Registrar Primer Pago
          </button>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <h5 className="mb-0">Historial de Pagos</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>ID</th>
                    <th>Préstamo</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Fecha</th>
                    <th>Notas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => {
                    const prestamoInfo = getPrestamoInfo(pago.prestamo_id);
                    return (
                      <tr key={pago.id}>
                        <td>
                          <span className="fw-bold text-primary">#{pago.id}</span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-semibold">{prestamoInfo.info}</div>
                            <small className="text-muted">ID: {pago.prestamo_id}</small>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold">{prestamoInfo.cliente}</span>
                        </td>
                        <td>
                          <span className="fw-bold text-success">{formatCurrency(pago.monto)}</span>
                        </td>
                        <td>
                          <span className={getMetodoPagoClass(pago.metodo_pago)}>
                            {pago.metodo_pago}
                          </span>
                        </td>
                        <td>{formatDate(pago.fecha_pago)}</td>
                        <td>
                          <span className="text-muted small">
                            {pago.notas || 'Sin notas'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-outline-primary btn-sm"
                            title="Ver detalles"
                            onClick={() => {
                              console.log('Ver detalles de pago:', pago.id);
                            }}
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal para registrar pago */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-backdrop fade show"></div>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">💵 Registrar Nuevo Pago</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreatePago}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="prestamo_id" className="form-label">Préstamo *</label>
                    <select
                      className="form-select"
                      id="prestamo_id"
                      name="prestamo_id"
                      value={formData.prestamo_id}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Seleccionar préstamo...</option>
                      {prestamos.map(prestamo => {
                        const cliente = clientes.find(c => c.id === prestamo.cliente_id);
                        return (
                          <option key={prestamo.id} value={prestamo.id}>
                            Préstamo #{prestamo.id} - {cliente?.nombre} - Saldo: ${prestamo.saldo_pendiente}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="monto" className="form-label">Monto *</label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <input
                        type="number"
                        className="form-control"
                        id="monto"
                        name="monto"
                        value={formData.monto}
                        onChange={handleFormChange}
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        autoComplete="off"
                      />
                      <span className="input-group-text">ARS</span>
                    </div>
                    <div className="form-text">Ingrese el monto en pesos argentinos</div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="metodo_pago" className="form-label">Método de Pago *</label>
                    <select
                      className="form-select"
                      id="metodo_pago"
                      name="metodo_pago"
                      value={formData.metodo_pago}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="efectivo">💵 Efectivo</option>
                      <option value="transferencia">🏦 Transferencia</option>
                      <option value="cheque">📝 Cheque</option>
                      <option value="tarjeta">💳 Tarjeta</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="notas" className="form-label">Notas</label>
                    <textarea
                      className="form-control"
                      id="notas"
                      name="notas"
                      value={formData.notas}
                      onChange={handleFormChange}
                      rows="3"
                      placeholder="Información adicional sobre el pago..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={creatingPago}
                  >
                    {creatingPago ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Registrando...
                      </>
                    ) : (
                      '💾 Registrar Pago'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
