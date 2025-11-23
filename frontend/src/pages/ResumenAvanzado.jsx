import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Resumen.css";
import { formatCurrency } from '../utils/formatCurrency';
import { useSettingsStore } from '../stores/useSettingsStore';

// Importar APIs
import { 
  fetchMetricsSummary, 
  fetchPeriodMetrics, 
  fetchExpectativas,
  fetchTopClientes,
  fetchRentabilidad,
  fetchEvolucion
} from '../api/metrics';

// Helper para obtener rango de semana
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

function ResumenAvanzado() {
  const navigate = useNavigate();
  
  // Pestañas principales
  const [activeTab, setActiveTab] = useState('resumen'); // resumen, rentabilidad, clientes, tendencias
  
  // Estados para pestañas y filtros
  const [resumenTab, setResumenTab] = useState('diario');
  const [expectativasTab, setExpectativasTab] = useState('fecha');
  
  // Fechas seleccionadas
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(getWeekRange(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Estados de datos
  const [summary, setSummary] = useState({});
  const [periodData, setPeriodData] = useState({});
  const [expectativas, setExpectativas] = useState({});
  const [topClientes, setTopClientes] = useState({});
  const [rentabilidad, setRentabilidad] = useState({});
  const [evolucion, setEvolucion] = useState({ evolucion: [] });
  
  const [loading, setLoading] = useState(true);
  const [periodoDias, setPeriodoDias] = useState(30);
  const [showInfo, setShowInfo] = useState(false);

  const monedaSelected = useSettingsStore(state => state.moneda);

  useEffect(() => {
    loadDashboardData();
  }, [resumenTab, selectedDate, selectedWeek, selectedMonth, expectativasTab]);

  useEffect(() => {
    if (activeTab === 'clientes') {
      loadTopClientes();
    } else if (activeTab === 'rentabilidad') {
      loadRentabilidad();
    } else if (activeTab === 'tendencias') {
      loadEvolucion();
    }
  }, [activeTab, periodoDias]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const summaryData = await fetchMetricsSummary();
      if (summaryData) {
        setSummary(summaryData);
      }

      await loadPeriodData();
      await loadExpectativas();
      
    } catch (error) {
      console.error('Error al cargar métricas:', error);
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
        setPeriodData(data);
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
        setExpectativas(data);
      }
    } catch (error) {
      console.error('Error al cargar expectativas:', error);
    }
  };

  const loadTopClientes = async () => {
    try {
      const data = await fetchTopClientes(10);
      if (data) {
        setTopClientes(data);
      }
    } catch (error) {
      console.error('Error al cargar top clientes:', error);
    }
  };

  const loadRentabilidad = async () => {
    try {
      const data = await fetchRentabilidad();
      if (data) {
        setRentabilidad(data);
      }
    } catch (error) {
      console.error('Error al cargar rentabilidad:', error);
    }
  };

  const loadEvolucion = async () => {
    try {
      const data = await fetchEvolucion(periodoDias);
      if (data) {
        setEvolucion(data);
      }
    } catch (error) {
      console.error('Error al cargar evolución:', error);
    }
  };

  const percentDisplay = (val) => (val * 100).toFixed(1) + '%';

  const renderTabContent = () => {
    switch(activeTab) {
      case 'resumen':
        return renderResumenTab();
      case 'rentabilidad':
        return renderRentabilidadTab();
      case 'clientes':
        return renderClientesTab();
      case 'tendencias':
        return renderTendenciasTab();
      default:
        return null;
    }
  };

  const renderResumenTab = () => (
    <>
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
              <span className="metric-value">{formatCurrency(summary.monto_total_prestado || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle green">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Prestado Con Intereses</span>
              <span className="metric-value">{formatCurrency(summary.monto_total_esperado || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle blue">
              <i className="fas fa-hand-holding-usd"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Por Cobrar</span>
              <span className="metric-value">{formatCurrency(summary.saldo_pendiente_total || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle purple">
              <i className="fas fa-cash-register"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Cobrado</span>
              <span className="metric-value">{formatCurrency(summary.monto_total_recaudado || 0)}</span>
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
              <span className="metric-value">{summary.prestamos_activos || 0}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle orange">
              <i className="fas fa-percentage"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Tasa de Activación</span>
              <span className="metric-value">{percentDisplay(summary.activation_rate || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle gray">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Préstamos Vencidos</span>
              <span className="metric-value">{summary.prestamos_vencidos || 0}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle blue">
              <i className="fas fa-calculator"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Préstamo Promedio</span>
              <span className="metric-value">{formatCurrency(summary.average_loan_size || 0)}</span>
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
              <span className="metric-value">{formatCurrency(periodData.prestado || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle green">
              <i className="fas fa-layer-group"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Prestado Con Intereses</span>
              <span className="metric-value">{formatCurrency(periodData.prestado_con_intereses || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle blue">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Por Cobrar</span>
              <span className="metric-value">{formatCurrency(periodData.por_cobrar || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle purple">
              <i className="fas fa-cash-register"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Cobrado</span>
              <span className="metric-value">{formatCurrency(periodData.cobrado || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expectativas */}
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
              <span className="metric-value">{formatCurrency(expectativas.monto_esperado || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle blue">
              <i className="fas fa-list-ol"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Cantidad de Cuotas</span>
              <span className="metric-value">{expectativas.cantidad_cuotas || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderRentabilidadTab = () => (
    <>
      <div className="section-header mb-3">
        <h5 className="section-title mb-0">
          <i className="fas fa-chart-line me-2"></i>
          Análisis de Rentabilidad
        </h5>
      </div>
      
      <div className="row g-4 mb-4">
        {/* ROI Card */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="metric-icon-circle green mx-auto mb-3" style={{width: '80px', height: '80px'}}>
                <i className="fas fa-percentage" style={{fontSize: '2rem'}}></i>
              </div>
              <h3 className="text-success mb-2">{rentabilidad.roi_porcentaje?.toFixed(2) || 0}%</h3>
              <p className="text-muted mb-0">ROI (Retorno de Inversión)</p>
              <small className="text-muted">
                Rendimiento total del capital invertido
              </small>
            </div>
          </div>
        </div>

        {/* Ganancias Card */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="metric-icon-circle blue mx-auto mb-3" style={{width: '80px', height: '80px'}}>
                <i className="fas fa-hand-holding-usd" style={{fontSize: '2rem'}}></i>
              </div>
              <h3 className="text-primary mb-2">{formatCurrency(rentabilidad.ganancias_netas || 0)}</h3>
              <p className="text-muted mb-0">Ganancias Netas</p>
              <small className="text-muted">
                Después de comisiones
              </small>
            </div>
          </div>
        </div>

        {/* Margen Card */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="metric-icon-circle purple mx-auto mb-3" style={{width: '80px', height: '80px'}}>
                <i className="fas fa-chart-pie" style={{fontSize: '2rem'}}></i>
              </div>
              <h3 className="text-purple mb-2">{rentabilidad.margen_porcentaje?.toFixed(2) || 0}%</h3>
              <p className="text-muted mb-0">Margen de Ganancia</p>
              <small className="text-muted">
                Sobre el total recaudado
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Detalle Financiero */}
      <div className="metrics-grid">
        <div className="metric-row">
          <div className="metric-cell">
            <div className="metric-icon-circle yellow">
              <i className="fas fa-coins"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Capital Invertido</span>
              <span className="metric-value">{formatCurrency(rentabilidad.capital_invertido || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle green">
              <i className="fas fa-money-bill-wave"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Recaudado</span>
              <span className="metric-value">{formatCurrency(rentabilidad.total_recaudado || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle blue">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Ganancias Brutas</span>
              <span className="metric-value">{formatCurrency(rentabilidad.ganancias_brutas || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle red">
              <i className="fas fa-receipt"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Comisiones</span>
              <span className="metric-value">{formatCurrency(rentabilidad.total_comisiones || 0)}</span>
            </div>
          </div>
        </div>
        <div className="metric-row mt-3">
          <div className="metric-cell">
            <div className="metric-icon-circle orange">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Por Cobrar</span>
              <span className="metric-value">{formatCurrency(rentabilidad.por_cobrar || 0)}</span>
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-icon-circle gray">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="metric-info">
              <span className="metric-label">Capital en Riesgo</span>
              <span className="metric-value">{formatCurrency(rentabilidad.capital_en_riesgo || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderClientesTab = () => (
    <>
      <div className="section-header mb-3">
        <h5 className="section-title mb-0">
          <i className="fas fa-trophy me-2"></i>
          Top Clientes
        </h5>
      </div>

      <div className="row g-4">
        {/* Top por Monto */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-warning text-white">
              <h6 className="mb-0">
                <i className="fas fa-medal me-2"></i>
                Top por Monto Prestado
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {topClientes.top_por_monto?.slice(0, 5).map((c, idx) => (
                  <div key={c.cliente_id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <span className="badge bg-warning text-dark me-2">#{idx + 1}</span>
                      <strong>{c.nombre}</strong>
                      <br />
                      <small className="text-muted">{c.cantidad_prestamos} préstamos</small>
                    </div>
                    <span className="text-success fw-bold">{formatCurrency(c.total_prestado)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top por Cantidad */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">
                <i className="fas fa-list-ol me-2"></i>
                Top por Cantidad
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {topClientes.top_por_cantidad?.slice(0, 5).map((c, idx) => (
                  <div key={c.cliente_id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <span className="badge bg-primary me-2">#{idx + 1}</span>
                      <strong>{c.nombre}</strong>
                      <br />
                      <small className="text-muted">{formatCurrency(c.total_prestado)}</small>
                    </div>
                    <span className="text-primary fw-bold">{c.cantidad_prestamos}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Deudores */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-danger text-white">
              <h6 className="mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Mayor Deuda Pendiente
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {topClientes.top_deudores?.slice(0, 5).map((c, idx) => (
                  <div key={c.cliente_id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <span className="badge bg-danger me-2">#{idx + 1}</span>
                      <strong>{c.nombre}</strong>
                      <br />
                      <small className="text-muted">{c.prestamos_activos} activos</small>
                    </div>
                    <span className="text-danger fw-bold">{formatCurrency(c.saldo_pendiente)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderTendenciasTab = () => {
    const maxPrestado = Math.max(...(evolucion.evolucion?.map(d => d.prestado) || [0]));
    const maxCobrado = Math.max(...(evolucion.evolucion?.map(d => d.cobrado) || [0]));
    const maxValue = Math.max(maxPrestado, maxCobrado);

    return (
      <>
        <div className="section-header mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="section-title mb-0">
              <i className="fas fa-chart-area me-2"></i>
              Evolución Temporal
            </h5>
            <div className="d-flex gap-2">
              <select 
                className="form-select form-select-sm" 
                style={{maxWidth: '150px'}}
                value={periodoDias}
                onChange={(e) => setPeriodoDias(Number(e.target.value))}
              >
                <option value="7">Últimos 7 días</option>
                <option value="15">Últimos 15 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="60">Últimos 60 días</option>
                <option value="90">Últimos 90 días</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between mb-3">
              <div>
                <span className="badge bg-primary me-2">
                  <i className="fas fa-arrow-up me-1"></i>
                  Prestado
                </span>
                <span className="badge bg-success">
                  <i className="fas fa-arrow-down me-1"></i>
                  Cobrado
                </span>
              </div>
            </div>
            <div style={{height: '300px', overflowX: 'auto'}}>
              <div style={{minWidth: `${evolucion.evolucion?.length * 40}px`, height: '280px', position: 'relative'}}>
                {evolucion.evolucion?.map((d, idx) => {
                  const prestadoHeight = maxValue > 0 ? (d.prestado / maxValue) * 100 : 0;
                  const cobradoHeight = maxValue > 0 ? (d.cobrado / maxValue) * 100 : 0;
                  
                  return (
                    <div 
                      key={idx} 
                      style={{
                        display: 'inline-block',
                        width: '35px',
                        height: '100%',
                        marginRight: '5px',
                        position: 'relative',
                        verticalAlign: 'bottom'
                      }}
                    >
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '25px',
                          left: '2px',
                          width: '14px',
                          height: `${prestadoHeight}%`,
                          backgroundColor: '#0d6efd',
                          borderRadius: '3px 3px 0 0'
                        }}
                        title={`Prestado: ${formatCurrency(d.prestado)}`}
                      />
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '25px',
                          left: '19px',
                          width: '14px',
                          height: `${cobradoHeight}%`,
                          backgroundColor: '#198754',
                          borderRadius: '3px 3px 0 0'
                        }}
                        title={`Cobrado: ${formatCurrency(d.cobrado)}`}
                      />
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          width: '100%',
                          textAlign: 'center',
                          fontSize: '10px',
                          transform: 'rotate(-45deg)',
                          transformOrigin: 'left bottom',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen estadístico */}
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="text-primary mb-3">
                  <i className="fas fa-arrow-up me-2"></i>
                  Resumen de Préstamos
                </h6>
                {(() => {
                  const totalPrestado = evolucion.evolucion?.reduce((sum, d) => sum + d.prestado, 0) || 0;
                  const promedioDiario = totalPrestado / (evolucion.evolucion?.length || 1);
                  const diasConPrestamos = evolucion.evolucion?.filter(d => d.prestado > 0).length || 0;
                  
                  return (
                    <>
                      <p className="mb-2">
                        <strong>Total Prestado:</strong> {formatCurrency(totalPrestado)}
                      </p>
                      <p className="mb-2">
                        <strong>Promedio Diario:</strong> {formatCurrency(promedioDiario)}
                      </p>
                      <p className="mb-0">
                        <strong>Días con Actividad:</strong> {diasConPrestamos} de {evolucion.evolucion?.length || 0}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="text-success mb-3">
                  <i className="fas fa-arrow-down me-2"></i>
                  Resumen de Cobros
                </h6>
                {(() => {
                  const totalCobrado = evolucion.evolucion?.reduce((sum, d) => sum + d.cobrado, 0) || 0;
                  const promedioDiario = totalCobrado / (evolucion.evolucion?.length || 1);
                  const diasConCobros = evolucion.evolucion?.filter(d => d.cobrado > 0).length || 0;
                  
                  return (
                    <>
                      <p className="mb-2">
                        <strong>Total Cobrado:</strong> {formatCurrency(totalCobrado)}
                      </p>
                      <p className="mb-2">
                        <strong>Promedio Diario:</strong> {formatCurrency(promedioDiario)}
                      </p>
                      <p className="mb-0">
                        <strong>Días con Cobros:</strong> {diasConCobros} de {evolucion.evolucion?.length || 0}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const explicaciones = [
    { label: "Prestado", desc: "Monto total de dinero prestado a los clientes." },
    { label: "Prestado Con Intereses", desc: "Monto total esperado incluyendo intereses generados." },
    { label: "Por Cobrar", desc: "Saldo pendiente que aún no ha sido cobrado." },
    { label: "Cobrado", desc: "Monto total que ya ha sido cobrado de los préstamos." },
    { label: "Clientes Activos", desc: "Cantidad de clientes con préstamos activos." },
    { label: "Tasa de Activación", desc: "Porcentaje de clientes que han tomado préstamos respecto al total." },
    { label: "Préstamos Vencidos", desc: "Cantidad de préstamos que han superado su fecha de vencimiento." },
    { label: "Préstamo Promedio", desc: "Monto promedio de los préstamos otorgados." },
    { label: "Comisiones Pagadas", desc: "Total de comisiones pagadas por la gestión de préstamos." },
    { label: "Ganancias Netas", desc: "Ganancia total después de descontar comisiones y costos." },
    { label: "Intereses Cobrados", desc: "Monto total de intereses efectivamente cobrados." },
    { label: "Comisión Vendedor", desc: "Comisiones pagadas a vendedores por préstamos gestionados." }
  ];

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
                    Dashboard Financiero Avanzado
                  </h1>
                  <p className="text-muted mb-0">
                    Análisis completo del negocio
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
                    className="btn btn-info"
                    onClick={() => setShowInfo(true)}
                  >
                    <i className="fas fa-info-circle me-2"></i>
                    Información
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
        {/* Modal de información */}
        {showInfo && (
          <div className="modal fade show" style={{display:'block',background:'rgba(0,0,0,0.3)'}} tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="fas fa-info-circle me-2"></i>Explicación de métricas</h5>
                  <button type="button" className="btn-close" onClick={() => setShowInfo(false)}></button>
                </div>
                <div className="modal-body">
                  <ul className="list-group">
                    {explicaciones.map((item, idx) => (
                      <li key={idx} className="list-group-item">
                        <strong>{item.label}:</strong> {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowInfo(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Pestañas principales */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'resumen' ? 'active' : ''}`}
              onClick={() => setActiveTab('resumen')}
            >
              <i className="fas fa-chart-bar me-2"></i>
              Resumen
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'rentabilidad' ? 'active' : ''}`}
              onClick={() => setActiveTab('rentabilidad')}
            >
              <i className="fas fa-chart-line me-2"></i>
              Rentabilidad
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'clientes' ? 'active' : ''}`}
              onClick={() => setActiveTab('clientes')}
            >
              <i className="fas fa-users me-2"></i>
              Top Clientes
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'tendencias' ? 'active' : ''}`}
              onClick={() => setActiveTab('tendencias')}
            >
              <i className="fas fa-chart-area me-2"></i>
              Tendencias
            </button>
          </li>
        </ul>

        {/* Contenido de la pestaña activa */}
        {renderTabContent()}
      </div>
    </div>
  );
}

export default ResumenAvanzado;
