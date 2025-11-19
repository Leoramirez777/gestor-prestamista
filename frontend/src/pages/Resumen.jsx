import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Resumen.css";
import { formatCurrency } from '../utils/formatCurrency';
import { useSettingsStore } from '../stores/useSettingsStore';

// Importar APIs
import { fetchMetricsSummary, fetchPeriodMetrics, fetchExpectativas } from '../api/metrics';

// Helper para obtener rango de semana
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

function Resumen() {
  const navigate = useNavigate();
  // Estados para pestañas y filtros
  const [resumenTab, setResumenTab] = useState('diario'); // diario, semanal, mensual
  const [expectativasTab, setExpectativasTab] = useState('fecha'); // fecha, semana, mes
  
  // Fechas seleccionadas
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(getWeekRange(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // General summary stats (independientes del rango diario)
  const [summary, setSummary] = useState({
    total_prestamos: 0,
    monto_total_prestado: 0,
    monto_total_recaudado: 0,
    monto_total_esperado: 0,
    saldo_pendiente_total: 0,
    prestamos_activos: 0,
    prestamos_vencidos: 0,
    average_loan_size: 0,
    activation_rate: 0
  });

  // Resumen del período actual
  const [periodData, setPeriodData] = useState({
    prestado: 0,
    prestado_con_intereses: 0,
    por_cobrar: 0,
    cobrado: 0
  });

  // Expectativas (lo que se espera cobrar)
  const [expectativas, setExpectativas] = useState({
    monto_esperado: 0,
    cantidad_cuotas: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [resumenTab, selectedDate, selectedWeek, selectedMonth, expectativasTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Siempre cargar totales generales
      const summaryData = await fetchMetricsSummary();
      if (summaryData) {
        setSummary({
          total_prestamos: summaryData.total_prestamos || 0,
          monto_total_prestado: summaryData.monto_total_prestado || 0,
          monto_total_recaudado: summaryData.monto_total_recaudado || 0,
          monto_total_esperado: summaryData.monto_total_esperado || 0,
          saldo_pendiente_total: summaryData.saldo_pendiente_total || 0,
          prestamos_activos: summaryData.prestamos_activos || 0,
          prestamos_vencidos: summaryData.prestamos_vencidos || 0,
          average_loan_size: summaryData.average_loan_size || 0,
          activation_rate: summaryData.activation_rate || 0
        });
      }

      // Cargar datos del período según pestaña activa
      await loadPeriodData();
      
      // Cargar expectativas según pestaña activa
      await loadExpectativas();
      
    } catch (error) {
      console.error('Error al cargar métricas del backend:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodData = async () => {
    try {
      let data;
      if (resumenTab === 'diario') {
        data = await fetchPeriodMetrics('date', selectedDate);
      } else if (resumenTab === 'semanal') {
        data = await fetchPeriodMetrics('week', selectedWeek.start, selectedWeek.end);
      } else if (resumenTab === 'mensual') {
        data = await fetchPeriodMetrics('month', selectedMonth);
      }
      
      if (data) {
        setPeriodData({
          prestado: data.prestado || 0,
          prestado_con_intereses: data.prestado_con_intereses || 0,
          por_cobrar: data.por_cobrar || 0,
          cobrado: data.cobrado || 0
        });
      }
    } catch (error) {
      console.error('Error al cargar datos del período:', error);
    }
  };

  const loadExpectativas = async () => {
    try {
      let data;
      if (expectativasTab === 'fecha') {
        data = await fetchExpectativas('date', selectedDate);
      } else if (expectativasTab === 'semana') {
        data = await fetchExpectativas('week', selectedWeek.start, selectedWeek.end);
      } else if (expectativasTab === 'mes') {
        data = await fetchExpectativas('month', selectedMonth);
      }
      
      if (data) {
        setExpectativas({
          monto_esperado: data.monto_esperado || 0,
          cantidad_cuotas: data.cantidad_cuotas || 0
        });
      }
    } catch (error) {
      console.error('Error al cargar expectativas:', error);
    }
  };

  // formatCurrency imported from utils (usa la moneda del store/localStorage)
  // Suscribirse a la moneda para forzar re-render cuando cambie
  const monedaSelected = useSettingsStore(state => state.moneda);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const percentDisplay = (val) => (val * 100).toFixed(1) + '%';

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
                    Vista completa del negocio
                  </p>
                </div>
                <div className="d-flex gap-2">
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

        {/* Totales Generales */}
        <div className="section-header mb-3">
          <h5 className="section-title mb-0">
            <i className="fas fa-chart-bar me-2"></i>
            Totales Generales
          </h5>
        </div>
        <div className="metrics-grid mb-4">
          <div className="metric-row">
            <div className="metric-cell">
              <div className="metric-icon-circle yellow">
                <i className="fas fa-file-contract"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Prestado</span>
                <span className="metric-value">{formatCurrency(summary.monto_total_prestado)}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle green">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Prestado Con Intereses</span>
                <span className="metric-value">{formatCurrency(summary.monto_total_esperado)}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle blue">
                <i className="fas fa-hand-holding-usd"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Por Cobrar</span>
                <span className="metric-value">{formatCurrency(summary.saldo_pendiente_total)}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle purple">
                <i className="fas fa-cash-register"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Cobrado</span>
                <span className="metric-value">{formatCurrency(summary.monto_total_recaudado)}</span>
              </div>
            </div>
          </div>
          <div className="metric-row mt-3">
            <div className="metric-cell">
              <div className="metric-icon-circle red">
                <i className="fas fa-users"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Clientes Activos</span>
                <span className="metric-value">{summary.prestamos_activos}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle orange">
                <i className="fas fa-percentage"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Tasa de Activación</span>
                <span className="metric-value">{percentDisplay(summary.activation_rate)}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle gray">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Préstamos Vencidos</span>
                <span className="metric-value">{summary.prestamos_vencidos}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle blue">
                <i className="fas fa-calculator"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Préstamo Promedio</span>
                <span className="metric-value">{formatCurrency(summary.average_loan_size)}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Resumen por Período */}
        <div className="section-header mb-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h5 className="section-title mb-0">
              <i className="fas fa-calendar-alt me-2"></i>
              Resumen por Período
            </h5>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <div className="btn-group" role="group">
                <button 
                  className={`btn btn-sm ${resumenTab === 'diario' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setResumenTab('diario')}
                >
                  <i className="fas fa-calendar-day me-1"></i>
                  Diario
                </button>
                <button 
                  className={`btn btn-sm ${resumenTab === 'semanal' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setResumenTab('semanal')}
                >
                  <i className="fas fa-calendar-week me-1"></i>
                  Semanal
                </button>
                <button 
                  className={`btn btn-sm ${resumenTab === 'mensual' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setResumenTab('mensual')}
                >
                  <i className="fas fa-calendar me-1"></i>
                  Mensual
                </button>
              </div>
              
              {resumenTab === 'diario' && (
                <input 
                  type="date" 
                  className="form-control form-control-sm" 
                  style={{maxWidth: '160px'}}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              )}
              
              {resumenTab === 'semanal' && (
                <input 
                  type="week" 
                  className="form-control form-control-sm" 
                  style={{maxWidth: '160px'}}
                  value={`${selectedWeek.start.slice(0,4)}-W${Math.ceil((new Date(selectedWeek.start) - new Date(selectedWeek.start.slice(0,4), 0, 1)) / 604800000)}`}
                  onChange={(e) => {
                    const [year, week] = e.target.value.split('-W');
                    const firstDay = new Date(year, 0, 1 + (week - 1) * 7);
                    setSelectedWeek(getWeekRange(firstDay));
                  }}
                />
              )}
              
              {resumenTab === 'mensual' && (
                <input 
                  type="month" 
                  className="form-control form-control-sm" 
                  style={{maxWidth: '160px'}}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>
        <div className="metrics-grid mb-4">
          <div className="metric-row">
            <div className="metric-cell">
              <div className="metric-icon-circle yellow">
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Prestado</span>
                <span className="metric-value">{formatCurrency(periodData.prestado)}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle green">
                <i className="fas fa-layer-group"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Prestado Con Intereses</span>
                <span className="metric-value">{formatCurrency(periodData.prestado_con_intereses)}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle blue">
                <i className="fas fa-hourglass-half"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Por Cobrar</span>
                <span className="metric-value">{formatCurrency(periodData.por_cobrar)}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle purple">
                <i className="fas fa-cash-register"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Cobrado</span>
                <span className="metric-value">{formatCurrency(periodData.cobrado)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expectativas (Lo que se espera cobrar) */}
        <div className="section-header mb-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h5 className="section-title mb-0">
              <i className="fas fa-bullseye me-2"></i>
              Expectativas de Cobro
            </h5>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <div className="btn-group" role="group">
                <button 
                  className={`btn btn-sm ${expectativasTab === 'fecha' ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setExpectativasTab('fecha')}
                >
                  <i className="fas fa-calendar-day me-1"></i>
                  Por Fecha
                </button>
                <button 
                  className={`btn btn-sm ${expectativasTab === 'semana' ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setExpectativasTab('semana')}
                >
                  <i className="fas fa-calendar-week me-1"></i>
                  Por Semana
                </button>
                <button 
                  className={`btn btn-sm ${expectativasTab === 'mes' ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setExpectativasTab('mes')}
                >
                  <i className="fas fa-calendar me-1"></i>
                  Por Mes
                </button>
              </div>
              
              {expectativasTab === 'fecha' && (
                <input 
                  type="date" 
                  className="form-control form-control-sm" 
                  style={{maxWidth: '160px'}}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              )}
              
              {expectativasTab === 'semana' && (
                <input 
                  type="week" 
                  className="form-control form-control-sm" 
                  style={{maxWidth: '160px'}}
                  value={`${selectedWeek.start.slice(0,4)}-W${Math.ceil((new Date(selectedWeek.start) - new Date(selectedWeek.start.slice(0,4), 0, 1)) / 604800000)}`}
                  onChange={(e) => {
                    const [year, week] = e.target.value.split('-W');
                    const firstDay = new Date(year, 0, 1 + (week - 1) * 7);
                    setSelectedWeek(getWeekRange(firstDay));
                  }}
                />
              )}
              
              {expectativasTab === 'mes' && (
                <input 
                  type="month" 
                  className="form-control form-control-sm" 
                  style={{maxWidth: '160px'}}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>
        <div className="metrics-grid mb-4">
          <div className="metric-row two-cols">
            <div className="metric-cell">
              <div className="metric-icon-circle orange">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Monto Esperado</span>
                <span className="metric-value">{formatCurrency(expectativas.monto_esperado)}</span>
              </div>
            </div>
            <div className="metric-cell">
              <div className="metric-icon-circle blue">
                <i className="fas fa-list-ol"></i>
              </div>
              <div className="metric-info">
                <span className="metric-label">Cantidad de Cuotas</span>
                <span className="metric-value">{expectativas.cantidad_cuotas}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Resumen;
