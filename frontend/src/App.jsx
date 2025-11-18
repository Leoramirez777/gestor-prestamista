import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./styles/App.css";

// Importar APIs
import { fetchClientes } from './api/clientes';
import { fetchPrestamos } from './api/prestamos';
import { fetchPagos } from './api/pagos';
import { fetchMetricsSummary } from './api/metrics';
import { logout } from './api/auth';

function App({ onLogout }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalPrestamos: 0,
    totalPagos: 0,
    montoTotalPrestado: 0,
    prestamosActivos: 0,
    prestamosVencidos: 0,
    tasaRecaudo: 0,
    averageLoanSize: 0,
    ticketPromedioPago: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Obtener usuario
    const storedUsername = localStorage.getItem('username');
    setUsername(storedUsername || 'Usuario');

    // Cargar datos del dashboard
    loadDashboardData();

    // Recargar datos cuando la ventana vuelve a tener foco
    const handleFocus = () => {
      loadDashboardData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/login');
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Petición agregada
      const summaryPromise = fetchMetricsSummary();
      // Datos crudos para actividad
      const [clientesData, prestamosData, pagosData, summary] = await Promise.all([
        fetchClientes(),
        fetchPrestamos(),
        fetchPagos(),
        summaryPromise
      ]);

      const clientes = clientesData || [];
      const prestamos = prestamosData || [];
      const pagos = pagosData || [];

      if (summary) {
        setStats({
          totalClientes: summary.total_clientes,
          totalPrestamos: summary.total_prestamos,
          totalPagos: summary.total_pagos,
          montoTotalPrestado: summary.monto_total_prestado,
          prestamosActivos: summary.prestamos_activos,
          prestamosVencidos: summary.prestamos_vencidos,
          tasaRecaudo: summary.tasa_recaudo,
          averageLoanSize: summary.average_loan_size,
          ticketPromedioPago: summary.ticket_promedio_pago
        });
      }

      // Actividad reciente (últimos 5 items)
      // Primero ordenar pagos por ID descendente (más reciente primero)
      const pagosOrdenados = [...pagos].sort((a, b) => b.id - a.id);
      const prestamosOrdenados = [...prestamos].sort((a, b) => b.id - a.id);
      
      const actividadReciente = [
        ...pagosOrdenados.slice(0, 3).map(p => ({
          tipo: 'pago',
          descripcion: `Pago de $${p.monto.toLocaleString('es-AR')} recibido`,
          fecha: p.fecha_pago,
          id: p.id,
          timestamp: p.created_at || p.fecha_pago,
          icono: '💵',
          color: 'success'
        })),
        ...prestamosOrdenados.slice(0, 2).map(p => ({
          tipo: 'prestamo',
          descripcion: `Préstamo de $${p.monto.toLocaleString('es-AR')} creado`,
          fecha: p.created_at || p.fecha_inicio,
          id: p.id,
          timestamp: p.created_at || p.fecha_inicio,
          icono: '💰',
          color: 'primary'
        }))
      ].sort((a, b) => {
        // Ordenar por timestamp descendente (más reciente primero)
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        if (timeB !== timeA) return timeB - timeA;
        // Si tienen el mismo timestamp, ordenar por ID descendente
        return b.id - a.id;
      }).slice(0, 5);

      setRecentActivity(actividadReciente);

    } catch (error) {
      console.error('Error al cargar datos/summary del dashboard:', error);
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
    // Extraer solo la parte de fecha (YYYY-MM-DD) para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
  };

  // Helper para obtener etiquetas seguras para las tarjetas
  const getCardLabels = (title) => {
    if (!title || typeof title !== 'string') return { viewLabel: '', newLabel: '' };
    const parts = title.trim().split(/\s+/);
    // intentamos usar la tercera palabra si existe, si no usar la última
    const viewLabel = parts[2] || parts[parts.length - 1] || '';
    let newLabel = viewLabel || '';
    // singularizar simple: quitar 's' final si existe
    if (newLabel.toLowerCase().endsWith('s')) {
      newLabel = newLabel.slice(0, -1);
    }
    return { viewLabel, newLabel };
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
      newPath: '/pagos?nuevo=true',
      color: 'warning',
      stat: stats.totalPagos,
      statLabel: 'Total'
    }
  ];

  // Agregar nueva tarjeta: Empleados (morado, con emoji)
  // Mover Resumen al área principal (en lugar de Empleados)
  menuItems.push({
    title: 'Resumen Financiero',
    description: 'Ve las estadísticas completas y métricas del negocio',
    icon: 'fas fa-chart-bar',
    path: '/resumen',
    newPath: '/resumen',
    color: 'info',
    stat: stats.montoTotalPrestado,
    statLabel: 'Total en Sistema'
  });


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
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div className="text-start">
          <h1 className="display-4 fw-bold text-dark mb-2">
            Panel de Control 
          </h1>
          <p className="text-muted fs-5">Bienvenido, <strong>{username}</strong></p>
        </div>
        <button 
          className="btn btn-outline-danger"
          onClick={handleLogout}
          style={{ borderRadius: '10px' }}
        >
          <i className="fas fa-sign-out-alt me-2"></i>
          Cerrar Sesión
        </button>
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
                        {typeof item.icon === 'string' && (item.icon.startsWith('fa') || item.icon.includes('fa-')) ? (
                          <i className={`${item.icon} text-${item.color} fa-2x`}></i>
                        ) : (
                          <span style={{ fontSize: '1.6rem' }}>{item.icon}</span>
                        )}
                      </div>
                      <div className="text-end">
                        <h3 className={`text-${item.color} fw-bold mb-0`}>
                          {item.title === 'Resumen Financiero' ? formatCurrency(item.stat) : item.stat}
                        </h3>
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
                      {(() => {
                        const { viewLabel, newLabel } = getCardLabels(item.title);
                        return (
                          <>
                            <button
                              className={`btn btn-${item.color} btn-lg fw-semibold`}
                              onClick={() => navegarA(item.path)}
                              style={{ borderRadius: '10px' }}
                            >
                              {typeof item.icon === 'string' && (item.icon.startsWith('fa') || item.icon.includes('fa-')) ? (
                                <i className={`${item.icon} me-2`} />
                              ) : (
                                <span className="me-2" style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                              )}
                              Ver {viewLabel}
                            </button>
                            <button
                              className={`btn btn-outline-${item.color} fw-semibold`}
                              onClick={() => navegarA(item.newPath)}
                              style={{ borderRadius: '10px' }}
                            >
                              <i className="fas fa-plus me-2"></i>
                              Nuevo {newLabel}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Card de Empleados (se coloca en la zona del Resumen) */}
            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0 bg-white" style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                   onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="bg-purple bg-opacity-10 p-3 rounded-3">
                      <span style={{ fontSize: '1.6rem' }}>👤</span>
                    </div>
                    <div className="text-end">
                      <h3 className="text-purple fw-bold mb-0">&nbsp;</h3>
                      <small className="text-muted fw-semibold">Empleados</small>
                    </div>
                  </div>
                  <h5 className="card-title text-dark fw-bold mb-2">
                    Gestión de Empleados
                  </h5>
                  <p className="card-text text-muted small mb-3">
                    Administra los empleados, roles y permisos dentro del sistema.
                  </p>
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-purple btn-lg fw-semibold"
                      onClick={() => navegarA('/ver-empleados')}
                      style={{ borderRadius: '10px' }}
                    >
                      <span className="me-2" style={{ fontSize: '1.1rem' }}>👤</span>
                      Ver Empleados
                    </button>
                    <button
                      className="btn btn-outline-purple fw-semibold"
                      onClick={() => navegarA('/empleados')}
                      style={{ borderRadius: '10px' }}
                    >
                      <i className="fas fa-user-plus me-2"></i>
                      Nuevo Empleado
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Card de Ajustes colocada junto al Resumen */}
            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0 bg-white" style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                   onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="bg-secondary bg-opacity-10 p-3 rounded-3">
                      <i className="fas fa-cog text-secondary fa-2x"></i>
                    </div>
                    <div className="text-end">
                      <h3 className="text-secondary fw-bold mb-0">&nbsp;</h3>
                      <small className="text-muted fw-semibold">Ajustes</small>
                    </div>
                  </div>
                  <h5 className="card-title text-dark fw-bold mb-2">
                    Ajustes Generales
                  </h5>
                  <p className="card-text text-muted small mb-3">
                    Configuraciones del sistema y seguridad (contraseña, notificaciones, respaldos)
                  </p>
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-secondary btn-lg fw-semibold"
                      onClick={() => navegarA('/ajustes')}
                      style={{ borderRadius: '10px' }}
                    >
                      <i className="fas fa-cog me-2"></i>
                      Ver Ajustes
                    </button>
                    <button
                      className="btn btn-outline-secondary fw-semibold"
                      onClick={() => navegarA('/ajustes')}
                      style={{ borderRadius: '10px' }}
                    >
                      <i className="fas fa-sliders-h me-2"></i>
                      Configurar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de actividad reciente */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100 bg-white">
            <div className="card-header bg-gradient border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <h5 className="mb-0 fw-bold text-dark">
                <i className="fas fa-chart-line me-2"></i>
                Actividad Reciente
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
                  Atención: Préstamos Vencidos
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
