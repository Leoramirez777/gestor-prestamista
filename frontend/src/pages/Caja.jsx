import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCierreCaja, fetchMovimientosCaja, crearMovimientoCaja, cerrarDia } from '../api/caja';

function Caja() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];
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
  const [saldoFinalInput, setSaldoFinalInput] = useState('');
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [fecha]);

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

  const formatCurrency = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount || 0);

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
    if (!saldoFinalInput) {
      setError('Debes ingresar el saldo final.');
      return;
    }
    try {
      setError(null);
      await cerrarDia(fecha, parseFloat(saldoFinalInput));
      setShowCerrarModal(false);
      setSaldoFinalInput('');
      await cargarDatos();
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
      {cierre && !loading && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-2">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Saldo Inicial</h6>
                  <h5 className="fw-bold text-secondary mb-0">{formatCurrency(cierre.saldo_inicial)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Ingresos</h6>
                  <h5 className="fw-bold text-success mb-0">{formatCurrency(cierre.ingresos)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Egresos</h6>
                  <h5 className="fw-bold text-danger mb-0">{formatCurrency(cierre.egresos)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Saldo Esperado</h6>
                  <h5 className={`fw-bold ${cierre.saldo_esperado >=0 ? 'text-success' : 'text-danger'} mb-0`}>{formatCurrency(cierre.saldo_esperado)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="text-muted mb-1">Saldo Final</h6>
                  <h5 className="fw-bold text-info mb-0">{cierre.saldo_final !== null ? formatCurrency(cierre.saldo_final) : '-'}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-2">
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
          {cierre.diferencia !== null && (
            <div className="alert alert-info mb-3">
              <strong>Diferencia:</strong> {formatCurrency(cierre.diferencia)} 
              {cierre.diferencia > 0 && ' (sobra)'}
              {cierre.diferencia < 0 && ' (falta)'}
            </div>
          )}
          {!cierre.cerrado && (
            <div className="d-flex justify-content-end mb-3">
              <button className="btn btn-warning btn-lg" onClick={() => setShowCerrarModal(true)}>
                <i className="fas fa-lock me-2"></i>Cerrar Día
              </button>
            </div>
          )}
        </>
      )}

      {/* Form nuevo movimiento */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3"><i className="fas fa-plus me-2"></i>Nuevo Movimiento</h5>
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-2">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Monto</label>
              <input type="number" step="0.01" className="form-control" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Categoría</label>
              <input type="text" className="form-control" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="ajuste, otros" />
            </div>
            <div className="col-md-5">
              <label className="form-label">Descripción</label>
              <input type="text" className="form-control" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-primary"><i className="fas fa-save me-2"></i>Registrar</button>
            </div>
          </form>
        </div>
      </div>

      {/* Lista de movimientos */}
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h5 className="fw-bold mb-3"><i className="fas fa-list me-2"></i>Movimientos del Día</h5>
          {movimientos.length === 0 ? (
            <p className="text-muted">No hay movimientos registrados.</p>
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
                  {movimientos.map(m => (
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
                <p>Confirma el <strong>saldo final</strong> en caja para cerrar el día.</p>
                <p className="text-muted small">Saldo esperado: <strong>{cierre ? formatCurrency(cierre.saldo_esperado) : ''}</strong></p>
                <div className="mb-3">
                  <label className="form-label">Saldo Final (confirmado)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control" 
                    value={saldoFinalInput} 
                    onChange={(e) => setSaldoFinalInput(e.target.value)} 
                    placeholder="Ingresa el saldo real"
                    autoFocus
                  />
                </div>
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