import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Resumen.css";

// Importar APIs
import { fetchMetricsSummary } from '../api/metrics';

function Resumen() {
  const navigate = useNavigate();
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
    averageLoanSize: 0,
    ticketPromedioPago: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const summary = await fetchMetricsSummary();
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
          averageLoanSize: summary.average_loan_size,
          ticketPromedioPago: summary.ticket_promedio_pago
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

  return (
    <div className="resumen-container">
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="resumen-title">
                  <i className="fas fa-chart-line me-3"></i>
                  Resumen Financiero
                </h1>
                <p className="text-muted">Panel completo de estadísticas del negocio</p>
              </div>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => navigate('/')}
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  Volver
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={loadDashboardData}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2"></i>
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="row g-4 mb-4">
          <div className="col-12 col-md-6 col-lg-3">
            <div className="stat-card stat-card-primary">
              <div className="stat-card-body">
                <div className="stat-icon">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <h2 className="stat-value">{formatCurrency(stats.montoTotalPrestado)}</h2>
                <p className="stat-label">Total Prestado</p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="stat-card stat-card-success">
              <div className="stat-card-body">
                <div className="stat-icon">
                  <i className="fas fa-hand-holding-usd"></i>
                </div>
                <h2 className="stat-value">{formatCurrency(stats.montoTotalRecaudado)}</h2>
                <p className="stat-label">Total Recaudado</p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="stat-card stat-card-warning">
              <div className="stat-card-body">
                <div className="stat-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <h2 className="stat-value">{formatCurrency(stats.saldoPendiente)}</h2>
                <p className="stat-label">⏱️ Saldo Pendiente</p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="stat-card stat-card-secondary">
              <div className="stat-card-body">
                <div className="stat-icon">
                  <i className="fas fa-balance-scale"></i>
                </div>
                <h2 className="stat-value">{formatCurrency(stats.averageLoanSize)}</h2>
                <p className="stat-label">Préstamo Promedio</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <div className="stat-card stat-card-dark">
              <div className="stat-card-body">
                <div className="stat-icon">
                  <i className="fas fa-receipt"></i>
                </div>
                <h2 className="stat-value">{formatCurrency(stats.ticketPromedioPago)}</h2>
                <p className="stat-label">Ticket Promedio Pago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas secundarias */}
        <div className="row g-3">
          <div className="col-12 col-sm-6 col-md-4 col-lg-2">
            <div className="metric-card">
              <div className="metric-icon metric-icon-primary">
                <i className="fas fa-play-circle"></i>
              </div>
              <h4 className="metric-value">{stats.prestamosActivos}</h4>
              <p className="metric-label">Préstamos Activos</p>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4 col-lg-2">
            <div className="metric-card">
              <div className="metric-icon metric-icon-danger">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <h4 className="metric-value">{stats.prestamosVencidos}</h4>
              <p className="metric-label">Préstamos Vencidos</p>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4 col-lg-2">
            <div className="metric-card">
              <div className="metric-icon metric-icon-success">
                <i className="fas fa-calendar-day"></i>
              </div>
              <h4 className="metric-value">{stats.pagosHoy}</h4>
              <p className="metric-label">Pagos Hoy</p>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4 col-lg-2">
            <div className="metric-card">
              <div className="metric-icon metric-icon-info">
                <i className="fas fa-user-check"></i>
              </div>
              <h4 className="metric-value">{stats.clientesActivos}</h4>
              <p className="metric-label">Clientes Activos</p>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4 col-lg-2">
            <div className="metric-card">
              <div className="metric-icon metric-icon-warning">
                <i className="fas fa-users"></i>
              </div>
              <h4 className="metric-value">{stats.totalClientes}</h4>
              <p className="metric-label">Total Clientes</p>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4 col-lg-2">
            <div className="metric-card">
              <div className="metric-icon metric-icon-secondary">
                <i className="fas fa-file-contract"></i>
              </div>
              <h4 className="metric-value">{stats.totalPrestamos}</h4>
              <p className="metric-label">Total Préstamos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Resumen;
