import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCliente, updateCliente } from "../api/clientes";
import { fetchPrestamosByCliente } from "../api/prestamos";
import { fetchPagosByPrestamo } from "../api/pagos";
import "../styles/PerfilCliente.css";

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
  const [formData, setFormData] = useState({ nombre: "", dni: "", telefono: "", email: "", direccion: "" });
  const [saving, setSaving] = useState(false);

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
    if (!dateString) return 'N/A';
    // Extraer solo la parte de fecha (YYYY-MM-DD) para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-AR');
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

  const startEdit = () => {
    if (!cliente) return;
    setFormData({
      nombre: cliente.nombre || "",
      dni: cliente.dni || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
    });
    setModoEdicion(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await updateCliente(cliente.id, formData);
      setCliente(updated);
      setModoEdicion(false);
    } catch (err) {
      console.error("Error al actualizar cliente:", err);
      alert(err.message || "No se pudo actualizar el cliente");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container my-5">
        <div className="text-center my-5">
          <div className="spinner-border perfil-spinner" role="status">
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
        <h1 className="fw-bold mb-0 perfil-title">
          Perfil del Cliente
        </h1>
        <button
          className="btn fw-semibold perfil-back-button"
          onClick={() => navigate('/clientes')}
        >
          ← Volver a Clientes
        </button>
      </div>

      {/* Datos Personales */}
      <div className="card shadow-sm mb-4 perfil-card">
        <div className="card-header d-flex justify-content-between align-items-center perfil-card-header">
          <h4 className="mb-0">Datos Personales</h4>
          <button
            className="btn btn-light btn-sm"
            onClick={() => (modoEdicion ? setModoEdicion(false) : startEdit())}
          >
            {modoEdicion ? '✕ Cancelar' : ' Editar'}
          </button>
        </div>
        <div className="card-body">
          {modoEdicion ? (
            <form onSubmit={handleSave}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="d-flex align-items-center mb-4">
                    <div className="rounded-circle fw-bold fs-1 d-flex align-items-center justify-content-center me-3 perfil-avatar">
                      {formData.nombre?.[0] || cliente.nombre[0]}
                    </div>
                    <div>
                      <h3 className="mb-0">Editar datos</h3>
                      <small className="text-muted">ID: {cliente.id}</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" name="nombre" value={formData.nombre} onChange={handleChange} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">DNI</label>
                  <input className="form-control" name="dni" value={formData.dni} onChange={handleChange} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Teléfono</label>
                  <input className="form-control" name="telefono" value={formData.telefono} onChange={handleChange} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label">Dirección</label>
                  <input className="form-control" name="direccion" value={formData.direccion} onChange={handleChange} />
                </div>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn perfil-save-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setModoEdicion(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="d-flex align-items-center mb-4">
                    <div className="rounded-circle fw-bold fs-1 d-flex align-items-center justify-content-center me-3 perfil-avatar">
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
            </>
          )}
        </div>
      </div>

      {/* Historial de Préstamos */}
      <div className="card shadow-sm perfil-card">
        <div className="card-header perfil-card-header">
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
                        <div className="col-md-3">
                          <label className="text-muted small">Saldo Pendiente</label>
                          <p className="fs-5 fw-bold text-danger mb-0">
                            {formatCurrency(prestamo.saldo_pendiente)}
                          </p>
                        </div>
                        <div className="col-md-3">
                          <label className="text-muted small">Plazo</label>
                          <p className="fs-5 mb-0">{prestamo.plazo_dias} días</p>
                        </div>
                        <div className="col-md-3">
                          <label className="text-muted small">Frecuencia de Pago</label>
                          <p className="fs-5 mb-0 text-capitalize">{prestamo.frecuencia_pago || 'semanal'}</p>
                        </div>
                        <div className="col-md-3">
                          <label className="text-muted small">Fecha de Vencimiento</label>
                          <p className="fs-5 mb-0">{formatDate(prestamo.fecha_vencimiento)}</p>
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-4">
                          <label className="text-muted small">Fecha de Creación</label>
                          <p className="fs-5 mb-0">{formatDate(prestamo.created_at)}</p>
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
