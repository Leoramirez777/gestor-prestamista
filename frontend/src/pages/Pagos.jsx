import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchPagos, createPago, previewPagoCobrador } from '../api/pagos';
import { fetchPrestamos } from '../api/prestamos';
import { fetchClientes } from '../api/clientes';
import { fetchEmpleados } from '../api/empleados';
import { exportPagoPDF, exportReciboPagoFormatoPDF } from '../utils/pdfExport';
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
    tipo_pago: 'cuota',
    monto: '',
    metodo_pago: 'efectivo',
    notas: ''
  });
  const [creatingPago, setCreatingPago] = useState(false);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [cobradorHabilitado, setCobradorHabilitado] = useState(false);
  const [cobradorId, setCobradorId] = useState('');
  const [porcentajeCobrador, setPorcentajeCobrador] = useState('');
  const [previewComision, setPreviewComision] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar todos los datos en paralelo
        let [pagosData, prestamosData, clientesData, empleadosData] = await Promise.all([
          fetchPagos(),
          fetchPrestamos(),
          fetchClientes(),
          fetchEmpleados({ puesto: 'Cobrador' })
        ]);

        // Fallback: si no hay cobradores, cargar todos los empleados
        if (!empleadosData || empleadosData.length === 0) {
          empleadosData = await fetchEmpleados();
        }
        
        setPagos(pagosData || []);
        setPrestamos(prestamosData || []);
        setClientes(clientesData || []);
        setEmpleados(empleadosData || []);
        
        console.log('Préstamos cargados:', prestamosData);
        console.log('Location state:', location.state);
        
        // Si viene con parámetro nuevo=true en la URL, abrir modal
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('nuevo') === 'true') {
          setShowModal(true);
        }
        
        // Si viene desde préstamos con un préstamo específico
        if (location.state?.prestamoId) {
          console.log('Abriendo modal con préstamo ID:', location.state.prestamoId);
          setFormData(prev => ({ 
            ...prev, 
            prestamo_id: String(location.state.prestamoId) 
          }));
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
  }, [location.state, location.search]);

  // Refrescar lista de cobradores cada vez que se abre el modal
  useEffect(() => {
    const refreshCobradores = async () => {
      try {
        if (showModal) {
          let data = await fetchEmpleados({ puesto: 'Cobrador' });
          if (!data || data.length === 0) {
            data = await fetchEmpleados();
          }
          setEmpleados(data || []);
        }
      } catch (e) {
        console.error('No se pudieron cargar cobradores:', e);
      }
    };
    refreshCobradores();
  }, [showModal]);

  // Preview de comisión calculado por el backend
  useEffect(() => {
    const run = async () => {
      try {
        if (!showModal || !cobradorHabilitado) { setPreviewComision(null); setPreviewError(null); return; }
        const monto = parseFloat(formData.monto || '0');
        const porc = parseFloat(porcentajeCobrador || '0');
        if (isNaN(monto) || monto <= 0 || isNaN(porc) || porc <= 0) { setPreviewComision(null); setPreviewError(null); return; }
        const res = await previewPagoCobrador({ monto, porcentaje: porc });
        setPreviewComision(res?.monto_comision ?? null);
        setPreviewError(null);
      } catch (e) {
        setPreviewComision(null);
        setPreviewError('No se pudo calcular la comisión (servidor no disponible)');
      }
    };
    run();
  }, [showModal, cobradorHabilitado, formData.monto, porcentajeCobrador]);

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
    // Extraer solo la parte de fecha (YYYY-MM-DD) para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
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
    
    if (name === 'prestamo_id') {
      const prestamo = prestamos.find(p => p.id === parseInt(value));
      setPrestamoSeleccionado(prestamo || null);
      
      // Calcular el monto de la cuota actual (valor_cuota + saldo_cuota)
      const montoCuotaActual = prestamo ? 
        ((prestamo.valor_cuota || 0) + (prestamo.saldo_cuota || 0)).toFixed(2) : '';
      
      // Resetear tipo y monto al cambiar préstamo
      setFormData(prev => ({ 
        ...prev, 
        prestamo_id: value,
        tipo_pago: 'cuota',
        monto: montoCuotaActual
      }));
    } else if (name === 'tipo_pago') {
      let nuevoMonto = '';
      if (prestamoSeleccionado) {
        if (value === 'cuota') {
          // Monto de la cuota actual (valor_cuota + saldo_cuota)
          const montoCuotaActual = (prestamoSeleccionado.valor_cuota || 0) + (prestamoSeleccionado.saldo_cuota || 0);
          nuevoMonto = montoCuotaActual.toFixed(2);
        } else if (value === 'total') {
          // Saldo pendiente total
          nuevoMonto = (prestamoSeleccionado.saldo_pendiente || 0).toFixed(2);
        }
        // Si es 'parcial', dejar vacío para que el usuario ingrese
      }
      setFormData(prev => ({ ...prev, tipo_pago: value, monto: nuevoMonto }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreatePago = async (e) => {
    e.preventDefault();
    setCreatingPago(true);
    setError(null);

    try {
      // Validaciones del lado del cliente
      if (!formData.prestamo_id) {
        throw new Error('Por favor seleccione un préstamo');
      }

      if (formData.tipo_pago === 'parcial' && (!formData.monto || parseFloat(formData.monto) <= 0)) {
        throw new Error('El monto debe ser mayor a cero');
      }

      // Construir notas: primero tipo de pago, luego notas adicionales
      const tiposPago = {
        'cuota': 'Pago de Cuota',
        'parcial': 'Pago Parcial',
        'total': 'Pago Total del Saldo'
      };
      
      let notasFinales = tiposPago[formData.tipo_pago] || 'Pago';
      if (formData.notas && formData.notas.trim()) {
        notasFinales += '. ' + formData.notas.trim();
      }

      const pagoData = {
        prestamo_id: parseInt(formData.prestamo_id),
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        tipo_pago: formData.tipo_pago,
        notas: notasFinales,
        fecha_pago: new Date().toISOString().split('T')[0]
      };

      // Adjuntar cobrador si está habilitado
      if (cobradorHabilitado && porcentajeCobrador) {
        pagoData.porcentaje_cobrador = parseFloat(porcentajeCobrador);
        if (cobradorId) {
          pagoData.cobrador_id = parseInt(cobradorId);
        }
      }

      console.log('Enviando datos del pago:', pagoData);

      const nuevoPago = await createPago(pagoData);
      console.log('Pago creado exitosamente:', nuevoPago);
      
      // Recargar datos
      const [pagosData, prestamosData] = await Promise.all([
        fetchPagos(),
        fetchPrestamos()
      ]);
      setPagos(pagosData || []);
      setPrestamos(prestamosData || []);
      
      // Mostrar mensaje de éxito
      alert('¡Pago registrado exitosamente!');
      
      // Limpiar formulario y cerrar modal
      setFormData({
        prestamo_id: '',
        tipo_pago: 'cuota',
        monto: '',
        metodo_pago: 'efectivo',
        notas: ''
      });
      setPrestamoSeleccionado(null);
      setShowModal(false);
      setCobradorHabilitado(false);
      setCobradorId('');
      setPorcentajeCobrador('');
      
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
  const pagosOrdenados = [...pagos].sort((a,b) => b.id - a.id);
  const ultimoIdPago = pagosOrdenados.length ? pagosOrdenados[0].id : null;

  return (
    <div className="container my-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold text-dark">Gestión de Pagos</h1>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={() => setShowModal(true)}
          >
            Registrar Pago
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
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-primary">{pagos.length}</h5>
              <p className="card-text small">Total Pagos</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-success">
                {formatCurrency(totalPagos)}
              </h5>
              <p className="card-text small">Total Recaudado</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-warning">{pagosHoy.length}</h5>
              <p className="card-text small">Pagos Hoy</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0 bg-light">
            <div className="card-body">
              <h5 className="card-title text-dark">{ultimoIdPago ? `#${ultimoIdPago}` : '-'}</h5>
              <p className="card-text small">ID más reciente</p>
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
            Registrar Primer Pago
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
                  {pagosOrdenados.map((pago) => {
                    const prestamo = prestamos.find(p => p.id === pago.prestamo_id);
                    const cliente = prestamo ? clientes.find(c => c.id === prestamo.cliente_id) : null;
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
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              title="Recibo detallado"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/pagos/${pago.id}/cobrador`);
                                  const cobrador = res.ok ? await res.json() : null;
                                  await exportPagoPDF({ pago, cliente, prestamo, cobrador });
                                } catch (e) {
                                  console.error('Error exportando PDF del pago', e);
                                  alert('No se pudo generar el PDF del pago');
                                }
                              }}
                            >
                              PDF
                            </button>
                            <button
                              className="btn btn-sm btn-outline-success"
                              title="Recibo clásico (formato)"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/pagos/${pago.id}/cobrador`);
                                  const cobrador = res.ok ? await res.json() : null;
                                  await exportReciboPagoFormatoPDF({ pago, cliente, prestamo, cobrador, metodo: pago.metodo_pago || 'efectivo' });
                                } catch (e) {
                                  console.error('Error exportando Recibo formato', e);
                                  alert('No se pudo generar el Recibo en PDF');
                                }
                              }}
                            >
                              Recibo
                            </button>
                          </div>
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
        <>
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Registrar Nuevo Pago</h5>
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
                      autoFocus
                    >
                      <option value="">Seleccionar préstamo...</option>
                      {prestamos.map(prestamo => {
                        const cliente = clientes.find(c => c.id === prestamo.cliente_id);
                        const saldoPendiente = Number(prestamo.saldo_pendiente) || 0;
                        const estado = (prestamo.estado || '').toLowerCase();
                        // Solo mostrar préstamos activos o impago con saldo pendiente
                        if (saldoPendiente <= 0 || estado === 'refinanciado' || estado === 'pagado') return null;
                        
                        return (
                          <option key={prestamo.id} value={prestamo.id}>
                            Préstamo #{prestamo.id} - {cliente?.nombre || 'Sin cliente'} - Saldo: {formatCurrency(prestamo.saldo_pendiente)}
                          </option>
                        );
                      })}
                    </select>
                    {prestamos.filter(p => Number(p.saldo_pendiente) > 0).length === 0 && (
                      <div className="form-text text-danger">
                        No hay préstamos activos con saldo pendiente
                      </div>
                    )}
                  </div>

                  {prestamoSeleccionado && (
                    <>
                      <div className="mb-3">
                        <label htmlFor="tipo_pago" className="form-label">Tipo de Pago *</label>
                        <select
                          className="form-select"
                          id="tipo_pago"
                          name="tipo_pago"
                          value={formData.tipo_pago}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="cuota">Pago de Cuota</option>
                          <option value="parcial">Pago Parcial</option>
                          <option value="total">Pago Total del Saldo</option>
                        </select>
                        {formData.tipo_pago === 'cuota' && (
                          <div className="mt-2">
                            <div className="alert alert-light border mb-2 py-2">
                              <small className="text-muted d-block mb-1">Valor de Cuota Establecida:</small>
                              <strong className="text-dark">{formatCurrency(prestamoSeleccionado.valor_cuota || 0)}</strong>
                            </div>
                            {prestamoSeleccionado.saldo_cuota !== 0 && (
                              <div className={`alert ${(prestamoSeleccionado.saldo_cuota || 0) > 0 ? 'alert-danger' : 'alert-success'} border mb-0 py-2`}>
                                <small className="text-muted d-block mb-1">
                                  {(prestamoSeleccionado.saldo_cuota || 0) > 0 ? 'Saldo Negativo:' : 'Saldo Positivo:'}
                                </small>
                                <strong>{formatCurrency(Math.abs(prestamoSeleccionado.saldo_cuota || 0))}</strong>
                              </div>
                            )}
                          </div>
                        )}
                        {formData.tipo_pago === 'total' && (
                          <div className="form-text">
                            Saldo total: {formatCurrency(prestamoSeleccionado.saldo_pendiente || 0)}
                          </div>
                        )}
                        {formData.tipo_pago === 'parcial' && (
                          <div className="form-text">
                            Ingrese el monto que desea pagar
                          </div>
                        )}
                      </div>

                      {formData.tipo_pago === 'parcial' && (
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
                      )}

                      {formData.tipo_pago !== 'parcial' && (
                        <div className="mb-3">
                          <label className="form-label">Monto a Pagar</label>
                          <div className="alert alert-info mb-0">
                            <strong>{formatCurrency(parseFloat(formData.monto) || 0)}</strong>
                          </div>
                        </div>
                      )}
                    </>
                  )}

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
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>

                  {/* Cobrador */}
                  <div className="mb-3">
                    <label className="form-label">Cobrador</label>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="cobrador_switch"
                        checked={cobradorHabilitado}
                        onChange={(e) => setCobradorHabilitado(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="cobrador_switch">
                        {cobradorHabilitado ? 'Sí' : 'No'}
                      </label>
                    </div>
                  </div>

                  {cobradorHabilitado && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Seleccionar Cobrador</label>
                        <select
                          className="form-select"
                          value={cobradorId}
                          onChange={(e) => setCobradorId(e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {empleados.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                          ))}
                        </select>
                        {empleados.length === 0 && (
                          <div className="form-text">No hay cobradores cargados en el sistema</div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Porcentaje sobre este pago</label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0.00"
                            value={porcentajeCobrador}
                            onChange={(e) => setPorcentajeCobrador(e.target.value)}
                          />
                          <span className="input-group-text">%</span>
                        </div>
                        <div className="form-text">Se calcula sobre el monto del pago, no del préstamo.</div>
                        {previewError && (
                          <div className="alert alert-danger mt-2 py-2 mb-0">
                            <small>{previewError}</small>
                          </div>
                        )}
                        {previewComision != null && !previewError && (
                          <div className="alert alert-light border mt-2 py-2 mb-0">
                            <small className="text-muted d-block">El pago al cobrador es:</small>
                            <strong className="text-dark">{formatCurrency(previewComision)}</strong>
                          </div>
                        )}
                      </div>
                    </>
                  )}

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
                      ' Registrar Pago'
                    )}
                  </button>
                </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
