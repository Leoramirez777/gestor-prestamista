import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Importar APIs
import { fetchClientes } from './api/clientes';
import { fetchPrestamos } from './api/prestamos';
import { fetchPagos } from './api/pagos';

function App() {
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState('');
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalPrestamos: 0,
    totalPagos: 0,
    montoTotalPrestado: 0,
    montoTotalRecaudado: 0,
    saldoPendiente: 0,
    prestamosActivos: 0,
    prestamosVencidos: 0,
    pagosHoy: 0,
    clientesActivos: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    // Verificar conexión con el backend
    axios.get('http://localhost:8000')
      .then(res => setMensaje(res.data.message))
      .catch(err => console.error(err));

    // Cargar datos del dashboard
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar todos los datos
      const [clientesData, prestamosData, pagosData] = await Promise.all([
        fetchClientes(),
        fetchPrestamos(),
        fetchPagos()
      ]);

      const clientes = clientesData || [];
      const prestamos = prestamosData || [];
      const pagos = pagosData || [];

      // Calcular estadísticas
      const totalMontosPrestados = prestamos.reduce((sum, p) => sum + (p.monto || 0), 0);
      const totalMontosRecaudados = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
      const saldoPendienteTotal = prestamos.reduce((sum, p) => sum + (p.saldo_pendiente || 0), 0);
      
      // Préstamos activos (con saldo pendiente)
      const prestamosActivos = prestamos.filter(p => (p.saldo_pendiente || 0) > 0).length;
      
      // Préstamos vencidos (fecha vencimiento < hoy y saldo pendiente > 0)
      const hoy = new Date();
      const prestamosVencidos = prestamos.filter(p => {
        const fechaVencimiento = new Date(p.fecha_vencimiento);
        return fechaVencimiento < hoy && (p.saldo_pendiente || 0) > 0;
      }).length;

      // Pagos de hoy
      const pagosHoy = pagos.filter(p => {
        const fechaPago = new Date(p.fecha_pago);
        return fechaPago.toDateString() === hoy.toDateString();
      }).length;

      // Clientes con préstamos activos
      const clientesConPrestamosActivos = new Set(
        prestamos.filter(p => (p.saldo_pendiente || 0) > 0).map(p => p.cliente_id)
      ).size;

      setStats({
        totalClientes: clientes.length,
        totalPrestamos: prestamos.length,
        totalPagos: pagos.length,
        montoTotalPrestado: totalMontosPrestados,
        montoTotalRecaudado: totalMontosRecaudados,
        saldoPendiente: saldoPendienteTotal,
        prestamosActivos,
        prestamosVencidos,
        pagosHoy,
        clientesActivos: clientesConPrestamosActivos
      });

      // Actividad reciente (últimos 5 items)
      const actividadReciente = [
        ...pagos.slice(-3).map(p => ({
          tipo: 'pago',
          descripcion: `Pago de $${p.monto} recibido`,
          fecha: p.fecha_pago,
          icono: '💵',
          color: 'success'
        })),
        ...prestamos.slice(-2).map(p => ({
          tipo: 'prestamo',
          descripcion: `Préstamo de $${p.monto} creado`,
          fecha: p.fecha_prestamo,
          icono: '💰',
          color: 'primary'
        }))
      ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);

      setRecentActivity(actividadReciente);

    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
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

  const navegarA = (ruta) => {
    navigate(ruta);
  };

  const menuItems = [
    {
      title: 'Gestión de Clientes',
      description: 'Ver, agregar y administrar clientes',
      icon: 'fas fa-users',
      path: '/clientes',
      newPath: '/nuevos-clientes',
      color: 'primary',
      stat: stats.totalClientes,
      statLabel: 'Total'
    },
    {
      title: 'Gestión de Préstamos',
      description: 'Administrar préstamos activos e historial',
      icon: 'fas fa-hand-holding-usd',
      path: '/prestamos',
      newPath: '/nuevos-prestamos',
      color: 'success',
      stat: stats.prestamosActivos,
      statLabel: 'Activos'
    },
    {
      title: 'Gestión de Pagos',
      description: 'Registrar y seguir pagos realizados',
      icon: 'fas fa-money-bill-wave',
      path: '/pagos',
      newPath: '/pagos',
      color: 'warning',
      stat: stats.totalPagos,
      statLabel: 'Total'
    }
  ];

  if (loading) {
    return (
      <div className="container my-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5">
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-dark mb-3">
          🏦 Panel de Control - Gestor de Prestamista
        </h1>
        <p className="lead text-muted">
          {mensaje || 'Sistema integral para la gestión de préstamos y clientes'}
        </p>
      </div>

      {/* Sección principal con navegación, estadísticas y actividad */}
      <div className="row g-4">
        {/* Cards de navegación */}
        <div className="col-lg-8">
          <div className="row g-4">
            {menuItems.map((item, index) => (
              <div key={index} className="col-md-6">
                <div className="card h-100 shadow-sm border-0 bg-white" style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                     onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                     onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className={`bg-${item.color} bg-opacity-10 p-3 rounded-3`}>
                        <i className={`${item.icon} text-${item.color} fa-2x`}></i>
                      </div>
                      <div className="text-end">
                        <h3 className={`text-${item.color} fw-bold mb-0`}>{item.stat}</h3>
                        <small className="text-muted fw-semibold">{item.statLabel}</small>
                      </div>
                    </div>
                    <h5 className={`card-title text-dark fw-bold mb-2`}>
                      {item.title}
                    </h5>
                    <p className="card-text text-muted small mb-3">
                      {item.description}
                    </p>
                    <div className="d-grid gap-2">
                      <button 
                        className={`btn btn-${item.color} btn-lg fw-semibold`}
                        onClick={() => navegarA(item.path)}
                        style={{ borderRadius: '10px' }}
                      >
                        <i className={`${item.icon} me-2`}></i>
                        Ver {item.title.split(' ')[2]}
                      </button>
                      <button 
                        className={`btn btn-outline-${item.color} fw-semibold`}
                        onClick={() => navegarA(item.newPath)}
                        style={{ borderRadius: '10px' }}
                      >
                        <i className="fas fa-plus me-2"></i>
                        Nuevo {item.title.split(' ')[2].slice(0, -1)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Card de Resumen Estadísticas */}
            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0 bg-white" style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                   onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="bg-info bg-opacity-10 p-3 rounded-3">
                      <i className="fas fa-chart-bar text-info fa-2x"></i>
                    </div>
                    <div className="text-end">
                      <h3 className="text-info fw-bold mb-0">{formatCurrency(stats.montoTotalPrestado)}</h3>
                      <small className="text-muted fw-semibold">Total en Sistema</small>
                    </div>
                  </div>
                  <h5 className="card-title text-dark fw-bold mb-2">
                    Resumen Financiero
                  </h5>
                  <p className="card-text text-muted small mb-3">
                    Ve las estadísticas completas y métricas del negocio
                  </p>
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-info btn-lg fw-semibold"
                      onClick={() => setShowStats(!showStats)}
                      style={{ borderRadius: '10px' }}
                    >
                      <i className="fas fa-chart-bar me-2"></i>
                      {showStats ? 'Ocultar Resumen' : 'Ver Resumen'}
                    </button>
                    <button 
                      className="btn btn-outline-info fw-semibold"
                      onClick={loadDashboardData}
                      disabled={loading}
                      style={{ borderRadius: '10px' }}
                    >
                      <i className="fas fa-sync-alt me-2"></i>
                      Actualizar Datos
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de Estadísticas Expandible */}
            {showStats && (
              <div className="col-12">
                <div className="card border-0 shadow-sm bg-white">
                  <div className="card-header bg-gradient text-white border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 fw-bold">
                        <i className="fas fa-chart-line me-2"></i>
                        📊 Panel de Estadísticas Completo
                      </h5>
                      <button 
                        className="btn btn-outline-light btn-sm"
                        onClick={() => setShowStats(false)}
                        style={{ borderRadius: '20px' }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    {/* Estadísticas principales */}
                    <div className="row g-4 mb-4">
                      <div className="col-md-3">
                        <div className="card border-0 shadow-lg text-white h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                          <div className="card-body text-center p-4">
                            <div className="mb-3">
                              <i className="fas fa-dollar-sign fa-3x text-white"></i>
                            </div>
                            <h2 className="fw-bold text-white mb-2">{formatCurrency(stats.montoTotalPrestado)}</h2>
                            <p className="mb-0 text-white-50 fw-semibold">💰 Total Prestado</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card border-0 shadow-lg text-white h-100" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                          <div className="card-body text-center p-4">
                            <div className="mb-3">
                              <i className="fas fa-hand-holding-usd fa-3x text-white"></i>
                            </div>
                            <h2 className="fw-bold text-white mb-2">{formatCurrency(stats.montoTotalRecaudado)}</h2>
                            <p className="mb-0 text-white-50 fw-semibold">💵 Total Recaudado</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card border-0 shadow-lg text-white h-100" style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)' }}>
                          <div className="card-body text-center p-4">
                            <div className="mb-3">
                              <i className="fas fa-clock fa-3x text-white"></i>
                            </div>
                            <h2 className="fw-bold text-white mb-2">{formatCurrency(stats.saldoPendiente)}</h2>
                            <p className="mb-0 text-white-50 fw-semibold">⏱️ Saldo Pendiente</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card border-0 shadow-lg text-white h-100" style={{ background: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)' }}>
                          <div className="card-body text-center p-4">
                            <div className="mb-3">
                              <i className="fas fa-percentage fa-3x text-white"></i>
                            </div>
                            <h2 className="fw-bold text-white mb-2">
                              {stats.montoTotalPrestado > 0 
                                ? Math.round((stats.montoTotalRecaudado / stats.montoTotalPrestado) * 100) 
                                : 0}%
                            </h2>
                            <p className="mb-0 text-white-50 fw-semibold">📊 Tasa de Recaudo</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Métricas secundarias */}
                    <div className="row g-3">
                      <div className="col-md-2">
                        <div className="card text-center border-0 shadow-sm bg-white h-100">
                          <div className="card-body p-3">
                            <div className="mb-2">
                              <i className="fas fa-play-circle text-primary fa-2x"></i>
                            </div>
                            <h4 className="text-primary fw-bold mb-1">{stats.prestamosActivos}</h4>
                            <p className="card-text small mb-0 text-muted fw-semibold">Préstamos Activos</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="card text-center border-0 shadow-sm bg-white h-100">
                          <div className="card-body p-3">
                            <div className="mb-2">
                              <i className="fas fa-exclamation-circle text-danger fa-2x"></i>
                            </div>
                            <h4 className="text-danger fw-bold mb-1">{stats.prestamosVencidos}</h4>
                            <p className="card-text small mb-0 text-muted fw-semibold">Préstamos Vencidos</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="card text-center border-0 shadow-sm bg-white h-100">
                          <div className="card-body p-3">
                            <div className="mb-2">
                              <i className="fas fa-calendar-day text-success fa-2x"></i>
                            </div>
                            <h4 className="text-success fw-bold mb-1">{stats.pagosHoy}</h4>
                            <p className="card-text small mb-0 text-muted fw-semibold">Pagos Hoy</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="card text-center border-0 shadow-sm bg-white h-100">
                          <div className="card-body p-3">
                            <div className="mb-2">
                              <i className="fas fa-user-check text-info fa-2x"></i>
                            </div>
                            <h4 className="text-info fw-bold mb-1">{stats.clientesActivos}</h4>
                            <p className="card-text small mb-0 text-muted fw-semibold">Clientes Activos</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="card text-center border-0 shadow-sm bg-white h-100">
                          <div className="card-body p-3">
                            <div className="mb-2">
                              <i className="fas fa-users text-warning fa-2x"></i>
                            </div>
                            <h4 className="text-warning fw-bold mb-1">{stats.totalClientes}</h4>
                            <p className="card-text small mb-0 text-muted fw-semibold">Total Clientes</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="card text-center border-0 shadow-sm bg-white h-100">
                          <div className="card-body p-3">
                            <div className="mb-2">
                              <i className="fas fa-file-contract text-secondary fa-2x"></i>
                            </div>
                            <h4 className="text-secondary fw-bold mb-1">{stats.totalPrestamos}</h4>
                            <p className="card-text small mb-0 text-muted fw-semibold">Total Préstamos</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel de actividad reciente */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100 bg-white">
            <div className="card-header bg-gradient text-white border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <h5 className="mb-0 fw-bold">
                <i className="fas fa-chart-line me-2"></i>
                📊 Actividad Reciente
              </h5>
            </div>
            <div className="card-body p-4">
              {recentActivity.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <div className="mb-3">
                    <i className="fas fa-info-circle fa-3x text-muted opacity-50"></i>
                  </div>
                  <h6 className="text-muted">No hay actividad reciente</h6>
                  <p className="small text-muted">Los movimientos aparecerán aquí</p>
                </div>
              ) : (
                <div className="timeline">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="d-flex mb-3 p-3 rounded-3 bg-light">
                      <div className="flex-shrink-0 me-3">
                        <div className={`badge bg-${activity.color} p-2`} style={{ fontSize: '1rem' }}>
                          {activity.icono}
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-1 small fw-bold text-dark">{activity.descripcion}</p>
                        <small className="text-muted">
                          <i className="fas fa-calendar-alt me-1"></i>
                          {formatDate(activity.fecha)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas y notificaciones */}
      {stats.prestamosVencidos > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center" style={{ borderRadius: '15px' }}>
              <div className="flex-shrink-0 me-3">
                <i className="fas fa-exclamation-triangle fa-2x text-warning"></i>
              </div>
              <div className="flex-grow-1">
                <h6 className="alert-heading mb-1 fw-bold text-dark">
                  ⚠️ Atención: Préstamos Vencidos
                </h6>
                <p className="mb-0 text-dark">
                  Tienes <span className="fw-bold text-danger">{stats.prestamosVencidos}</span> préstamo(s) vencido(s) que requieren atención inmediata.
                </p>
              </div>
              <div className="flex-shrink-0">
                <button 
                  className="btn btn-warning fw-semibold"
                  onClick={() => navegarA('/prestamos')}
                  style={{ borderRadius: '10px' }}
                >
                  <i className="fas fa-eye me-2"></i>
                  Ver Préstamos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
