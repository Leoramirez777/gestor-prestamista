import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Resumen.css";

// Importar APIs
import { fetchMetricsSummary, fetchDueToday, fetchDueNext } from '../api/metrics';

function Resumen() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('today'); // 'today', 'custom'
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
    clientesActivos: 0,
    tasaRecaudo: 0,
    averageLoanSize: 0
  });
  const [dueToday, setDueToday] = useState({ monto_esperado_hoy: 0, cuotas_hoy: 0 });
  const [dueNext, setDueNext] = useState({ monto_proximos: 0, cuotas_proximas: 0, por_dia: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summary, due, next7] = await Promise.all([
        fetchMetricsSummary(),
        fetchDueToday(),
        fetchDueNext(7)
      ]);
      if (summary) {
        setStats({
          totalClientes: summary.total_clientes,
          totalPrestamos: summary.total_prestamos,
          totalPagos: summary.total_pagos,
          montoTotalPrestado: summary.monto_total_prestado,
            montoTotalRecaudado: summary.monto_total_recaudado,
          saldoPendiente: summary.saldo_pendiente_total,
          prestamosActivos: summary.prestamos_activos,
          prestamosVencidos: summary.prestamos_vencidos,
          pagosHoy: summary.pagos_hoy,
          clientesActivos: summary.clientes_activos,
          tasaRecaudo: summary.tasa_recaudo,
          averageLoanSize: summary.average_loan_size
        });
      }
      if (due) {
        setDueToday({
          monto_esperado_hoy: due.monto_esperado_hoy || 0,
          cuotas_hoy: due.cuotas_hoy || 0
        });
      }
      if (next7) {
        setDueNext({
          monto_proximos: next7.monto_proximos || 0,
          cuotas_proximas: next7.cuotas_proximas || 0,
          por_dia: next7.por_dia || []
        });
      }
    } catch (error) {
      console.error('Error al cargar métricas del backend:', error);
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

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="resumen-container">
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4 align-items-center">
          <div className="col-12">
            <div className="dashboard-header">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div>
                  <h1 className="resumen-title mb-2">
                    <i className="fas fa-chart-pie me-3"></i>
                    Dashboard Financiero
                  </h1>
                  <p className="text-muted mb-0">
                    {viewMode === 'today' ? 'Vista en tiempo real' : `Métricas del ${formatDate(selectedDate)}`}
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <div className="btn-group" role="group">
                    <button 
                      className={`btn ${viewMode === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => { setViewMode('today'); setSelectedDate(new Date().toISOString().split('T')[0]); }}
                    >
                      <i className="fas fa-calendar-day me-2"></i>
                      Hoy
                    </button>
                    <button 
                      className={`btn ${viewMode === 'custom' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setViewMode('custom')}
                    >
                      <i className="fas fa-calendar-alt me-2"></i>
                      Fecha específica
                    </button>
                  </div>
                  {viewMode === 'custom' && (
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{maxWidth: '180px'}}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  )}
                  <button 
                    className="btn btn-success"
                    onClick={loadDashboardData}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2"></i>
                    {loading ? 'Cargando...' : 'Actualizar'}
                  </button>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/')}
                  >
                    <i className="fas fa-home me-2"></i>
                    Inicio
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs principales - Grid mejorado */}
        <div className="row g-4 mb-4">
          <div className="col-12 col-md-6 col-lg-3">
            <div className="modern-card card-blue h-100">
              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="metric-icon-lg">
                    <i className="fas fa-money-bill-wave"></i>
                  </div>
                  <span className="badge bg-light text-dark">Total</span>
                </div>
                <div>
                  <h3 className="metric-title">Total Prestado</h3>
                  <h2 className="metric-amount mb-1">{formatCurrency(stats.montoTotalPrestado)}</h2>
                  <p className="metric-subtitle mb-0">
                    <i className="fas fa-file-contract me-1"></i>
                    {stats.totalPrestamos} préstamos
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="modern-card card-green h-100">
              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="metric-icon-lg">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <span className="badge bg-light text-dark">Recaudado</span>
                </div>
                <div>
                  <h3 className="metric-title">Total Recaudado</h3>
                  <h2 className="metric-amount mb-1">{formatCurrency(stats.montoTotalRecaudado)}</h2>
                  <p className="metric-subtitle mb-0">
                    <i className="fas fa-receipt me-1"></i>
                    {stats.totalPagos} pagos registrados
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="modern-card card-orange h-100">
              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="metric-icon-lg">
                    <i className="fas fa-hourglass-half"></i>
                  </div>
                  <span className="badge bg-light text-dark">Pendiente</span>
                </div>
                <div>
                  <h3 className="metric-title">Saldo Pendiente</h3>
                  <h2 className="metric-amount mb-1">{formatCurrency(stats.saldoPendiente)}</h2>
                  <p className="metric-subtitle mb-0">
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    {stats.prestamosVencidos} vencidos
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="modern-card card-purple h-100">
              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="metric-icon-lg">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <span className="badge bg-light text-dark">Promedio</span>
                </div>
                <div>
                  <h3 className="metric-title">Préstamo Promedio</h3>
                  <h2 className="metric-amount mb-1">{formatCurrency(stats.averageLoanSize)}</h2>
                  <p className="metric-subtitle mb-0">
                    <i className="fas fa-users me-1"></i>
                    {stats.clientesActivos} clientes activos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Actividad de Hoy */}
        <div className="row mb-3">
          <div className="col-12">
            <h5 className="section-title">
              <i className="fas fa-calendar-day me-2"></i>
              Actividad de Hoy
            </h5>
          </div>
        </div>
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="metric-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="metric-icon metric-icon-success">
                  <i className="fas fa-bullseye"></i>
                </div>
                <span className="badge bg-success">Esperado</span>
              </div>
              <h4 className="metric-value">{formatCurrency(dueToday.monto_esperado_hoy)}</h4>
              <p className="metric-label">Esperado Hoy</p>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="metric-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="metric-icon metric-icon-info">
                  <i className="fas fa-list-ol"></i>
                </div>
                <span className="badge bg-info">Cuotas</span>
              </div>
              <h4 className="metric-value">{dueToday.cuotas_hoy}</h4>
              <p className="metric-label">Cuotas Hoy</p>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="metric-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="metric-icon metric-icon-success">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <span className="badge bg-success">Pagos</span>
              </div>
              <h4 className="metric-value">{stats.pagosHoy}</h4>
              <p className="metric-label">Pagos Hoy</p>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="metric-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="metric-icon metric-icon-primary">
                  <i className="fas fa-play-circle"></i>
                </div>
                <span className="badge bg-primary">Activos</span>
              </div>
              <h4 className="metric-value">{stats.prestamosActivos}</h4>
              <p className="metric-label">Préstamos Activos</p>
            </div>
          </div>
        </div>

        {/* Sección: Próximos Vencimientos */}
        <div className="row mb-3">
          <div className="col-12">
            <h5 className="section-title">
              <i className="fas fa-clock me-2"></i>
              Próximos 7 Días
            </h5>
          </div>
        </div>
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="metric-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="metric-icon metric-icon-warning">
                  <i className="fas fa-hourglass-half"></i>
                </div>
                <span className="badge bg-warning text-dark">7 días</span>
              </div>
              <h4 className="metric-value">{formatCurrency(dueNext.monto_proximos)}</h4>
              <p className="metric-label">Vencen 7 días</p>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="metric-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="metric-icon metric-icon-secondary">
                  <i className="fas fa-stream"></i>
                </div>
                <span className="badge bg-secondary">Cuotas</span>
              </div>
              <h4 className="metric-value">{dueNext.cuotas_proximas}</h4>
              <p className="metric-label">Cuotas próximas</p>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="metric-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="metric-icon metric-icon-danger">
                  <i className="fas fa-exclamation-circle"></i>
                </div>
                <span className="badge bg-danger">Vencidos</span>
              </div>
              <h4 className="metric-value">{stats.prestamosVencidos}</h4>
              <p className="metric-label">Préstamos Vencidos</p>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="metric-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="metric-icon metric-icon-info">
                  <i className="fas fa-user-check"></i>
                </div>
                <span className="badge bg-info">Clientes</span>
              </div>
              <h4 className="metric-value">{stats.clientesActivos}</h4>
              <p className="metric-label">Clientes Activos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Resumen;
