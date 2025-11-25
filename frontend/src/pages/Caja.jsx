import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCierreCaja, fetchMovimientosCaja, crearMovimientoCaja, cerrarDia, abrirDia, fetchCajaEmpleadoResumen, crearMovimientoCajaEmpleado, cerrarDiaEmpleado, abrirDiaEmpleado, fetchMovimientosCajaEmpleado } from '../api/caja';
import { fetchPagos, fetchPagoVendedor } from '../api/pagos';
import formatCurrency from '../utils/formatCurrency';
import useSettingsStore from '../stores/useSettingsStore';

function Caja() {
  const navigate = useNavigate();
  // Obtener fecha local sin problemas de zona horaria
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [fecha, setFecha] = useState(todayStr);
  const [cierre, setCierre] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo: 'ingreso',
    monto: '',
    categoria: '',
    descripcion: '',
  });
  // No pedimos saldo final manualmente; se usará el saldo esperado
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [error, setError] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const role = typeof window !== 'undefined' ? (localStorage.getItem('role') || 'admin') : 'admin';
  const [empleadoResumen, setEmpleadoResumen] = useState(null);
  const [movimientosEmpleado, setMovimientosEmpleado] = useState([]);
  const [depForm, setDepForm] = useState({ monto: '', descripcion: '' });
  const [pagosVendedorHoy, setPagosVendedorHoy] = useState([]); // solo para rol vendedor
  const [comisionesVendedorMap, setComisionesVendedorMap] = useState({});
  const categoriasDisponibles = React.useMemo(() => {
    const set = new Set();
    movimientos.forEach(m => { if (m.categoria) set.add(m.categoria); });
    return Array.from(set);
  }, [movimientos]);

  useEffect(() => {
    if (role === 'admin') {
      cargarDatos();
    } else {
      cargarDatosEmpleado();
    }
  }, [fecha, role]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [c, movs] = await Promise.all([
        fetchCierreCaja(fecha),
        fetchMovimientosCaja(fecha)
      ]);
      setCierre(c);
      setMovimientos(movs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosEmpleado = async () => {
    try {
      setLoading(true);
      const [resumen, movs] = await Promise.all([
        fetchCajaEmpleadoResumen(fecha),
        fetchMovimientosCajaEmpleado(fecha)
      ]);
      setEmpleadoResumen(resumen);
      setMovimientosEmpleado(movs || []);
      // Si es vendedor, cargar también pagos del día (la API ya filtra por sus préstamos)
      if (role === 'vendedor') {
        const pagos = await fetchPagos();
        const hoy = fecha;
        const pagosHoy = (pagos || []).filter(p => (p.fecha_pago || '').startsWith(hoy));
        setPagosVendedorHoy(pagosHoy);
        // Cargar comisiones individuales del vendedor por pago
        const map = {};
        for (const p of pagosHoy) {
          try {
            const reg = await fetchPagoVendedor(p.id);
            if (reg && typeof reg.monto_comision === 'number') {
              map[p.id] = reg.monto_comision;
            }
          } catch (_) { /* ignorar */ }
        }
        setComisionesVendedorMap(map);
      } else {
        setPagosVendedorHoy([]);
        setComisionesVendedorMap({});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // subscribe to moneda so component re-renders on currency change
  const moneda = useSettingsStore(state => state.moneda);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.monto) return;
    try {
      const payload = {
        fecha,
        tipo: form.tipo,
        monto: parseFloat(form.monto),
        categoria: form.categoria || null,
        descripcion: form.descripcion || null,
        referencia_tipo: 'manual',
        referencia_id: null
      };
      await crearMovimientoCaja(payload);
      setForm({ tipo: form.tipo, monto: '', categoria: '', descripcion: '' });
      await cargarDatos();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCerrarDia = async () => {
    try {
      setError(null);
      // Cerrar usando el saldo esperado como saldo final
      const finalValue = cierre ? parseFloat(cierre.saldo_esperado) : 0;
      await cerrarDia(fecha, finalValue);
      setShowCerrarModal(false);
      await cargarDatos();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAbrirDia = async () => {
    try {
      setError(null);
      await abrirDia(fecha);
      await cargarDatos();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEmpleadoDeposito = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const monto = parseFloat(depForm.monto);
      if (!monto || monto <= 0) return;
      const nuevo = await crearMovimientoCajaEmpleado({ fecha, tipo: 'egreso', monto, categoria: 'deposito_caja', descripcion: depForm.descripcion || 'Depósito a caja' });
      setDepForm({ monto: '', descripcion: '' });
      // Actualización optimista: agregar movimiento y recalcular depositos sin esperar fetch
      if (nuevo) {
        setMovimientosEmpleado(prev => [...prev, nuevo]);
        // Forzar recarga del resumen para totales correctos
        const resumen = await fetchCajaEmpleadoResumen(fecha);
        setEmpleadoResumen(resumen);
      } else {
        await cargarDatosEmpleado();
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEmpleadoCerrar = async () => {
    try {
      setError(null);
      const entregado = empleadoResumen ? empleadoResumen.saldo_esperado_entregar : 0;
      await cerrarDiaEmpleado(fecha, entregado);
      await cargarDatosEmpleado();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEmpleadoAbrir = async () => {
    try {
      setError(null);
      await abrirDiaEmpleado(fecha);
      await cargarDatosEmpleado();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0"><i className="fas fa-cash-register me-2"></i>Caja</h2>
        <div className="d-flex gap-2">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="form-control" style={{ maxWidth: '160px' }} />
          <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>Inicio</button>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Cargando...</div>}
      {role !== 'admin' && empleadoResumen && !loading && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card shadow-sm border-0"><div className="card-body">
                <h6 className="text-muted mb-1">Cobrado Hoy</h6>
                <h5 className="fw-bold text-success mb-0">{formatCurrency(empleadoResumen.ingresos_cobrados || 0)}</h5>
              </div></div>
            </div>
            <div className="col-md-3">
              <div className="card shadow-sm border-0"><div className="card-body">
                <h6 className="text-muted mb-1">Comisión Ganada</h6>
                <h5 className="fw-bold text-primary mb-0">{formatCurrency(empleadoResumen.comision_ganada || 0)}</h5>
              </div></div>
            </div>
            {role !== 'vendedor' && (
              <div className="col-md-3">
                <div className="card shadow-sm border-0"><div className="card-body">
                  <h6 className="text-muted mb-1">Depósitos a Caja</h6>
                  <h5 className="fw-bold text-secondary mb-0">{formatCurrency(empleadoResumen.depositos || 0)}</h5>
                </div></div>
              </div>
            )}
            <div className="col-md-3">
              <div className="card shadow-sm border-0"><div className="card-body">
                <h6 className="text-muted mb-1">A Entregar</h6>
                <h5 className={`fw-bold mb-0 ${empleadoResumen.saldo_esperado_entregar >= 0 ? 'text-success':'text-danger'}`}>{formatCurrency(empleadoResumen.saldo_esperado_entregar || 0)}</h5>
              </div></div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="card shadow-sm border-0"><div className="card-body">
                <h6 className="text-muted mb-1">Estado</h6>
                <span className={`badge ${empleadoResumen.cerrado ? 'bg-success':'bg-warning'}`}>{empleadoResumen.cerrado ? 'Cerrado':'Abierto'}</span>
              </div></div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm border-0"><div className="card-body">
                <h6 className="text-muted mb-1">Rendición</h6>
                <div>Entregado: {empleadoResumen.entregado != null ? formatCurrency(empleadoResumen.entregado) : '-'} {empleadoResumen.diferencia != null && (<span className="ms-3">Diferencia: {formatCurrency(empleadoResumen.diferencia)}</span>)}</div>
              </div></div>
            </div>
          </div>

          {role !== 'vendedor' && (
          <div className="card shadow-sm border-0 mb-4"><div className="card-body">
            <h5 className="fw-bold mb-3"><i className="fas fa-hand-holding-usd me-2"></i>Registrar Depósito a Caja</h5>
            <form className="row g-3" onSubmit={handleEmpleadoDeposito}>
              <div className="col-md-3"><label className="form-label">Monto</label><input type="number" step="0.01" className="form-control" value={depForm.monto} onChange={e=>setDepForm({...depForm, monto:e.target.value})} disabled={empleadoResumen.cerrado} required /></div>
              <div className="col-md-6"><label className="form-label">Descripción</label><input type="text" className="form-control" value={depForm.descripcion} onChange={e=>setDepForm({...depForm, descripcion:e.target.value})} disabled={empleadoResumen.cerrado} placeholder="Entrega en oficina" /></div>
              <div className="col-md-3 d-flex align-items-end"><button className="btn btn-primary w-100" disabled={empleadoResumen.cerrado}><i className="fas fa-plus me-2"></i>Registrar</button></div>
            </form>
          </div></div>
          )}
          {role === 'vendedor' && (
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-body">
                <h5 className="fw-bold mb-3"><i className="fas fa-receipt me-2"></i>Pagos del Día</h5>
                {pagosVendedorHoy.length === 0 ? (
                  <p className="text-muted mb-0">No hay pagos registrados hoy en tus préstamos.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>ID Pago</th>
                          <th>Préstamo</th>
                          <th>Monto Pago</th>
                          <th>Comisión Generada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagosVendedorHoy.map(p => {
                          const com = comisionesVendedorMap[p.id];
                          return (
                            <tr key={p.id}>
                              <td>{p.id}</td>
                              <td>{p.prestamo_id}</td>
                              <td>{formatCurrency(p.monto)}</td>
                              <td>{com !== undefined ? formatCurrency(com) : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end mb-3">
            {!empleadoResumen.cerrado ? (
              <button className="btn btn-warning btn-lg" onClick={handleEmpleadoCerrar}><i className="fas fa-file-invoice-dollar me-2"></i>Rendir Día</button>
            ) : (
              <button className="btn btn-success btn-lg" onClick={handleEmpleadoAbrir}><i className="fas fa-unlock me-2"></i>Reabrir Rendición</button>
            )}
          </div>

          {/* Movimientos del empleado: ocultar para vendedor */}
          {role !== 'vendedor' && (
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h5 className="fw-bold mb-3"><i className="fas fa-list me-2"></i>Movimientos del Día</h5>
                {movimientosEmpleado.length === 0 ? (
                  <p className="text-muted mb-0">No registraste movimientos todavía.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Tipo</th>
                          <th>Monto</th>
                          <th>Categoría</th>
                          <th>Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientosEmpleado.map(m => (
                          <tr key={m.id}>
                            <td>{m.id}</td>
                            <td><span className={`badge ${m.tipo === 'ingreso' ? 'bg-success':'bg-danger'}`}>{m.tipo}</span></td>
                            <td>{formatCurrency(m.monto)}</td>
                            <td>{m.categoria || '-'}</td>
                            <td>{m.descripcion || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {role === 'admin' && cierre && !loading && (
        <>
          {/* Resumen principal del día */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Ingresos</h6>
                  <h5 className="fw-bold text-success mb-0">{formatCurrency(cierre.ingresos)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Comisión Pagada</h6>
                  <h5 className="fw-bold text-danger mb-0">{cierre?.comisiones ? `-${formatCurrency(cierre.comisiones.total)}` : '-'}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Egresos</h6>
                  <h5 className="fw-bold text-danger mb-0">{formatCurrency(cierre.egresos)}</h5>
                </div>
              </div>
            </div>
          </div>

          {/* Segunda fila con saldo final (calculado hasta cerrar) y estado */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Saldo Final</h6>
                  <h5 className={`fw-bold mb-0 ${((cierre.saldo_final ?? cierre.saldo_esperado) >= 0) ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(cierre.saldo_final !== null ? cierre.saldo_final : cierre.saldo_esperado)}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Estado</h6>
                  <h5 className="mb-0">
                    <span className={`badge ${cierre.cerrado ? 'bg-success' : 'bg-warning'}`}>
                      {cierre.cerrado ? 'Cerrado' : 'Abierto'}
                    </span>
                  </h5>
                </div>
              </div>
            </div>
          </div>

          {/* Diferencia oculta a pedido del usuario */}
          <div className="d-flex justify-content-end mb-3">
            {!cierre.cerrado ? (
              <button className="btn btn-warning btn-lg" onClick={() => setShowCerrarModal(true)}>
                <i className="fas fa-lock me-2"></i>Cerrar Día
              </button>
            ) : (
              <button className="btn btn-success btn-lg" onClick={handleAbrirDia}>
                <i className="fas fa-unlock me-2"></i>Abrir Día
              </button>
            )}
          </div>
        </>
      )}

      {/* Form nuevo movimiento (solo admin) */}
      {role === 'admin' && (
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3"><i className="fas fa-plus me-2"></i>Nuevo Movimiento</h5>
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-2">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} disabled={cierre?.cerrado}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Monto</label>
              <input type="number" step="0.01" className="form-control" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required disabled={cierre?.cerrado} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Categoría</label>
              <input type="text" className="form-control" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="prestamo, pago, comision, ajuste, otros" disabled={cierre?.cerrado} />
            </div>
            <div className="col-md-5">
              <label className="form-label">Descripción</label>
              <input type="text" className="form-control" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} disabled={cierre?.cerrado} />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-primary" disabled={cierre?.cerrado}><i className="fas fa-save me-2"></i>Registrar</button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Lista de movimientos (solo admin) */}
      {role === 'admin' && (
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <h5 className="fw-bold mb-0"><i className="fas fa-list me-2"></i>Movimientos del Día</h5>
            <div className="d-flex gap-2 flex-wrap">
              <select className="form-select form-select-sm" style={{ maxWidth: '150px' }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
              </select>
              <select className="form-select form-select-sm" style={{ maxWidth: '200px' }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                <option value="todas">Todas</option>
                {categoriasDisponibles.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          {movimientos.filter(m => {
            const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
            const matchCategoria = filtroCategoria === 'todas' || (m.categoria && m.categoria.toLowerCase() === filtroCategoria.toLowerCase());
            return matchTipo && matchCategoria;
          }).length === 0 ? (
            <p className="text-muted">No hay movimientos que coincidan con el filtro.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.filter(m => {
                    const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
                    const matchCategoria = filtroCategoria === 'todas' || (m.categoria && m.categoria.toLowerCase() === filtroCategoria.toLowerCase());
                    return matchTipo && matchCategoria;
                  }).map(m => (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td>
                        <span className={`badge ${m.tipo === 'ingreso' ? 'bg-success' : 'bg-danger'}`}>{m.tipo}</span>
                      </td>
                      <td>{formatCurrency(m.monto)}</td>
                      <td>{m.categoria || '-'}</td>
                      <td>{m.descripcion || '-'}</td>
                      <td>{m.referencia_tipo ? `${m.referencia_tipo} #${m.referencia_id}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modal Cerrar Día */}
      {showCerrarModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-lock me-2"></i>Cerrar Día</h5>
                <button type="button" className="btn-close" onClick={() => setShowCerrarModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Cerraremos el día usando el <strong>saldo esperado</strong> como saldo final.</p>
                <p className="text-muted small">Saldo que se registrará: <strong>{cierre ? formatCurrency(cierre.saldo_esperado) : ''}</strong></p>
                {error && <div className="alert alert-danger">{error}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCerrarModal(false)}>Cancelar</button>
                <button className="btn btn-warning" onClick={handleCerrarDia}>
                  <i className="fas fa-check me-2"></i>Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Caja;