import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCliente } from "../api/clientes";
import { fetchPrestamosByCliente } from "../api/prestamos";
import { fetchPagosByPrestamo } from "../api/pagos";

const PerfilCliente = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [cliente, setCliente] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prestamoExpandido, setPrestamoExpandido] = useState(null);
  const [pagos, setPagos] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [clienteData, prestamosData] = await Promise.all([
          fetchCliente(id),
          fetchPrestamosByCliente(id)
        ]);
        setCliente(clienteData);
        setPrestamos(prestamosData);
      } catch (err) {
        setError(err.message);
        console.error("Error al cargar datos:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  const togglePrestamo = async (prestamoId) => {
    if (prestamoExpandido === prestamoId) {
      setPrestamoExpandido(null);
    } else {
      setPrestamoExpandido(prestamoId);
      if (!pagos[prestamoId]) {
        try {
          const pagosData = await fetchPagosByPrestamo(prestamoId);
          setPagos(prev => ({ ...prev, [prestamoId]: pagosData }));
        } catch (err) {
          console.error("Error al cargar pagos:", err);
        }
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      activo: { bg: '#10b981', text: 'Activo' },
      pagado: { bg: '#3b82f6', text: 'Pagado' },
      vencido: { bg: '#ef4444', text: 'Vencido' }
    };
    const badge = badges[estado] || badges.activo;
    return (
      <span className="badge px-3 py-2" style={{ backgroundColor: badge.bg }}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container my-5">
        <div className="text-center my-5">
          <div className="spinner-border" style={{ color: '#10b981' }} role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error || "Cliente no encontrado"}
        </div>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/clientes')}
        >
          ← Volver a Clientes
        </button>
      </div>
    );
  }

  return (
    <div className="container my-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold mb-0" style={{ color: '#10b981' }}>
          Perfil del Cliente
        </h1>
        <button
          className="btn fw-semibold"
          style={{ borderColor: '#10b981', color: '#10b981' }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = '#10b981'; e.target.style.color = 'white'; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#10b981'; }}
          onClick={() => navigate('/clientes')}
        >
          ← Volver a Clientes
        </button>
      </div>

      {/* Datos Personales */}
      <div className="card shadow-sm mb-4" style={{ borderColor: '#10b981' }}>
        <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#10b981', color: 'white' }}>
          <h4 className="mb-0">Datos Personales</h4>
          <button
            className="btn btn-light btn-sm"
            onClick={() => setModoEdicion(!modoEdicion)}
          >
            {modoEdicion ? '✕ Cancelar' : ' Editar'}
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="d-flex align-items-center mb-4">
                <div
                  className="rounded-circle fw-bold fs-1 d-flex align-items-center justify-content-center me-3"
                  style={{ width: "80px", height: "80px", backgroundColor: '#10b98140', color: '#10b981' }}
                >
                  {cliente.nombre[0]}
                </div>
                <div>
                  <h3 className="mb-0">{cliente.nombre}</h3>
                  <small className="text-muted">ID: {cliente.id}</small>
                </div>
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="text-muted small">DNI</label>
              <p className="fs-5 mb-0">{cliente.dni || 'No registrado'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="text-muted small">Teléfono</label>
              <p className="fs-5 mb-0">{cliente.telefono}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="text-muted small">Email</label>
              <p className="fs-5 mb-0">{cliente.email || 'No registrado'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="text-muted small">Fecha de registro</label>
              <p className="fs-5 mb-0">{formatDate(cliente.created_at)}</p>
            </div>
            <div className="col-md-12 mb-3">
              <label className="text-muted small">Dirección</label>
              <p className="fs-5 mb-0">{cliente.direccion || 'No registrada'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Préstamos */}
      <div className="card shadow-sm" style={{ borderColor: '#10b981' }}>
        <div className="card-header" style={{ backgroundColor: '#10b981', color: 'white' }}>
          <h4 className="mb-0">Historial de Préstamos ({prestamos.length})</h4>
        </div>
        <div className="card-body">
          {prestamos.length === 0 ? (
            <p className="text-muted text-center py-4">No hay préstamos registrados</p>
          ) : (
            <div className="accordion" id="accordionPrestamos">
              {prestamos.map((prestamo, index) => (
                <div className="accordion-item mb-2" key={prestamo.id}>
                  <h2 className="accordion-header">
                    <button
                      className={`accordion-button ${prestamoExpandido === prestamo.id ? '' : 'collapsed'}`}
                      type="button"
                      onClick={() => togglePrestamo(prestamo.id)}
                      style={{ backgroundColor: prestamoExpandido === prestamo.id ? '#f0fdf4' : 'white' }}
                    >
                      <div className="d-flex justify-content-between align-items-center w-100 me-3">
                        <div>
                          <strong>Préstamo #{prestamo.id}</strong>
                          <span className="ms-3 text-muted">
                            {formatDate(prestamo.fecha_inicio)}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <span className="fw-bold">{formatCurrency(prestamo.monto)}</span>
                          {getEstadoBadge(prestamo.estado)}
                        </div>
                      </div>
                    </button>
                  </h2>
                  <div
                    className={`accordion-collapse collapse ${prestamoExpandido === prestamo.id ? 'show' : ''}`}
                  >
                    <div className="accordion-body">
                      <div className="row mb-3">
                        <div className="col-md-4">
                          <label className="text-muted small">Monto Prestado</label>
                          <p className="fs-5 fw-bold text-success mb-0">
                            {formatCurrency(prestamo.monto)}
                          </p>
                        </div>
                        <div className="col-md-4">
                          <label className="text-muted small">Tasa de Interés</label>
                          <p className="fs-5 mb-0">{prestamo.tasa_interes}%</p>
                        </div>
                        <div className="col-md-4">
                          <label className="text-muted small">Total a Pagar</label>
                          <p className="fs-5 fw-bold mb-0">
                            {formatCurrency(prestamo.monto_total)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="row mb-3">
                        <div className="col-md-4">
                          <label className="text-muted small">Saldo Pendiente</label>
                          <p className="fs-5 fw-bold text-danger mb-0">
                            {formatCurrency(prestamo.saldo_pendiente)}
                          </p>
                        </div>
                        <div className="col-md-4">
                          <label className="text-muted small">Plazo</label>
                          <p className="fs-5 mb-0">{prestamo.plazo_dias} días</p>
                        </div>
                        <div className="col-md-4">
                          <label className="text-muted small">Fecha de Vencimiento</label>
                          <p className="fs-5 mb-0">{formatDate(prestamo.fecha_vencimiento)}</p>
                        </div>
                      </div>

                      {/* Pagos del préstamo */}
                      {pagos[prestamo.id] && pagos[prestamo.id].length > 0 && (
                        <div className="mt-4">
                          <h6 className="fw-bold mb-3">Pagos Realizados ({pagos[prestamo.id].length})</h6>
                          <div className="table-responsive">
                            <table className="table table-sm table-hover">
                              <thead>
                                <tr>
                                  <th>Fecha</th>
                                  <th>Monto</th>
                                  <th>Método</th>
                                  <th>Notas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pagos[prestamo.id].map(pago => (
                                  <tr key={pago.id}>
                                    <td>{formatDate(pago.fecha_pago)}</td>
                                    <td className="fw-bold text-success">
                                      {formatCurrency(pago.monto)}
                                    </td>
                                    <td>{pago.metodo_pago || '-'}</td>
                                    <td>{pago.notas || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerfilCliente;
