import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Resumen.css";
import { formatCurrency } from '../utils/formatCurrency';
import { useSettingsStore } from '../stores/useSettingsStore';
import { 
  fetchMetricsSummary, 
  fetchPeriodMetrics, 
  fetchExpectativas,
  fetchTopClientes,
  fetchRentabilidad,
  fetchEvolucion
} from '../api/metrics';

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

function Resumen() {
  const navigate = useNavigate();
  // Pestañas principales (integradas aquí por defecto)
  const [activeTab, setActiveTab] = useState('resumen');
  const [resumenTab, setResumenTab] = useState('diario');
  const [expectativasTab, setExpectativasTab] = useState('fecha');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(getWeekRange(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDateExp, setSelectedDateExp] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeekExp, setSelectedWeekExp] = useState(getWeekRange(new Date()));
  const [selectedMonthExp, setSelectedMonthExp] = useState(new Date().toISOString().slice(0, 7));
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
      if (summaryData) setSummary(summaryData);
      await loadPeriodData();
      await loadExpectativas();
    } catch (e) {
      console.error('Error cargando métricas:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodData = async () => {
    try {
      let data;
      if (resumenTab === 'diario') data = await fetchPeriodMetrics('date', selectedDate);
      else if (resumenTab === 'semanal') data = await fetchPeriodMetrics('week', selectedWeek.start, selectedWeek.end);
      else if (resumenTab === 'mensual') data = await fetchPeriodMetrics('month', selectedMonth);
      if (data) setPeriodData(data);
    } catch (e) { console.error(e); }
  };

  const loadExpectativas = async () => {
    try {
      let data;
      if (expectativasTab === 'fecha') data = await fetchExpectativas('date', selectedDateExp);
      else if (expectativasTab === 'semana') data = await fetchExpectativas('week', selectedWeekExp.start, selectedWeekExp.end);
      else if (expectativasTab === 'mes') data = await fetchExpectativas('month', selectedMonthExp);
      if (data) setExpectativas(data);
    } catch (e) { console.error(e); }
  };

  const loadTopClientes = async () => {
    try { const data = await fetchTopClientes(10); if (data) setTopClientes(data); } catch (e) { console.error(e); }
  };
  const loadRentabilidad = async () => {
    try { const data = await fetchRentabilidad(); if (data) setRentabilidad(data); } catch (e) { console.error(e); }
  };
  const loadEvolucion = async () => {
    try { const data = await fetchEvolucion(periodoDias); if (data) setEvolucion(data); } catch (e) { console.error(e); }
  };

  const percentDisplay = (val) => ((val || 0) * 100).toFixed(1) + '%';

  const renderResumenTab = () => (
    <>
      <div className="section-header mb-3">
        <h5 className="section-title mb-0"><i className="fas fa-chart-bar me-2"></i>Totales Generales</h5>
      </div>
      <div className="metrics-grid mb-4">
        <div className="metric-row">
          <div className="metric-cell"><div className="metric-icon-circle yellow"><i className="fas fa-file-contract"></i></div><div className="metric-info"><span className="metric-label">Prestado</span><span className="metric-value">{formatCurrency(summary.monto_total_prestado || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle green"><i className="fas fa-check-circle"></i></div><div className="metric-info"><span className="metric-label">Prestado Con Intereses</span><span className="metric-value">{formatCurrency(summary.monto_total_esperado || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle blue"><i className="fas fa-hand-holding-usd"></i></div><div className="metric-info"><span className="metric-label">Por Cobrar</span><span className="metric-value">{formatCurrency(summary.saldo_pendiente_total || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle purple"><i className="fas fa-cash-register"></i></div><div className="metric-info"><span className="metric-label">Cobrado</span><span className="metric-value">{formatCurrency(summary.monto_total_recaudado || 0)}</span></div></div>
        </div>
        <div className="metric-row mt-3">
          <div className="metric-cell"><div className="metric-icon-circle red"><i className="fas fa-users"></i></div><div className="metric-info"><span className="metric-label">Clientes Activos</span><span className="metric-value">{summary.prestamos_activos || 0}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle orange"><i className="fas fa-percentage"></i></div><div className="metric-info"><span className="metric-label">Tasa de Activación</span><span className="metric-value">{percentDisplay(summary.activation_rate || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle gray"><i className="fas fa-exclamation-triangle"></i></div><div className="metric-info"><span className="metric-label">Préstamos Vencidos</span><span className="metric-value">{summary.prestamos_vencidos || 0}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle blue"><i className="fas fa-calculator"></i></div><div className="metric-info"><span className="metric-label">Préstamo Promedio</span><span className="metric-value">{formatCurrency(summary.average_loan_size || 0)}</span></div></div>
        </div>
        <div className="metric-row mt-3">
          {localStorage.getItem('role') === 'admin' ? (
            <>
              <div className="metric-cell"><div className="metric-icon-circle teal" style={{backgroundColor:'#20c997'}}><i className="fas fa-receipt"></i></div><div className="metric-info"><span className="metric-label">Comisiones Pagadas</span><span className="metric-value">{formatCurrency(summary.total_comisiones_pagadas || 0)}</span></div></div>
              <div className="metric-cell"><div className="metric-icon-circle dark" style={{backgroundColor:'#343a40'}}><i className="fas fa-coins"></i></div><div className="metric-info"><span className="metric-label">Ganancias Netas</span><span className="metric-value">{formatCurrency(summary.ganancias_netas || 0)}</span></div></div>
            </>
          ) : (
            summary.mis_ganancias !== undefined && (
              <div className="metric-cell"><div className="metric-icon-circle dark" style={{backgroundColor:'#343a40'}}><i className="fas fa-coins"></i></div><div className="metric-info"><span className="metric-label">Mis Ganancias Totales</span><span className="metric-value">{formatCurrency(summary.mis_ganancias || 0)}</span></div></div>
            )
          )}
          <div className="metric-cell"><div className="metric-icon-circle orange" style={{backgroundColor:'#fd7e14'}}><i className="fas fa-chart-line"></i></div><div className="metric-info"><span className="metric-label">Intereses Generados</span><span className="metric-value">{formatCurrency(summary.intereses_generados || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle blue" style={{backgroundColor:'#0d6efd'}}><i className="fas fa-percentage"></i></div><div className="metric-info"><span className="metric-label">Tasa Cobro</span><span className="metric-value">{percentDisplay(summary.tasa_cobro || 0)}</span></div></div>
        </div>
      </div>
      <div className="section-header mb-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <h5 className="section-title mb-0"><i className="fas fa-calendar-alt me-2"></i>Resumen por Período</h5>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <div className="btn-group" role="group">
              <button className={`btn btn-sm ${resumenTab === 'diario' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setResumenTab('diario')}><i className="fas fa-calendar-day me-1"></i>Diario</button>
              <button className={`btn btn-sm ${resumenTab === 'semanal' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setResumenTab('semanal')}><i className="fas fa-calendar-week me-1"></i>Semanal</button>
              <button className={`btn btn-sm ${resumenTab === 'mensual' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setResumenTab('mensual')}><i className="fas fa-calendar me-1"></i>Mensual</button>
            </div>
            {resumenTab === 'diario' && (<input type="date" className="form-control form-control-sm" style={{maxWidth:'160px'}} value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />)}
            {resumenTab === 'semanal' && (<div className="d-flex gap-2"><input type="date" className="form-control form-control-sm" style={{maxWidth:'140px'}} placeholder="Inicio" value={selectedWeek.start} onChange={e=>setSelectedWeek({...selectedWeek, start: e.target.value})} /><input type="date" className="form-control form-control-sm" style={{maxWidth:'140px'}} placeholder="Fin" value={selectedWeek.end} onChange={e=>setSelectedWeek({...selectedWeek, end: e.target.value})} /></div>)}
            {resumenTab === 'mensual' && (<input type="month" className="form-control form-control-sm" style={{maxWidth:'160px'}} value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} />)}
          </div>
        </div>
      </div>
      <div className="metrics-grid mb-4">
        <div className="metric-row">
          <div className="metric-cell"><div className="metric-icon-circle yellow"><i className="fas fa-file-invoice-dollar"></i></div><div className="metric-info"><span className="metric-label">Prestado</span><span className="metric-value">{formatCurrency(periodData.prestado || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle green"><i className="fas fa-layer-group"></i></div><div className="metric-info"><span className="metric-label">Prestado Con Intereses</span><span className="metric-value">{formatCurrency(periodData.prestado_con_intereses || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle purple"><i className="fas fa-cash-register"></i></div><div className="metric-info"><span className="metric-label">Cobrado</span><span className="metric-value">{formatCurrency(periodData.cobrado || 0)}</span></div></div>
          {localStorage.getItem('role') === 'admin' && (
            <div className="metric-cell"><div className="metric-icon-circle teal" style={{backgroundColor:'#20c997'}}><i className="fas fa-receipt"></i></div><div className="metric-info"><span className="metric-label">Comisiones Pagadas</span><span className="metric-value">{formatCurrency(periodData.comisiones_pagadas || 0)}</span></div></div>
          )}
        </div>
        <div className="metric-row mt-3">
          <div className="metric-cell"><div className="metric-icon-circle orange"><i className="fas fa-chart-line"></i></div><div className="metric-info"><span className="metric-label">Intereses Generados</span><span className="metric-value">{formatCurrency(periodData.intereses_generados || ((periodData.prestado_con_intereses || 0) - (periodData.prestado || 0)))}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle blue"><i className="fas fa-percentage"></i></div><div className="metric-info"><span className="metric-label">Tasa Cobro</span><span className="metric-value">{periodData.prestado_con_intereses > 0 ? ((periodData.cobrado || 0) / periodData.prestado_con_intereses * 100).toFixed(1) + '%' : '0%'}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle red"><i className="fas fa-balance-scale"></i></div><div className="metric-info"><span className="metric-label">Ganancias del Período</span><span className="metric-value">{formatCurrency((periodData.ganancias_netas !== undefined ? periodData.ganancias_netas : (periodData.cobrado || 0) - (periodData.comisiones_pagadas || 0)))}</span></div></div>
        </div>
      </div>
      <div className="section-header mb-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <h5 className="section-title mb-0"><i className="fas fa-bullseye me-2"></i>Expectativas de Cobro</h5>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <div className="btn-group" role="group">
              <button className={`btn btn-sm ${expectativasTab === 'fecha' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setExpectativasTab('fecha')}><i className="fas fa-calendar-day me-1"></i>Por Fecha</button>
              <button className={`btn btn-sm ${expectativasTab === 'semana' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setExpectativasTab('semana')}><i className="fas fa-calendar-week me-1"></i>Por Semana</button>
              <button className={`btn btn-sm ${expectativasTab === 'mes' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setExpectativasTab('mes')}><i className="fas fa-calendar me-1"></i>Por Mes</button>
            </div>
            {expectativasTab === 'fecha' && (<input type="date" className="form-control form-control-sm" style={{maxWidth:'160px'}} value={selectedDateExp} onChange={e=>setSelectedDateExp(e.target.value)} />)}
            {expectativasTab === 'semana' && (<div className="d-flex gap-2"><input type="date" className="form-control form-control-sm" style={{maxWidth:'140px'}} placeholder="Inicio" value={selectedWeekExp.start} onChange={e=>setSelectedWeekExp({...selectedWeekExp, start: e.target.value})} /><input type="date" className="form-control form-control-sm" style={{maxWidth:'140px'}} placeholder="Fin" value={selectedWeekExp.end} onChange={e=>setSelectedWeekExp({...selectedWeekExp, end: e.target.value})} /></div>)}
            {expectativasTab === 'mes' && (<input type="month" className="form-control form-control-sm" style={{maxWidth:'160px'}} value={selectedMonthExp} onChange={e=>setSelectedMonthExp(e.target.value)} />)}
            <div className="invisible">
            </div>
          </div>
        </div>
      </div>
      <div className="metrics-grid mb-4">
        <div className="metric-row">
          <div className="metric-cell"><div className="metric-icon-circle orange"><i className="fas fa-dollar-sign"></i></div><div className="metric-info"><span className="metric-label">Monto Esperado</span><span className="metric-value">{formatCurrency(expectativas.monto_esperado || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle blue"><i className="fas fa-list-ol"></i></div><div className="metric-info"><span className="metric-label">Cantidad de Cuotas</span><span className="metric-value">{expectativas.cantidad_cuotas || 0}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle green"><i className="fas fa-calculator"></i></div><div className="metric-info"><span className="metric-label">Promedio por Cuota</span><span className="metric-value">{expectativas.cantidad_cuotas > 0 ? formatCurrency((expectativas.monto_esperado || 0) / expectativas.cantidad_cuotas) : formatCurrency(0)}</span></div></div>
          {localStorage.getItem('role') !== 'admin' && expectativas.ganancias_esperadas !== undefined && (
            <div className="metric-cell"><div className="metric-icon-circle dark" style={{backgroundColor:'#343a40'}}><i className="fas fa-coins"></i></div><div className="metric-info"><span className="metric-label">Ganancias Esperadas</span><span className="metric-value">{formatCurrency(expectativas.ganancias_esperadas || 0)}</span></div></div>
          )}
        </div>
      </div>
    </>
  );

  const renderRentabilidadTab = () => (
    <>
      <div className="section-header mb-3"><h5 className="section-title mb-0"><i className="fas fa-chart-line me-2"></i>Análisis de Rentabilidad</h5></div>
      
      {/* Métricas Principales */}
      <div className="row g-4 mb-4">
        <div className="col-md-3"><div className="card border-0 shadow-sm h-100"><div className="card-body text-center"><div className="metric-icon-circle green mx-auto mb-3" style={{width:'70px',height:'70px'}}><i className="fas fa-percentage" style={{fontSize:'1.8rem'}}></i></div><h3 className="text-success mb-2">{rentabilidad.roi_porcentaje?.toFixed(2) || 0}%</h3><p className="text-muted mb-0 small">ROI</p></div></div></div>
        <div className="col-md-3"><div className="card border-0 shadow-sm h-100"><div className="card-body text-center"><div className="metric-icon-circle blue mx-auto mb-3" style={{width:'70px',height:'70px'}}><i className="fas fa-hand-holding-usd" style={{fontSize:'1.8rem'}}></i></div><h3 className="text-primary mb-2">{formatCurrency(rentabilidad.ganancias_netas || 0)}</h3><p className="text-muted mb-0 small">Ganancias Netas</p></div></div></div>
                {localStorage.getItem('role') === 'admin' && (
                  <div className="col-md-3"><div className="card border-0 shadow-sm h-100"><div className="card-body text-center"><div className="metric-icon-circle blue mx-auto mb-3" style={{width:'70px',height:'70px'}}><i className="fas fa-hand-holding-usd" style={{fontSize:'1.8rem'}}></i></div><h3 className="text-primary mb-2">{formatCurrency(rentabilidad.ganancias_netas || 0)}</h3><p className="text-muted mb-0 small">Ganancias Netas</p></div></div></div>
                )}
        <div className="col-md-3"><div className="card border-0 shadow-sm h-100"><div className="card-body text-center"><div className="metric-icon-circle purple mx-auto mb-3" style={{width:'70px',height:'70px'}}><i className="fas fa-chart-pie" style={{fontSize:'1.8rem'}}></i></div><h3 className="text-purple mb-2">{rentabilidad.margen_porcentaje?.toFixed(2) || 0}%</h3><p className="text-muted mb-0 small">Margen</p></div></div></div>
        <div className="col-md-3"><div className="card border-0 shadow-sm h-100"><div className="card-body text-center"><div className="metric-icon-circle orange mx-auto mb-3" style={{width:'70px',height:'70px'}}><i className="fas fa-sync-alt" style={{fontSize:'1.8rem'}}></i></div><h3 className="text-warning mb-2">{rentabilidad.tasa_recuperacion_porcentaje?.toFixed(2) || 0}%</h3><p className="text-muted mb-0 small">Tasa Recuperación</p></div></div></div>
      </div>

      {/* Capital y Recuperación */}
      <div className="section-header mb-3"><h6 className="mb-0"><i className="fas fa-wallet me-2"></i>Capital y Recuperación</h6></div>
      <div className="metrics-grid mb-4">
        <div className="metric-row">
          <div className="metric-cell"><div className="metric-icon-circle yellow"><i className="fas fa-coins"></i></div><div className="metric-info"><span className="metric-label">Capital Invertido</span><span className="metric-value">{formatCurrency(rentabilidad.capital_invertido || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle green"><i className="fas fa-check-circle"></i></div><div className="metric-info"><span className="metric-label">Capital Recuperado</span><span className="metric-value">{formatCurrency(rentabilidad.capital_recuperado || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle gray"><i className="fas fa-exclamation-triangle"></i></div><div className="metric-info"><span className="metric-label">Capital en Riesgo</span><span className="metric-value">{formatCurrency(rentabilidad.capital_en_riesgo || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle blue"><i className="fas fa-clock"></i></div><div className="metric-info"><span className="metric-label">Tiempo Promedio Recuperación</span><span className="metric-value">{rentabilidad.tiempo_promedio_recuperacion?.toFixed(1) || 0} días</span></div></div>
        </div>
      </div>

      {/* Ingresos y Ganancias */}
      <div className="section-header mb-3"><h6 className="mb-0"><i className="fas fa-chart-line me-2"></i>Ingresos y Ganancias</h6></div>
      <div className="metrics-grid mb-4">
        <div className="metric-row">
          <div className="metric-cell"><div className="metric-icon-circle green"><i className="fas fa-money-bill-wave"></i></div><div className="metric-info"><span className="metric-label">Total Recaudado</span><span className="metric-value">{formatCurrency(rentabilidad.total_recaudado || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle blue"><i className="fas fa-chart-line"></i></div><div className="metric-info"><span className="metric-label">Ganancias Brutas</span><span className="metric-value">{formatCurrency(rentabilidad.ganancias_brutas || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle purple"><i className="fas fa-percentage"></i></div><div className="metric-info"><span className="metric-label">Intereses Generados</span><span className="metric-value">{formatCurrency(rentabilidad.intereses_generados || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle orange"><i className="fas fa-hourglass-half"></i></div><div className="metric-info"><span className="metric-label">Intereses Pendientes</span><span className="metric-value">{formatCurrency(rentabilidad.intereses_pendientes || 0)}</span></div></div>
        </div>
      </div>

      {/* Eficiencia y Costos */}
      <div className="section-header mb-3"><h6 className="mb-0"><i className="fas fa-tachometer-alt me-2"></i>Eficiencia y Costos</h6></div>
      <div className="metrics-grid mb-4">
        <div className="metric-row">
          <div className="metric-cell"><div className="metric-icon-circle teal" style={{backgroundColor:'#20c997'}}><i className="fas fa-bullseye"></i></div><div className="metric-info"><span className="metric-label">Eficiencia de Cobro</span><span className="metric-value">{rentabilidad.eficiencia_cobro_porcentaje?.toFixed(2) || 0}%</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle red"><i className="fas fa-receipt"></i></div><div className="metric-info"><span className="metric-label">Total Comisiones</span><span className="metric-value">{formatCurrency(rentabilidad.total_comisiones || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle pink" style={{backgroundColor:'#e83e8c'}}><i className="fas fa-balance-scale"></i></div><div className="metric-info"><span className="metric-label">Ratio Comisiones</span><span className="metric-value">{rentabilidad.ratio_comisiones_porcentaje?.toFixed(2) || 0}%</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle indigo" style={{backgroundColor:'#6610f2'}}><i className="fas fa-user-tag"></i></div><div className="metric-info"><span className="metric-label">Costo por Cliente</span><span className="metric-value">{formatCurrency(rentabilidad.costo_adquisicion || 0)}</span></div></div>
        </div>
      </div>

      {/* Análisis de Cartera */}
      <div className="section-header mb-3"><h6 className="mb-0"><i className="fas fa-briefcase me-2"></i>Análisis de Cartera</h6></div>
      <div className="metrics-grid mb-4">
        <div className="metric-row">
          <div className="metric-cell"><div className="metric-icon-circle orange"><i className="fas fa-hourglass-half"></i></div><div className="metric-info"><span className="metric-label">Por Cobrar</span><span className="metric-value">{formatCurrency(rentabilidad.por_cobrar || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle blue"><i className="fas fa-calculator"></i></div><div className="metric-info"><span className="metric-label">Valor Promedio Préstamo</span><span className="metric-value">{formatCurrency(rentabilidad.valor_promedio_prestamo || 0)}</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle red"><i className="fas fa-exclamation-circle"></i></div><div className="metric-info"><span className="metric-label">Tasa de Morosidad</span><span className="metric-value">{rentabilidad.tasa_morosidad_porcentaje?.toFixed(2) || 0}%</span></div></div>
          <div className="metric-cell"><div className="metric-icon-circle gray"><i className="fas fa-file-invoice"></i></div><div className="metric-info"><span className="metric-label">Préstamos Vencidos</span><span className="metric-value">{rentabilidad.prestamos_vencidos || 0} / {rentabilidad.total_prestamos || 0}</span></div></div>
        </div>
      </div>
    </>
  );

  const renderClientesTab = () => (
    <>
      <div className="section-header mb-3"><h5 className="section-title mb-0"><i className="fas fa-trophy me-2"></i>Top Clientes</h5></div>
      <div className="row g-4">
        <div className="col-md-4"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-warning text-white"><h6 className="mb-0"><i className="fas fa-medal me-2"></i>Top por Monto Prestado</h6></div><div className="card-body p-0"><div className="list-group list-group-flush">{topClientes.top_por_monto?.slice(0,5).map((c,idx)=>(<div key={c.cliente_id} className="list-group-item d-flex justify-content-between align-items-center"><div><span className="badge bg-warning text-dark me-2">#{idx+1}</span><strong>{c.nombre}</strong><br/><small className="text-muted">{c.cantidad_prestamos} préstamos</small></div><span className="text-success fw-bold">{formatCurrency(c.total_prestado)}</span></div>))}</div></div></div></div>
        <div className="col-md-4"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-primary text-white"><h6 className="mb-0"><i className="fas fa-list-ol me-2"></i>Top por Cantidad</h6></div><div className="card-body p-0"><div className="list-group list-group-flush">{topClientes.top_por_cantidad?.slice(0,5).map((c,idx)=>(<div key={c.cliente_id} className="list-group-item d-flex justify-content-between align-items-center"><div><span className="badge bg-primary me-2">#{idx+1}</span><strong>{c.nombre}</strong><br/><small className="text-muted">{formatCurrency(c.total_prestado)}</small></div><span className="text-primary fw-bold">{c.cantidad_prestamos}</span></div>))}</div></div></div></div>
        <div className="col-md-4"><div className="card border-0 shadow-sm h-100"><div className="card-header bg-danger text-white"><h6 className="mb-0"><i className="fas fa-exclamation-triangle me-2"></i>Mayor Deuda Pendiente</h6></div><div className="card-body p-0"><div className="list-group list-group-flush">{topClientes.top_deudores?.slice(0,5).map((c,idx)=>(<div key={c.cliente_id} className="list-group-item d-flex justify-content-between align-items-center"><div><span className="badge bg-danger me-2">#{idx+1}</span><strong>{c.nombre}</strong><br/><small className="text-muted">{c.prestamos_activos} activos</small></div><span className="text-danger fw-bold">{formatCurrency(c.saldo_pendiente)}</span></div>))}</div></div></div></div>
      </div>
    </>
  );

  const renderTendenciasTab = () => {
    const maxPrestado = Math.max(...(evolucion.evolucion?.map(d=>d.prestado)||[0]));
    const maxCobrado = Math.max(...(evolucion.evolucion?.map(d=>d.cobrado)||[0]));
    const maxValue = Math.max(maxPrestado, maxCobrado);
    return (
      <>
        <div className="section-header mb-3"><div className="d-flex justify-content-between align-items-center"><h5 className="section-title mb-0"><i className="fas fa-chart-area me-2"></i>Evolución Temporal</h5><div className="d-flex gap-2"><select className="form-select form-select-sm" style={{maxWidth:'150px'}} value={periodoDias} onChange={e=>setPeriodoDias(Number(e.target.value))}><option value="7">Últimos 7 días</option><option value="15">Últimos 15 días</option><option value="30">Últimos 30 días</option><option value="60">Últimos 60 días</option><option value="90">Últimos 90 días</option></select></div></div></div>
        <div className="card border-0 shadow-sm mb-4"><div className="card-body"><div className="d-flex justify-content-between mb-3"><div><span className="badge bg-primary me-2"><i className="fas fa-arrow-up me-1"></i>Prestado</span><span className="badge bg-success"><i className="fas fa-arrow-down me-1"></i>Cobrado</span></div></div><div style={{height:'300px',overflowX:'auto'}}><div style={{minWidth:`${evolucion.evolucion?.length*40}px`,height:'280px',position:'relative'}}>{evolucion.evolucion?.map((d,idx)=>{const prestadoHeight=maxValue>0?(d.prestado/maxValue)*100:0;const cobradoHeight=maxValue>0?(d.cobrado/maxValue)*100:0;return(<div key={idx} style={{display:'inline-block',width:'35px',height:'100%',marginRight:'5px',position:'relative',verticalAlign:'bottom'}}><div style={{position:'absolute',bottom:'25px',left:'2px',width:'14px',height:`${prestadoHeight}%`,backgroundColor:'#0d6efd',borderRadius:'3px 3px 0 0'}} title={`Prestado: ${formatCurrency(d.prestado)}`}></div><div style={{position:'absolute',bottom:'25px',left:'19px',width:'14px',height:`${cobradoHeight}%`,backgroundColor:'#198754',borderRadius:'3px 3px 0 0'}} title={`Cobrado: ${formatCurrency(d.cobrado)}`}></div><div style={{position:'absolute',bottom:'0',left:'0',width:'100%',textAlign:'center',fontSize:'10px',transform:'rotate(-45deg)',transformOrigin:'left bottom',whiteSpace:'nowrap'}}>{new Date(d.fecha).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})}</div></div>);})}</div></div></div></div>
        <div className="row g-3">
          <div className="col-md-6"><div className="card border-0 shadow-sm"><div className="card-body"><h6 className="text-primary mb-3"><i className="fas fa-arrow-up me-2"></i>Resumen de Préstamos</h6>{(()=>{const totalPrestado=evolucion.evolucion?.reduce((s,d)=>s+d.prestado,0)||0;const promedioDiario=totalPrestado/(evolucion.evolucion?.length||1);const diasConPrestamos=evolucion.evolucion?.filter(d=>d.prestado>0).length||0;return(<><p className="mb-2"><strong>Total Prestado:</strong> {formatCurrency(totalPrestado)}</p><p className="mb-2"><strong>Promedio Diario:</strong> {formatCurrency(promedioDiario)}</p><p className="mb-0"><strong>Días con Actividad:</strong> {diasConPrestamos} de {evolucion.evolucion?.length||0}</p></>);})()}</div></div></div>
          <div className="col-md-6"><div className="card border-0 shadow-sm"><div className="card-body"><h6 className="text-success mb-3"><i className="fas fa-arrow-down me-2"></i>Resumen de Cobros</h6>{(()=>{const totalCobrado=evolucion.evolucion?.reduce((s,d)=>s+d.cobrado,0)||0;const promedioDiario=totalCobrado/(evolucion.evolucion?.length||1);const diasConCobros=evolucion.evolucion?.filter(d=>d.cobrado>0).length||0;return(<><p className="mb-2"><strong>Total Cobrado:</strong> {formatCurrency(totalCobrado)}</p><p className="mb-2"><strong>Promedio Diario:</strong> {formatCurrency(promedioDiario)}</p><p className="mb-0"><strong>Días con Cobros:</strong> {diasConCobros} de {evolucion.evolucion?.length||0}</p></>);})()}</div></div></div>
        </div>
      </>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'resumen') return renderResumenTab();
    if (activeTab === 'rentabilidad') return renderRentabilidadTab();
    if (activeTab === 'clientes') return renderClientesTab();
    if (activeTab === 'tendencias') return renderTendenciasTab();
    return null;
  };

  // Explicaciones de cada métrica
  const getExplicaciones = () => {
    switch (activeTab) {
      case 'resumen':
        return [
          { label: "Prestado", desc: "Monto total prestado (capital entregado)." },
          { label: "Prestado Con Intereses", desc: "Capital más intereses pactados (sin penalizaciones de mora)." },
          { label: "Por Cobrar", desc: "Saldo pendiente que aún no ha sido recuperado." },
          { label: "Cobrado", desc: "Monto total ya recuperado de los préstamos." },
          { label: "Clientes Activos", desc: "Cantidad de clientes con préstamos que no han sido totalmente cobrados." },
          { label: "Tasa de Activación", desc: "Porcentaje de clientes que han tomado préstamos respecto al total." },
          { label: "Préstamos Vencidos", desc: "Préstamos cuyo plazo terminó y aún tienen saldo pendiente." },
          { label: "Préstamo Promedio", desc: "Promedio del capital de cada préstamo." },
          { label: "Comisiones Pagadas", desc: "Total de comisiones desembolsadas (vendedor/cobrador)." },
          { label: "Intereses Generados", desc: "Diferencia entre monto pactado (monto_total) y capital (monto) sin incluir intereses de mora." },
          { label: "Tasa Cobro", desc: "Porcentaje cobrado respecto al total pactado (cobrado / prestado con intereses)." },
          { label: "Ganancias Netas", desc: "Cobrado menos comisiones pagadas (no incluye penalizaciones de mora)." },
          { label: "Monto Esperado", desc: "Total de cuotas programadas para cobrar en el período." },
          { label: "Cantidad de Cuotas", desc: "Número de cuotas que vencen en el período." },
          { label: "Promedio por Cuota", desc: "Promedio del monto de cada cuota en el período." },
          { label: "Ganancias del Período", desc: "Si eres empleado: tus comisiones cobradas en el período. Si eres admin: intereses recuperados en los pagos del período menos comisiones pagadas (nunca negativo)." }
        ];
      case 'rentabilidad':
        return [
          { label: "ROI (Retorno de Inversión)", desc: "Porcentaje de ganancia sobre el capital invertido. Fórmula: (Ganancias Netas / Capital Invertido) × 100." },
          { label: "Ganancias Netas", desc: "Total recaudado menos las comisiones pagadas a vendedores y cobradores." },
          { label: "Margen de Ganancia", desc: "Porcentaje de ganancia sobre el total recaudado. Fórmula: (Ganancias Netas / Total Recaudado) × 100." },
          { label: "Tasa de Recuperación", desc: "Porcentaje del capital invertido que ya has recuperado. Fórmula: (Total Recaudado / Capital Invertido) × 100." },
          { label: "Capital Invertido", desc: "Suma total del dinero prestado (capital) a todos los clientes." },
          { label: "Capital Recuperado", desc: "Parte del capital invertido que ya ha regresado." },
          { label: "Capital en Riesgo", desc: "Monto del capital que aún no ha sido recuperado de los préstamos activos." },
          { label: "Tiempo Promedio Recuperación", desc: "Cantidad promedio de días que tardas en recuperar completamente un préstamo." },
          { label: "Total Recaudado", desc: "Suma de todos los pagos recibidos de los clientes." },
          { label: "Ganancias Brutas", desc: "Intereses cobrados antes de comisiones (Total recaudado menos capital recuperado)." },
          { label: "Intereses Generados", desc: "Total de intereses pactados en todos los préstamos (sin mora)." },
          { label: "Intereses Pendientes", desc: "Intereses que aún faltan por cobrar de los préstamos activos." },
          { label: "Eficiencia de Cobro", desc: "Porcentaje de lo que has cobrado vs lo que deberías cobrar (capital + intereses). Fórmula: (Total Recaudado / Monto Total Esperado) × 100." },
          { label: "Total Comisiones", desc: "Suma de todas las comisiones pagadas a vendedores y cobradores." },
          { label: "Ratio Comisiones", desc: "Porcentaje que representan las comisiones sobre las ganancias brutas. Fórmula: (Total Comisiones / Ganancias Brutas) × 100." },
          { label: "Costo por Cliente", desc: "Promedio de comisiones pagadas por cada cliente activo. Útil para calcular el costo de adquisición." },
          { label: "Por Cobrar", desc: "Saldo pendiente total de todos los préstamos activos." },
          { label: "Valor Promedio Préstamo", desc: "Promedio del capital de cada préstamo otorgado." },
          { label: "Tasa de Morosidad", desc: "Porcentaje de préstamos vencidos sobre el total de préstamos. Indica el nivel de riesgo." },
          { label: "Préstamos Vencidos", desc: "Cantidad de préstamos que superaron su fecha de vencimiento y tienen saldo pendiente." }
        ];
      case 'clientes':
        return [
          { label: "Por Monto Prestado", desc: "Clientes ordenados por el capital total que se les ha prestado." },
          { label: "Por Recaudación", desc: "Clientes ordenados por el total de dinero que han pagado." },
          { label: "Por Saldo Pendiente", desc: "Clientes ordenados por el saldo que aún deben." },
          { label: "Por Cantidad de Préstamos", desc: "Clientes ordenados por cuántos préstamos han solicitado." },
          { label: "Cliente", desc: "Nombre completo del cliente." },
          { label: "Valor", desc: "Monto correspondiente según la métrica seleccionada." }
        ];
      case 'tendencias':
        return [
          { label: "Período de Análisis", desc: "Rango de días para visualizar la evolución (7, 30, 90 o 365 días)." },
          { label: "Prestado", desc: "Evolución del capital prestado por día." },
          { label: "Cobrado", desc: "Evolución del dinero recaudado por día." },
          { label: "Préstamos Activos", desc: "Cantidad de préstamos con saldo pendiente en cada fecha." },
          { label: "Tasa de Cobro", desc: "Porcentaje de recuperación diaria: (Cobrado / Prestado) × 100." },
          { label: "Tendencia", desc: "Dirección general de cada métrica (ascendente, descendente o estable)." }
        ];
      default:
        return [];
    }
  };
  
  const explicaciones = getExplicaciones();

  return (
    <div className="resumen-container">
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4 align-items-center">
          <div className="col-12">
            <div className="dashboard-header">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div>
                  <h1 className="resumen-title mb-2"><i className="fas fa-chart-pie me-3"></i>Dashboard Financiero</h1>
                  <p className="text-muted mb-0">Vista completa del negocio</p>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-success" onClick={loadDashboardData} disabled={loading}>
                    <i className="fas fa-sync-alt me-2"></i>{loading ? 'Cargando...' : 'Actualizar'}
                  </button>
                  <button className="btn btn-info" onClick={() => setShowInfo(true)}>
                    <i className="fas fa-info-circle me-2"></i>Información
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>
                    <i className="fas fa-home me-2"></i>Inicio
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
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item"><button className={`nav-link ${activeTab==='resumen'?'active':''}`} onClick={()=>setActiveTab('resumen')}><i className="fas fa-chart-bar me-2"></i>Resumen</button></li>
          <li className="nav-item"><button className={`nav-link ${activeTab==='rentabilidad'?'active':''}`} onClick={()=>setActiveTab('rentabilidad')}><i className="fas fa-chart-line me-2"></i>Rentabilidad</button></li>
          <li className="nav-item"><button className={`nav-link ${activeTab==='clientes'?'active':''}`} onClick={()=>setActiveTab('clientes')}><i className="fas fa-users me-2"></i>Top Clientes</button></li>
          <li className="nav-item"><button className={`nav-link ${activeTab==='tendencias'?'active':''}`} onClick={()=>setActiveTab('tendencias')}><i className="fas fa-chart-area me-2"></i>Tendencias</button></li>
        </ul>
        {renderTabContent()}
      </div>
    </div>
  );
}

export default Resumen;
