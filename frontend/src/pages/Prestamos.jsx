import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPrestamos } from '../api/prestamos';
import { fetchClientes } from '../api/clientes';
import { fetchEmpleados } from '../api/empleados';
import '../styles/Prestamos.css';
import { formatCurrency } from '../utils/formatCurrency';
import { useSettingsStore } from '../stores/useSettingsStore';

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
  // Nuevos filtros
  const [filtroVendedor, setFiltroVendedor] = useState(""); // "" | "con" | "sin" | empleadoId
  const [filtroFrecuencia, setFiltroFrecuencia] = useState(""); // "" | "semanal" | "mensual"
  const [filtroInicioDesde, setFiltroInicioDesde] = useState("");
  const [filtroInicioHasta, setFiltroInicioHasta] = useState("");
  const [filtroVencDesde, setFiltroVencDesde] = useState("");
  const [filtroVencHasta, setFiltroVencHasta] = useState("");
  const [filtroProximos, setFiltroProximos] = useState(""); // "" | "7" | "15" | "30"
  const [filtroSaldoPendMin, setFiltroSaldoPendMin] = useState("");
  const [filtroSaldoPendMax, setFiltroSaldoPendMax] = useState("");
  const [filtroSaldoCuotaMin, setFiltroSaldoCuotaMin] = useState("");
  const [filtroSaldoCuotaMax, setFiltroSaldoCuotaMax] = useState("");
  // Mapa de vendedores por préstamo
  const [vendedoresMap, setVendedoresMap] = useState({});
  const [empleados, setEmpleados] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar préstamos y clientes en paralelo
        const [prestamosData, clientesData, empleadosData] = await Promise.all([
          fetchPrestamos(),
          fetchClientes(),
          fetchEmpleados()
        ]);
        
        setPrestamos(prestamosData || []);
        setClientes(clientesData || []);
        setEmpleados(empleadosData || []);
        await loadVendedoresInfo(prestamosData || []);
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

  // Suscribirse a la moneda para forzar re-render cuando cambie
  const monedaSelected = useSettingsStore(state => state.moneda);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Extraer solo la parte de fecha (YYYY-MM-DD) para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
  };

  // Cargar información de vendedor para cada préstamo (si existe)
  const loadVendedoresInfo = async (lista) => {
    const map = {};
    for (const pr of lista) {
      try {
        const res = await fetch(`/api/prestamos/${pr.id}/vendedor`);
        if (res.ok) {
          const reg = await res.json();
          map[pr.id] = { id: reg.empleado_id || null, nombre: reg.empleado_nombre || 'Vendedor' };
        }
      } catch (e) {
        // sin vendedor
      }
    }
    setVendedoresMap(map);
  };

  // Orden descendente por ID (más recientes primero)
  const prestamosOrdenados = [...prestamos].sort((a,b) => b.id - a.id);
  const ultimoIdPrestamo = prestamosOrdenados.length ? prestamosOrdenados[0].id : null;

  // Filtrar préstamos según los filtros (aplicado después del orden)
  const prestamosFiltrados = prestamosOrdenados.filter((prestamo) => {
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
    // Frecuencia
    if (filtroFrecuencia && (prestamo.frecuencia_pago || '').toLowerCase() !== filtroFrecuencia) return false;
    // Rango de fecha inicio
    if (filtroInicioDesde) {
      const f = prestamo.fecha_inicio.split('T')[0];
      if (f < filtroInicioDesde) return false;
    }
    if (filtroInicioHasta) {
      const f = prestamo.fecha_inicio.split('T')[0];
      if (f > filtroInicioHasta) return false;
    }
    // Rango de fecha vencimiento
    if (filtroVencDesde) {
      const f = prestamo.fecha_vencimiento.split('T')[0];
      if (f < filtroVencDesde) return false;
    }
    if (filtroVencHasta) {
      const f = prestamo.fecha_vencimiento.split('T')[0];
      if (f > filtroVencHasta) return false;
    }
    // Próximos a vencer en X días
    if (filtroProximos) {
      const hoy = new Date();
      const [y, m, d] = prestamo.fecha_vencimiento.split('T')[0].split('-');
      const fv = new Date(Number(y), Number(m) - 1, Number(d));
      const diff = Math.ceil((fv - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / (1000*60*60*24));
      if (diff < 0 || diff > parseInt(filtroProximos)) return false;
    }
    // Saldo pendiente rango
    if (filtroSaldoPendMin && prestamo.saldo_pendiente < parseFloat(filtroSaldoPendMin)) return false;
    if (filtroSaldoPendMax && prestamo.saldo_pendiente > parseFloat(filtroSaldoPendMax)) return false;
    // Saldo de cuota rango
    if (filtroSaldoCuotaMin && prestamo.saldo_cuota < parseFloat(filtroSaldoCuotaMin)) return false;
    if (filtroSaldoCuotaMax && prestamo.saldo_cuota > parseFloat(filtroSaldoCuotaMax)) return false;
    // Vendedor
    if (filtroVendedor) {
      const info = vendedoresMap[prestamo.id];
      if (filtroVendedor === 'con' && !info) return false;
      if (filtroVendedor === 'sin' && info) return false;
      if (filtroVendedor !== 'con' && filtroVendedor !== 'sin') {
        const idSel = parseInt(filtroVendedor);
        if (!info || (info.id || 0) !== idSel) return false;
      }
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
        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={() => navigate('/nuevos-prestamos')}>
            <i className="fas fa-plus me-2"></i>Nuevo Préstamo
          </button>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>← Volver al Menú</button>
        </div>
      </div>

      <div className="card mb-4 shadow-sm border-0" style={{ borderLeft: '4px solid #198754' }}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0" style={{ color: '#000' }}>
              <i className="fas fa-filter me-2"></i>Filtros de Búsqueda
            </h5>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setFiltroNombre("");
                setFiltroEstado("");
                setFiltroMontoMin("");
                setFiltroMontoMax("");
                setFiltroTasaMin("");
                setFiltroTasaMax("");
                setFiltroFechaCreacion("");
                setFiltroVendedor("");
                setFiltroFrecuencia("");
                setFiltroInicioDesde("");
                setFiltroInicioHasta("");
                setFiltroVencDesde("");
                setFiltroVencHasta("");
                setFiltroProximos("");
                setFiltroSaldoPendMin("");
                setFiltroSaldoPendMax("");
                setFiltroSaldoCuotaMin("");
                setFiltroSaldoCuotaMax("");
              }}
            >
              <i className="fas fa-times me-1"></i>Limpiar
            </button>
          </div>
          
          {/* Primera fila de filtros */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label small fw-bold">Nombre del Cliente</label>
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
              <label className="form-label small fw-bold">Estado del Préstamo</label>
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
                <option value="refinanciado">Refinanciado</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold">Monto Mínimo</label>
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
              <label className="form-label small fw-bold">Monto Máximo</label>
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
              <label className="form-label small fw-bold">Fecha de Creación</label>
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
          <div className="row g-3 mb-3">
            <div className="col-md-2">
              <label className="form-label small fw-bold">Tasa Mínima (%)</label>
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
              <label className="form-label small fw-bold">Tasa Máxima (%)</label>
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
            <div className="col-md-3">
              <label className="form-label small fw-bold">Vendedor</label>
              <select
                className="form-select"
                value={filtroVendedor}
                onChange={(e) => setFiltroVendedor(e.target.value)}
                style={{ borderRadius: '8px' }}
              >
                <option value="">Todos</option>
                <option value="con">Con vendedor</option>
                <option value="sin">Sin vendedor</option>
                {empleados
                  .filter(emp => (emp.puesto || '').toLowerCase() === 'vendedor')
                  .map(emp => (
                    <option key={emp.id} value={String(emp.id)}>{emp.nombre}</option>
                  ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold">Frecuencia</label>
              <select
                className="form-select"
                value={filtroFrecuencia}
                onChange={(e) => setFiltroFrecuencia(e.target.value)}
                style={{ borderRadius: '8px' }}
              >
                <option value="">Todas</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Próximos a vencer</label>
              <select
                className="form-select"
                value={filtroProximos}
                onChange={(e) => setFiltroProximos(e.target.value)}
                style={{ borderRadius: '8px' }}
              >
                <option value="">Todos</option>
                <option value="7">≤ 7 días</option>
                <option value="15">≤ 15 días</option>
                <option value="30">≤ 30 días</option>
              </select>
            </div>
          </div>

          {/* Tercera fila: rangos de fechas */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label small fw-bold">Inicio: Desde</label>
              <input type="date" className="form-control" value={filtroInicioDesde} onChange={e=>setFiltroInicioDesde(e.target.value)} style={{ borderRadius: '8px' }} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Inicio: Hasta</label>
              <input type="date" className="form-control" value={filtroInicioHasta} onChange={e=>setFiltroInicioHasta(e.target.value)} style={{ borderRadius: '8px' }} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Vencimiento: Desde</label>
              <input type="date" className="form-control" value={filtroVencDesde} onChange={e=>setFiltroVencDesde(e.target.value)} style={{ borderRadius: '8px' }} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Vencimiento: Hasta</label>
              <input type="date" className="form-control" value={filtroVencHasta} onChange={e=>setFiltroVencHasta(e.target.value)} style={{ borderRadius: '8px' }} />
            </div>
          </div>

          {/* Atajos de tiempo para inicio */}
          <div className="mb-3">
            <div className="btn-group btn-group-sm" role="group" aria-label="Atajos de tiempo">
              <button type="button" className="btn btn-outline-secondary time-shortcut-btn" onClick={() => {
                const hoy = new Date();
                const iso = hoy.toISOString().split('T')[0];
                setFiltroInicioDesde(iso);
                setFiltroInicioHasta(iso);
              }}>Hoy</button>
              <button type="button" className="btn btn-outline-secondary time-shortcut-btn" onClick={() => {
                const hoy = new Date();
                const past = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7);
                setFiltroInicioDesde(past.toISOString().split('T')[0]);
                setFiltroInicioHasta(hoy.toISOString().split('T')[0]);
              }}>Últimos 7 días</button>
              <button type="button" className="btn btn-outline-secondary time-shortcut-btn" onClick={() => {
                const hoy = new Date();
                const start = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                const end = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
                setFiltroInicioDesde(start.toISOString().split('T')[0]);
                setFiltroInicioHasta(end.toISOString().split('T')[0]);
              }}>Este mes</button>
            </div>
          </div>

          {/* Cuarta fila: saldos */}
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small fw-bold">Saldo pendiente mín</label>
              <input type="number" className="form-control" value={filtroSaldoPendMin} onChange={e=>setFiltroSaldoPendMin(e.target.value)} min="0" style={{ borderRadius: '8px' }} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Saldo pendiente máx</label>
              <input type="number" className="form-control" value={filtroSaldoPendMax} onChange={e=>setFiltroSaldoPendMax(e.target.value)} min="0" style={{ borderRadius: '8px' }} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Saldo de cuota mín</label>
              <input type="number" className="form-control" value={filtroSaldoCuotaMin} onChange={e=>setFiltroSaldoCuotaMin(e.target.value)} style={{ borderRadius: '8px' }} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Saldo de cuota máx</label>
              <input type="number" className="form-control" value={filtroSaldoCuotaMax} onChange={e=>setFiltroSaldoCuotaMax(e.target.value)} style={{ borderRadius: '8px' }} />
            </div>
          </div>
          <div className="row g-3 mt-3">
            <div className="col-12">
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
                    <th>Vendedor</th>
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
                        <span className={`fw-bold ${prestamo.saldo_pendiente > 0 ? 'text-danger' : 'text-dark'}`}>
                          {formatCurrency(prestamo.saldo_pendiente)}
                        </span>
                      </td>
                      <td>
                        <span className={getEstadoClass(prestamo.estado)}>
                          {prestamo.estado || 'Sin estado'}
                        </span>
                      </td>
                      <td>
                        {vendedoresMap[prestamo.id] ? (
                          <span className="badge bg-light text-dark border" title="Vendedor">
                            {vendedoresMap[prestamo.id].nombre}
                          </span>
                        ) : (
                          <span className="text-muted">No</span>
                        )}
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

