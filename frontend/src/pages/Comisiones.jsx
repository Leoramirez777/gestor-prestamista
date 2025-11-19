import React, { useState, useEffect } from 'react';
import { 
  fetchResumenVendedor, 
  fetchDetalleVendedor, 
  fetchResumenCobrador,
  fetchComisionesDia,
  fetchRankingEmpleados 
} from '../api/comisiones';
import { fetchEmpleados } from '../api/empleados';
import '../styles/Comisiones.css';

function Comisiones() {
  const [activeTab, setActiveTab] = useState('ranking');
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpleado, setSelectedEmpleado] = useState('');
  const [tipoEmpleado, setTipoEmpleado] = useState('vendedor');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [fechaDia, setFechaDia] = useState(new Date().toISOString().split('T')[0]);
  
  // Estados para datos
  const [resumenVendedor, setResumenVendedor] = useState(null);
  const [detalleVendedor, setDetalleVendedor] = useState([]);
  const [resumenCobrador, setResumenCobrador] = useState(null);
  const [comisionesDia, setComisionesDia] = useState(null);
  const [ranking, setRanking] = useState({ vendedores: [], cobradores: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmpleados();
    loadRanking();
    loadComisionesDia();
  }, []);

  const loadEmpleados = async () => {
    try {
      const data = await fetchEmpleados();
      setEmpleados(data);
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  };

  const loadRanking = async () => {
    setLoading(true);
    try {
      const data = await fetchRankingEmpleados(fechaDesde, fechaHasta);
      setRanking(data);
    } catch (error) {
      console.error('Error cargando ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComisionesDia = async () => {
    try {
      const data = await fetchComisionesDia(fechaDia);
      setComisionesDia(data);
    } catch (error) {
      console.error('Error cargando comisiones del día:', error);
    }
  };

  const loadResumenEmpleado = async () => {
    if (!selectedEmpleado) return;
    
    setLoading(true);
    try {
      if (tipoEmpleado === 'vendedor') {
        const resumen = await fetchResumenVendedor(selectedEmpleado, fechaDesde, fechaHasta);
        const detalle = await fetchDetalleVendedor(selectedEmpleado);
        setResumenVendedor(resumen);
        setDetalleVendedor(detalle);
      } else {
        const resumen = await fetchResumenCobrador(selectedEmpleado, fechaDesde, fechaHasta);
        setResumenCobrador(resumen);
      }
    } catch (error) {
      console.error('Error cargando resumen:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  return (
    <div className="comisiones-container">
      <h1 className="page-title">
        <i className="fas fa-hand-holding-usd"></i> Comisiones
      </h1>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'ranking' ? 'active' : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          <i className="fas fa-trophy"></i> Ranking
        </button>
        <button 
          className={`tab ${activeTab === 'dia' ? 'active' : ''}`}
          onClick={() => setActiveTab('dia')}
        >
          <i className="fas fa-calendar-day"></i> Del Día
        </button>
        <button 
          className={`tab ${activeTab === 'empleado' ? 'active' : ''}`}
          onClick={() => setActiveTab('empleado')}
        >
          <i className="fas fa-user"></i> Por Empleado
        </button>
      </div>

      {/* Contenido según tab activo */}
      <div className="tab-content">
        {/* TAB: Ranking */}
        {activeTab === 'ranking' && (
          <div className="ranking-section">
            <div className="filters-row">
              <div className="form-group">
                <label>Fecha Desde</label>
                <input 
                  type="date" 
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Fecha Hasta</label>
                <input 
                  type="date" 
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={loadRanking}>
                <i className="fas fa-search"></i> Consultar
              </button>
            </div>

            <div className="ranking-grid">
              {/* Ranking Vendedores */}
              <div className="ranking-card">
                <h3><i className="fas fa-handshake"></i> Top Vendedores</h3>
                {ranking.vendedores.length === 0 ? (
                  <p className="no-data">No hay comisiones registradas</p>
                ) : (
                  <table className="ranking-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Empleado</th>
                        <th>Comisiones</th>
                        <th>Pagos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.vendedores.map((v, idx) => (
                        <tr key={v.empleado_id}>
                          <td className="position">
                            {idx === 0 && <i className="fas fa-trophy gold"></i>}
                            {idx === 1 && <i className="fas fa-medal silver"></i>}
                            {idx === 2 && <i className="fas fa-medal bronze"></i>}
                            {idx > 2 && `${idx + 1}°`}
                          </td>
                          <td>{v.empleado_nombre}</td>
                          <td className="amount">{formatCurrency(v.total_comisiones)}</td>
                          <td>{v.cantidad_pagos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Ranking Cobradores */}
              <div className="ranking-card">
                <h3><i className="fas fa-money-bill-wave"></i> Top Cobradores</h3>
                {ranking.cobradores.length === 0 ? (
                  <p className="no-data">No hay comisiones registradas</p>
                ) : (
                  <table className="ranking-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Empleado</th>
                        <th>Comisiones</th>
                        <th>Pagos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.cobradores.map((c, idx) => (
                        <tr key={c.empleado_id}>
                          <td className="position">
                            {idx === 0 && <i className="fas fa-trophy gold"></i>}
                            {idx === 1 && <i className="fas fa-medal silver"></i>}
                            {idx === 2 && <i className="fas fa-medal bronze"></i>}
                            {idx > 2 && `${idx + 1}°`}
                          </td>
                          <td>{c.empleado_nombre}</td>
                          <td className="amount">{formatCurrency(c.total_comisiones)}</td>
                          <td>{c.cantidad_pagos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Comisiones del Día */}
        {activeTab === 'dia' && (
          <div className="dia-section">
            <div className="filters-row">
              <div className="form-group">
                <label>Fecha</label>
                <input 
                  type="date" 
                  value={fechaDia}
                  onChange={(e) => setFechaDia(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={loadComisionesDia}>
                <i className="fas fa-search"></i> Consultar
              </button>
            </div>

            {comisionesDia && (
              <div className="dia-cards">
                <div className="summary-card blue">
                  <div className="card-icon">
                    <i className="fas fa-receipt"></i>
                  </div>
                  <div className="card-content">
                    <span className="card-label">Total Pagos</span>
                    <span className="card-value">{formatCurrency(comisionesDia.total_pagos_cobrados)}</span>
                  </div>
                </div>

                <div className="summary-card orange">
                  <div className="card-icon">
                    <i className="fas fa-user-tie"></i>
                  </div>
                  <div className="card-content">
                    <span className="card-label">Comisión Vendedores</span>
                    <span className="card-value">{formatCurrency(comisionesDia.comisiones.vendedor)}</span>
                  </div>
                </div>

                <div className="summary-card purple">
                  <div className="card-icon">
                    <i className="fas fa-walking"></i>
                  </div>
                  <div className="card-content">
                    <span className="card-label">Comisión Cobradores</span>
                    <span className="card-value">{formatCurrency(comisionesDia.comisiones.cobrador)}</span>
                  </div>
                </div>

                <div className="summary-card red">
                  <div className="card-icon">
                    <i className="fas fa-hand-holding-usd"></i>
                  </div>
                  <div className="card-content">
                    <span className="card-label">Total Comisiones</span>
                    <span className="card-value">{formatCurrency(comisionesDia.comisiones.total)}</span>
                  </div>
                </div>

                <div className="summary-card green">
                  <div className="card-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="card-content">
                    <span className="card-label">Ingreso Neto</span>
                    <span className="card-value">{formatCurrency(comisionesDia.ingreso_neto)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Por Empleado */}
        {activeTab === 'empleado' && (
          <div className="empleado-section">
            <div className="filters-row">
              <div className="form-group">
                <label>Tipo</label>
                <select value={tipoEmpleado} onChange={(e) => {
                  setTipoEmpleado(e.target.value);
                  setSelectedEmpleado('');
                  setResumenVendedor(null);
                  setResumenCobrador(null);
                }}>
                  <option value="vendedor">Vendedor</option>
                  <option value="cobrador">Cobrador</option>
                </select>
              </div>
              <div className="form-group">
                <label>Empleado</label>
                <select 
                  value={selectedEmpleado} 
                  onChange={(e) => setSelectedEmpleado(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {empleados
                    .filter(e => e.puesto.toLowerCase() === tipoEmpleado)
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))
                  }
                </select>
              </div>
              <div className="form-group">
                <label>Desde</label>
                <input 
                  type="date" 
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Hasta</label>
                <input 
                  type="date" 
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={loadResumenEmpleado}
                disabled={!selectedEmpleado}
              >
                <i className="fas fa-search"></i> Consultar
              </button>
            </div>

            {/* Resumen Vendedor */}
            {tipoEmpleado === 'vendedor' && resumenVendedor && (
              <div className="empleado-details">
                <div className="stats-grid">
                  <div className="stat-card">
                    <i className="fas fa-dollar-sign"></i>
                    <div>
                      <span className="stat-label">Esperadas</span>
                      <span className="stat-value">{formatCurrency(resumenVendedor.comisiones_esperadas)}</span>
                    </div>
                  </div>
                  <div className="stat-card success">
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <span className="stat-label">Cobradas</span>
                      <span className="stat-value">{formatCurrency(resumenVendedor.comisiones_cobradas)}</span>
                    </div>
                  </div>
                  <div className="stat-card warning">
                    <i className="fas fa-clock"></i>
                    <div>
                      <span className="stat-label">Pendientes</span>
                      <span className="stat-value">{formatCurrency(resumenVendedor.comisiones_pendientes)}</span>
                    </div>
                  </div>
                  <div className="stat-card info">
                    <i className="fas fa-percentage"></i>
                    <div>
                      <span className="stat-label">% Cobrado</span>
                      <span className="stat-value">{formatPercentage(resumenVendedor.porcentaje_cobrado)}</span>
                    </div>
                  </div>
                </div>

                {/* Detalle de Préstamos */}
                {detalleVendedor.length > 0 && (
                  <div className="detalle-prestamos">
                    <h3>Detalle por Préstamo</h3>
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Préstamo #</th>
                          <th>Cliente</th>
                          <th>Monto</th>
                          <th>% Com.</th>
                          <th>Esperada</th>
                          <th>Cobrada</th>
                          <th>Pendiente</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleVendedor.map(p => (
                          <tr key={p.prestamo_id}>
                            <td>#{p.prestamo_id}</td>
                            <td>{p.cliente_nombre}</td>
                            <td>{formatCurrency(p.monto_prestamo)}</td>
                            <td>{p.porcentaje}%</td>
                            <td>{formatCurrency(p.comision_esperada)}</td>
                            <td className="success">{formatCurrency(p.comision_cobrada)}</td>
                            <td className="warning">{formatCurrency(p.comision_pendiente)}</td>
                            <td>
                              <span className={`badge ${p.estado_prestamo === 'pagado' ? 'success' : 'warning'}`}>
                                {p.estado_prestamo}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Resumen Cobrador */}
            {tipoEmpleado === 'cobrador' && resumenCobrador && (
              <div className="empleado-details">
                <div className="stats-grid">
                  <div className="stat-card success">
                    <i className="fas fa-money-bill-wave"></i>
                    <div>
                      <span className="stat-label">Total Comisiones</span>
                      <span className="stat-value">{formatCurrency(resumenCobrador.comisiones_cobradas)}</span>
                    </div>
                  </div>
                  <div className="stat-card info">
                    <i className="fas fa-receipt"></i>
                    <div>
                      <span className="stat-label">Cantidad Pagos</span>
                      <span className="stat-value">{resumenCobrador.cantidad_pagos}</span>
                    </div>
                  </div>
                  <div className="stat-card warning">
                    <i className="fas fa-chart-line"></i>
                    <div>
                      <span className="stat-label">Promedio por Pago</span>
                      <span className="stat-value">{formatCurrency(resumenCobrador.promedio_por_pago)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading && <div className="loading">Cargando...</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default Comisiones;
