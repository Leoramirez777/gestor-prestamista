import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Resumen.css";

// Importar APIs
import { fetchClientes } from '../api/clientes';
import { fetchPrestamos } from '../api/prestamos';
import { fetchPagos } from '../api/pagos';

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
    clientesActivos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
                <p className="stat-label">💰 Total Prestado</p>
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
                <p className="stat-label">💵 Total Recaudado</p>
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
            <div className="stat-card stat-card-info">
              <div className="stat-card-body">
                <div className="stat-icon">
                  <i className="fas fa-percentage"></i>
                </div>
                <h2 className="stat-value">
                  {stats.montoTotalPrestado > 0 
                    ? Math.round((stats.montoTotalRecaudado / stats.montoTotalPrestado) * 100) 
                    : 0}%
                </h2>
                <p className="stat-label">Tasa de Recaudo</p>
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
