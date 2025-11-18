import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPrestamos, refinanciarPrestamo, fetchAmortizacion, fetchPrestamoVendedor } from '../api/prestamos';
import { fetchCliente } from '../api/clientes';
import { fetchPagosByPrestamo } from '../api/pagos';
import { exportPrestamoPDF, exportContratoPrestamoFormatoPDF } from '../utils/pdfExport';
import '../styles/DetallePrestamo.css';

export default function DetallePrestamo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prestamo, setPrestamo] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [amortizacion, setAmortizacion] = useState([]);
  const [vendedor, setVendedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRefi, setShowRefi] = useState(false);
  const [submittingRefi, setSubmittingRefi] = useState(false);
  const [refiForm, setRefiForm] = useState({
    interes_adicional: 10,
    cuotas: 8,
    frecuencia_pago: 'semanal',
    fecha_inicio: new Date().toISOString().split('T')[0]
  });

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

        // Cargar datos del cliente, pagos y amortización
        const [clienteData, pagosData, amortizacionData] = await Promise.all([
          fetchCliente(prestamoEncontrado.cliente_id),
          fetchPagosByPrestamo(id),
          fetchAmortizacion(id)
        ]);

        setCliente(clienteData);
        setPagos(pagosData || []);
        setAmortizacion(amortizacionData || []);

        // Cargar comisión de vendedor (si existe) + datos completos del empleado
        try {
          const vend = await fetchPrestamoVendedor(id);
          if (vend && vend.empleado_id) {
            // Cargar datos completos del empleado
            const { fetchEmpleado } = await import('../api/empleados');
            const empleadoCompleto = await fetchEmpleado(vend.empleado_id);
            setVendedor({ ...vend, ...empleadoCompleto }); // fusionar comisión + datos personales
          } else if (vend) {
            setVendedor(vend);
          }
        } catch (e) {
          // 404 u otro error: no hay comisión de vendedor, continuar
        }
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
    // Extraer solo la parte de fecha (YYYY-MM-DD) para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
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
    if (prestamo?.cuotas_pagadas && prestamo.cuotas_pagadas > 0) return prestamo.cuotas_pagadas;
    return pagos.length;
  };

  const getEstadoInfo = () => {
    if (!prestamo) return { texto: 'Desconocido', color: 'text-secondary' };
    const estado = (prestamo.estado || '').toLowerCase();
    switch (estado) {
      case 'pagado':
        return { texto: 'Pagado', color: 'text-success' };
      case 'impago':
        return { texto: 'Impago', color: 'text-danger' };
      case 'refinanciado':
        return { texto: 'Refinanciado', color: 'text-info' };
      case 'activo':
        return { texto: 'Activo', color: 'text-dark' };
      case 'vencido':
        return { texto: 'Vencido', color: 'text-danger' };
      default:
        // Fallback heurístico
        const hoy = new Date();
        const vencimiento = new Date(prestamo.fecha_vencimiento);
        if (prestamo.saldo_pendiente <= 0) return { texto: 'Pagado', color: 'text-success' };
        if (vencimiento < hoy) return { texto: 'Vencido', color: 'text-danger' };
        return { texto: 'Activo', color: 'text-dark' };
    }
  };

  const handleChangeRefi = (e) => {
    const { name, value } = e.target;
    setRefiForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRefinanciar = async (e) => {
    e.preventDefault();
    if (!prestamo) return;
    try {
      setSubmittingRefi(true);
      const payload = {
        interes_adicional: parseFloat(refiForm.interes_adicional),
        cuotas: parseInt(refiForm.cuotas),
        frecuencia_pago: refiForm.frecuencia_pago,
        fecha_inicio: refiForm.fecha_inicio
      };
      const nuevo = await refinanciarPrestamo(prestamo.id, payload);
      setShowRefi(false);
      // Ir al nuevo préstamo creado si vino en respuesta, si no, volver al listado
      if (nuevo?.id) {
        navigate(`/prestamos/${nuevo.id}`);
      } else {
        navigate('/prestamos');
      }
    } catch (err) {
      console.error('Error al refinanciar:', err);
    } finally {
      setSubmittingRefi(false);
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
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success" 
            onClick={() => exportPrestamoPDF(prestamo, cliente, pagos, amortizacion, vendedor)}
          >
            <i className="fas fa-file-pdf me-2"></i>Exportar PDF
          </button>
          <button 
            className="btn btn-outline-primary" 
            onClick={async () => {
              // Obtener datos del admin si es necesario
              let adminData = null;
              if (!vendedor) {
                try {
                  const { getCurrentUser } = await import('../api/auth');
                  adminData = await getCurrentUser();
                } catch (e) {
                  console.warn('No se pudo cargar datos del admin');
                }
              }
              exportContratoPrestamoFormatoPDF({ prestamo, cliente, vendedor, adminData, lugar: '', fecha: new Date() });
            }}
          >
            Contrato (formato)
          </button>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/prestamos')}>
            ← Volver a Préstamos
          </button>
        </div>
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
            <p className="info-value">{formatDate(prestamo.fecha_inicio)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Vencimiento:</label>
            <p className="info-value">{formatDate(prestamo.fecha_vencimiento)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Monto:</label>
            <p className="info-value">{formatCurrency(prestamo.monto)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Tasa de Interés:</label>
            <p className="info-value">{prestamo.tasa_interes}%</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Intereses:</label>
            <p className="info-value">{formatCurrency(calcularIntereses())}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Total:</label>
            <p className="info-value">{formatCurrency(prestamo.monto_total)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Frecuencia de Pago:</label>
            <p className="info-value text-capitalize">{prestamo.frecuencia_pago || 'Semanal'}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Cantidad de Cuotas:</label>
            <p className="info-value">
              {prestamo.cuotas_totales && prestamo.cuotas_totales > 0
                ? prestamo.cuotas_totales
                : (prestamo.frecuencia_pago === 'semanal'
                    ? Math.ceil(prestamo.plazo_dias / 7)
                    : Math.ceil(prestamo.plazo_dias / 30))}
            </p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Valor de Cuota:</label>
            <p className="info-value">{formatCurrency(prestamo.valor_cuota && prestamo.valor_cuota > 0 ? prestamo.valor_cuota : calcularValorCuota())}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Cuotas Pagadas:</label>
            <p className="info-value">{calcularCuotasPagadas()}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Saldo:</label>
            <p className="info-value">{formatCurrency(prestamo.saldo_pendiente)}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="info-card">
            <label className="info-label">Estatus:</label>
            <p className={`info-value ${estadoInfo.color}`}>{estadoInfo.texto}</p>
          </div>
        </div>
      </div>

      {/* Comisión del Vendedor */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Comisión del Vendedor</h5>
          {vendedor && (
            <span className="badge bg-light text-success">
              {vendedor.porcentaje}% sobre {vendedor.base_tipo === 'interes' ? 'interés' : 'total'}
            </span>
          )}
        </div>
        <div className="card-body">
          {!vendedor ? (
            <div className="text-muted">No hay comisión de vendedor registrada para este préstamo.</div>
          ) : (
            <div className="row g-3">
              <div className="col-md-4">
                <div className="info-card">
                  <label className="info-label">Vendedor</label>
                  <p className="info-value">{vendedor.empleado_nombre || `ID ${vendedor.empleado_id}`}</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="info-card">
                  <label className="info-label">Base</label>
                  <p className="info-value text-capitalize">{vendedor.base_tipo}</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="info-card">
                  <label className="info-label">Porcentaje</label>
                  <p className="info-value">{vendedor.porcentaje}%</p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="info-card">
                  <label className="info-label">Monto Base</label>
                  <p className="info-value">{formatCurrency(vendedor.monto_base)}</p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="info-card">
                  <label className="info-label">Comisión</label>
                  <p className="info-value text-success fw-bold">{formatCurrency(vendedor.monto_comision)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Banner de impago y acción de refinanciación */}
      {prestamo.estado?.toLowerCase() === 'impago' && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <div>
            <strong>Préstamo impago:</strong> finalizó cuotas con deuda de {formatCurrency(prestamo.saldo_pendiente)}.
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setShowRefi(true)}>
            <i className="fas fa-sync-alt me-2"></i>
            Refinanciar
          </button>
        </div>
      )}

      {/* Historial de pagos */}
      {/* Amortización del préstamo */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">Amortización del Préstamo</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {amortizacion.map((fila) => (
                  <tr key={fila.numero}>
                    <td>{fila.numero}</td>
                    <td>{formatDate(fila.fecha)}</td>
                    <td>{formatCurrency(fila.monto)}</td>
                    <td className={
                      fila.estado === 'Pagado' ? 'text-success' :
                      fila.estado === 'Vencido' ? 'text-danger' : 'text-dark'
                    }>
                      {fila.estado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="small text-muted">
            La fecha mostrada es la esperada; si no se pagó y ya pasó, se marca como <strong>Vencido</strong>.
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

      {/* Modal de Refinanciación */}
      {showRefi && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setShowRefi(false)}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Refinanciar Préstamo</h5>
                  <button type="button" className="btn-close" onClick={() => setShowRefi(false)} aria-label="Close"></button>
                </div>
                <form onSubmit={handleRefinanciar}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Saldo a Refinanciar</label>
                      <div className="alert alert-info mb-0"><strong>{formatCurrency(prestamo.saldo_pendiente)}</strong></div>
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Interés adicional (%)</label>
                        <input type="number" name="interes_adicional" className="form-control" step="0.01" min="0" value={refiForm.interes_adicional} onChange={handleChangeRefi} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Cuotas</label>
                        <input type="number" name="cuotas" className="form-control" min="1" value={refiForm.cuotas} onChange={handleChangeRefi} required />
                      </div>
                    </div>
                    <div className="row g-3 mt-1">
                      <div className="col-md-6">
                        <label className="form-label">Frecuencia</label>
                        <select name="frecuencia_pago" className="form-select" value={refiForm.frecuencia_pago} onChange={handleChangeRefi}>
                          <option value="semanal">Semanal</option>
                          <option value="mensual">Mensual</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Fecha de inicio</label>
                        <input type="date" name="fecha_inicio" className="form-control" value={refiForm.fecha_inicio} onChange={handleChangeRefi} />
                      </div>
                    </div>
                    <div className="mt-3 small text-muted">
                      El capital refinanciado será: saldo × (1 + interés). Se crearán las cuotas con el nuevo valor.
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowRefi(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={submittingRefi}>
                      {submittingRefi ? 'Procesando...' : 'Crear Préstamo Refinanciado'}
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
