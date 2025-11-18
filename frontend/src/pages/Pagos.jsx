import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchPagos, createPago, previewPagoCobrador } from '../api/pagos';
import { fetchPrestamos } from '../api/prestamos';
import { fetchClientes } from '../api/clientes';
import { fetchEmpleados } from '../api/empleados';
import { exportReciboPagoFormatoPDF } from '../utils/pdfExport';
import { getCurrentUser } from '../api/auth';
import '../styles/Pagos.css';

export default function Pagos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pagos, setPagos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    prestamo_id: '',
    tipo_pago: 'cuota',
    monto: '',
    metodo_pago: 'efectivo',
    notas: ''
  });
  const [creatingPago, setCreatingPago] = useState(false);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [cobradorHabilitado, setCobradorHabilitado] = useState(false);
  const [cobradorId, setCobradorId] = useState('');
  const [porcentajeCobrador, setPorcentajeCobrador] = useState('');
  const [previewComision, setPreviewComision] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [vendedorPrestamo, setVendedorPrestamo] = useState(null); // Info del vendedor del préstamo seleccionado
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    cobrador: 'todos', // 'todos', 'si', 'no', o empleado_id
    montoMin: '',
    montoMax: '',
    fechaDesde: '',
    fechaHasta: '',
    metodoPago: 'todos', // 'todos', 'efectivo', 'transferencia', 'cheque'
    cliente: '', // búsqueda por texto
    tipoPago: 'todos' // 'todos', 'cuota', 'parcial', 'total'
  });
  const [cobradoresMap, setCobradoresMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar todos los datos en paralelo
        let [pagosData, prestamosData, clientesData, empleadosData] = await Promise.all([
          fetchPagos(),
          fetchPrestamos(),
          fetchClientes(),
          fetchEmpleados({ puesto: 'Cobrador' })
        ]);

        // Fallback: si no hay cobradores, cargar todos los empleados
        if (!empleadosData || empleadosData.length === 0) {
          empleadosData = await fetchEmpleados();
        }
        
        setPagos(pagosData || []);
        setPrestamos(prestamosData || []);
        setClientes(clientesData || []);
        setEmpleados(empleadosData || []);
        
        // Cargar información de cobradores para cada pago
        await loadCobradoresInfo(pagosData || []);
        
        console.log('Préstamos cargados:', prestamosData);
        console.log('Location state:', location.state);
        
        // Si viene con parámetro nuevo=true en la URL, abrir modal
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('nuevo') === 'true') {
          setShowModal(true);
        }
        
        // Si viene desde préstamos con un préstamo específico
        if (location.state?.prestamoId) {
          console.log('Abriendo modal con préstamo ID:', location.state.prestamoId);
          setFormData(prev => ({ 
            ...prev, 
            prestamo_id: String(location.state.prestamoId) 
          }));
          setShowModal(true);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los pagos');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [location.state, location.search]);

  // Refrescar lista de cobradores cada vez que se abre el modal
  useEffect(() => {
    const refreshCobradores = async () => {
      try {
        if (showModal) {
          let data = await fetchEmpleados({ puesto: 'Cobrador' });
          if (!data || data.length === 0) {
            data = await fetchEmpleados();
          }
          setEmpleados(data || []);
        }
      } catch (e) {
        console.error('No se pudieron cargar cobradores:', e);
      }
    };
    refreshCobradores();
  }, [showModal]);

  // Preview de comisión calculado por el backend
  useEffect(() => {
    const run = async () => {
      try {
        if (!showModal || !cobradorHabilitado) { setPreviewComision(null); setPreviewError(null); return; }
        const monto = parseFloat(formData.monto || '0');
        const porc = parseFloat(porcentajeCobrador || '0');
        if (isNaN(monto) || monto <= 0 || isNaN(porc) || porc <= 0) { setPreviewComision(null); setPreviewError(null); return; }
        const res = await previewPagoCobrador({ monto, porcentaje: porc });
        setPreviewComision(res?.monto_comision ?? null);
        setPreviewError(null);
      } catch (e) {
        setPreviewComision(null);
        setPreviewError('No se pudo calcular la comisión (servidor no disponible)');
      }
    };
    run();
  }, [showModal, cobradorHabilitado, formData.monto, porcentajeCobrador]);

  const getPrestamoInfo = (prestamoId) => {
    const prestamo = prestamos.find(p => p.id === prestamoId);
    if (!prestamo) return { info: 'Préstamo desconocido', cliente: 'Cliente desconocido' };
    
    const cliente = clientes.find(c => c.id === prestamo.cliente_id);
    return {
      info: `Préstamo #${prestamo.id} - $${prestamo.monto}`,
      cliente: cliente ? cliente.nombre : 'Cliente desconocido'
    };
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

  // Cargar información de cobradores para todos los pagos
  const loadCobradoresInfo = async (pagosList) => {
    const cobradoresData = {};
    for (const pago of pagosList) {
      try {
        const res = await fetch(`/api/pagos/${pago.id}/cobrador`);
        if (res.ok) {
          const registro = await res.json();
          if (registro?.empleado_id) {
            cobradoresData[pago.id] = {
              id: registro.empleado_id,
              nombre: registro.empleado_nombre || 'Cobrador'
            };
          } else if (registro?.empleado_nombre) {
            cobradoresData[pago.id] = {
              id: null,
              nombre: registro.empleado_nombre
            };
          }
        }
      } catch (err) {
        // No hay cobrador para este pago
      }
    }
    setCobradoresMap(cobradoresData);
  };

  const getMetodoPagoClass = (metodo) => {
    switch (metodo?.toLowerCase()) {
      case 'efectivo': return 'badge bg-success';
      case 'transferencia': return 'badge bg-primary';
      case 'cheque': return 'badge bg-warning';
      case 'tarjeta': return 'badge bg-info';
      default: return 'badge bg-secondary';
    }
  };

  const handleFormChange = async (e) => {
    const { name, value } = e.target;
    
    if (name === 'prestamo_id') {
      const prestamo = prestamos.find(p => p.id === parseInt(value));
      setPrestamoSeleccionado(prestamo || null);
      
      // Calcular el monto de la cuota actual (valor_cuota + saldo_cuota)
      const montoCuotaActual = prestamo ? 
        ((prestamo.valor_cuota || 0) + (prestamo.saldo_cuota || 0)).toFixed(2) : '';
      
      // Resetear tipo y monto al cambiar préstamo
      setFormData(prev => ({ 
        ...prev, 
        prestamo_id: value,
        tipo_pago: 'cuota',
        monto: montoCuotaActual
      }));
      
      // Cargar información del vendedor si existe
      if (value) {
        try {
          const res = await fetch(`/api/prestamos/${value}/vendedor`);
          if (res.ok) {
            const vendedorData = await res.json();
            setVendedorPrestamo(vendedorData);
          } else {
            setVendedorPrestamo(null);
          }
        } catch (err) {
          console.log('No hay vendedor para este préstamo');
          setVendedorPrestamo(null);
        }
      } else {
        setVendedorPrestamo(null);
      }
    } else if (name === 'tipo_pago') {
      let nuevoMonto = '';
      if (prestamoSeleccionado) {
        if (value === 'cuota') {
          // Monto de la cuota actual (valor_cuota + saldo_cuota)
          const montoCuotaActual = (prestamoSeleccionado.valor_cuota || 0) + (prestamoSeleccionado.saldo_cuota || 0);
          nuevoMonto = montoCuotaActual.toFixed(2);
        } else if (value === 'total') {
          // Saldo pendiente total
          nuevoMonto = (prestamoSeleccionado.saldo_pendiente || 0).toFixed(2);
        }
        // Si es 'parcial', dejar vacío para que el usuario ingrese
      }
      setFormData(prev => ({ ...prev, tipo_pago: value, monto: nuevoMonto }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreatePago = async (e) => {
    e.preventDefault();
    setCreatingPago(true);
    setError(null);

    try {
      // Validaciones del lado del cliente
      if (!formData.prestamo_id) {
        throw new Error('Por favor seleccione un préstamo');
      }

      if (formData.tipo_pago === 'parcial' && (!formData.monto || parseFloat(formData.monto) <= 0)) {
        throw new Error('El monto debe ser mayor a cero');
      }

      // Construir notas: primero tipo de pago, luego notas adicionales
      const tiposPago = {
        'cuota': 'Pago de Cuota',
        'parcial': 'Pago Parcial',
        'total': 'Pago Total del Saldo'
      };
      
      let notasFinales = tiposPago[formData.tipo_pago] || 'Pago';
      if (formData.notas && formData.notas.trim()) {
        notasFinales += '. ' + formData.notas.trim();
      }

      const pagoData = {
        prestamo_id: parseInt(formData.prestamo_id),
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        tipo_pago: formData.tipo_pago,
        notas: notasFinales,
        fecha_pago: new Date().toISOString().split('T')[0]
      };

      // Adjuntar cobrador si está habilitado
      if (cobradorHabilitado && porcentajeCobrador) {
        pagoData.porcentaje_cobrador = parseFloat(porcentajeCobrador);
        if (cobradorId) {
          pagoData.cobrador_id = parseInt(cobradorId);
        }
      }

      console.log('Enviando datos del pago:', pagoData);

      const nuevoPago = await createPago(pagoData);
      console.log('Pago creado exitosamente:', nuevoPago);
      
      // Recargar datos
      const [pagosData, prestamosData] = await Promise.all([
        fetchPagos(),
        fetchPrestamos()
      ]);
      setPagos(pagosData || []);
      setPrestamos(prestamosData || []);
      
      // Recargar información de cobradores
      await loadCobradoresInfo(pagosData || []);
      
      // Mostrar mensaje de éxito
      alert('¡Pago registrado exitosamente!');
      
      // Limpiar formulario y cerrar modal
      setFormData({
        prestamo_id: '',
        tipo_pago: 'cuota',
        monto: '',
        metodo_pago: 'efectivo',
        notas: ''
      });
      setPrestamoSeleccionado(null);
      setShowModal(false);
      setCobradorHabilitado(false);
      setCobradorId('');
      setPorcentajeCobrador('');
      
    } catch (error) {
      console.error('Error al crear pago:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Error al registrar el pago';
      setError(errorMessage);
    } finally {
      setCreatingPago(false);
    }
  };

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

  // Filtrar pagos según los filtros aplicados
  const pagosFiltrados = pagos.filter(pago => {
    // Filtro por cobrador
    if (filtros.cobrador !== 'todos') {
      const tieneCobrador = cobradoresMap[pago.id];
      if (filtros.cobrador === 'si' && !tieneCobrador) return false;
      if (filtros.cobrador === 'no' && tieneCobrador) return false;
      if (filtros.cobrador !== 'si' && filtros.cobrador !== 'no') {
        // Es un empleado_id específico
        if (!tieneCobrador || tieneCobrador.id !== parseInt(filtros.cobrador)) return false;
      }
    }
    
    // Filtro por monto mínimo
    if (filtros.montoMin && parseFloat(pago.monto) < parseFloat(filtros.montoMin)) {
      return false;
    }
    
    // Filtro por monto máximo
    if (filtros.montoMax && parseFloat(pago.monto) > parseFloat(filtros.montoMax)) {
      return false;
    }
    
    // Filtro por fecha desde
    if (filtros.fechaDesde) {
      const fechaPago = pago.fecha_pago?.split('T')[0] || pago.fecha_pago;
      if (fechaPago < filtros.fechaDesde) return false;
    }
    
    // Filtro por fecha hasta
    if (filtros.fechaHasta) {
      const fechaPago = pago.fecha_pago?.split('T')[0] || pago.fecha_pago;
      if (fechaPago > filtros.fechaHasta) return false;
    }
    
    // Filtro por método de pago
    if (filtros.metodoPago !== 'todos') {
      if (pago.metodo_pago?.toLowerCase() !== filtros.metodoPago.toLowerCase()) {
        return false;
      }
    }
    
    // Filtro por cliente (búsqueda por texto)
    if (filtros.cliente && filtros.cliente.trim() !== '') {
      const prestamo = prestamos.find(p => p.id === pago.prestamo_id);
      const cliente = prestamo ? clientes.find(c => c.id === prestamo.cliente_id) : null;
      if (!cliente || !cliente.nombre.toLowerCase().includes(filtros.cliente.toLowerCase().trim())) {
        return false;
      }
    }
    
    // Filtro por tipo de pago
    if (filtros.tipoPago !== 'todos') {
      if (pago.tipo_pago !== filtros.tipoPago) {
        return false;
      }
    }
    
    return true;
  });
  
  const pagosOrdenados = [...pagosFiltrados].sort((a,b) => b.id - a.id);

  return (
    <div className="container my-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold" style={{ color: '#000' }}>Gestión de Pagos</h1>
        <div className="d-flex gap-2">
          <button
            className="btn"
            style={{ backgroundColor: '#ffc107', color: '#000', fontWeight: 'bold' }}
            onClick={() => setShowModal(true)}
          >
            Registrar Pago
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate('/')}
          >
            ← Volver al Menú
          </button>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError(null)}
          ></button>
        </div>
      )}

      {/* Filtros */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderLeft: '4px solid #ffc107' }}>
        <div className="card-body">
          <h5 className="card-title mb-3" style={{ color: '#000', fontWeight: 'bold' }}>Filtros de Búsqueda</h5>
          <div className="row g-3">
            {/* Primera fila: Fechas y Cliente */}
            <div className="col-md-3">
              <label className="form-label small fw-bold">Fecha Desde</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Fecha Hasta</label>
              <input
                type="date"
                className="form-control"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Cliente</label>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre..."
                value={filtros.cliente}
                onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Tipo de Pago</label>
              <select
                className="form-select"
                value={filtros.tipoPago}
                onChange={(e) => setFiltros({ ...filtros, tipoPago: e.target.value })}
              >
                <option value="todos">Todos</option>
                <option value="cuota">Cuota</option>
                <option value="parcial">Parcial</option>
                <option value="total">Total</option>
              </select>
            </div>

            {/* Segunda fila: Método de Pago, Montos y Cobrador */}
            <div className="col-md-3">
              <label className="form-label small fw-bold">Método de Pago</label>
              <select
                className="form-select"
                value={filtros.metodoPago}
                onChange={(e) => setFiltros({ ...filtros, metodoPago: e.target.value })}
              >
                <option value="todos">Todos</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Monto Mínimo</label>
              <input
                type="number"
                className="form-control"
                placeholder="Ej: 100"
                value={filtros.montoMin}
                onChange={(e) => setFiltros({ ...filtros, montoMin: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold">Monto Máximo</label>
              <input
                type="number"
                className="form-control"
                placeholder="Ej: 10000"
                value={filtros.montoMax}
                onChange={(e) => setFiltros({ ...filtros, montoMax: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold">Cobrador</label>
              <select
                className="form-select"
                value={filtros.cobrador}
                onChange={(e) => setFiltros({ ...filtros, cobrador: e.target.value })}
              >
                <option value="todos">Todos los pagos</option>
                <option value="si">Con cobrador</option>
                <option value="no">Sin cobrador</option>
                <optgroup label="Por cobrador específico">
                  {empleados.filter(e => e.puesto === 'Cobrador').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
          <div className="mt-3 d-flex justify-content-between align-items-center">
            <div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setFiltros({ 
                  cobrador: 'todos', 
                  montoMin: '', 
                  montoMax: '',
                  fechaDesde: '',
                  fechaHasta: '',
                  metodoPago: 'todos',
                  cliente: '',
                  tipoPago: 'todos'
                })}
              >
                Limpiar Filtros
              </button>
              <button
                className="btn btn-sm ms-2"
                style={{ backgroundColor: '#ffc107', color: '#000', border: 'none' }}
                onClick={() => {
                  const hoy = new Date().toISOString().split('T')[0];
                  setFiltros({ ...filtros, fechaDesde: hoy, fechaHasta: hoy });
                }}
              >
                Hoy
              </button>
              <button
                className="btn btn-sm btn-outline-secondary ms-2"
                onClick={() => {
                  const hoy = new Date();
                  const hace7dias = new Date(hoy);
                  hace7dias.setDate(hoy.getDate() - 7);
                  setFiltros({ 
                    ...filtros, 
                    fechaDesde: hace7dias.toISOString().split('T')[0],
                    fechaHasta: hoy.toISOString().split('T')[0]
                  });
                }}
              >
                Última semana
              </button>
              <button
                className="btn btn-sm btn-outline-secondary ms-2"
                onClick={() => {
                  const hoy = new Date();
                  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                  setFiltros({ 
                    ...filtros, 
                    fechaDesde: primerDiaMes.toISOString().split('T')[0],
                    fechaHasta: hoy.toISOString().split('T')[0]
                  });
                }}
              >
                Este mes
              </button>
            </div>
            <span className="text-muted small">
              Mostrando <strong style={{ color: '#ffc107' }}>{pagosOrdenados.length}</strong> de {pagos.length} pagos
            </span>
          </div>
        </div>
      </div>

      {/* Lista de pagos */}
      {pagos.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="fas fa-money-bill-wave text-muted" style={{ fontSize: '4rem' }}></i>
          </div>
          <h4 className="text-muted">No hay pagos registrados</h4>
          <p className="text-muted">Comienza registrando el primer pago</p>
          <button
            className="btn btn-success"
            onClick={() => setShowModal(true)}
          >
            Registrar Primer Pago
          </button>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <h5 className="mb-0">Historial de Pagos</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: '#fff3cd' }}>
                  <tr>
                    <th>ID</th>
                    <th>Préstamo</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Fecha</th>
                    <th>Notas</th>
                    <th>Cobrador</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosOrdenados.map((pago) => {
                    const prestamo = prestamos.find(p => p.id === pago.prestamo_id);
                    const cliente = prestamo ? clientes.find(c => c.id === prestamo.cliente_id) : null;
                    const prestamoInfo = getPrestamoInfo(pago.prestamo_id);
                    return (
                      <tr key={pago.id}>
                        <td>
                          <span className="fw-bold text-primary">#{pago.id}</span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-semibold">{prestamoInfo.info}</div>
                            <small className="text-muted">ID: {pago.prestamo_id}</small>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold">{prestamoInfo.cliente}</span>
                        </td>
                        <td>
                          <span className="fw-bold text-success">{formatCurrency(pago.monto)}</span>
                        </td>
                        <td>
                          <span className={getMetodoPagoClass(pago.metodo_pago)}>
                            {pago.metodo_pago}
                          </span>
                        </td>
                        <td>{formatDate(pago.fecha_pago)}</td>
                        <td>
                          <span className="text-muted small">
                            {pago.notas || 'Sin notas'}
                          </span>
                        </td>
                        <td>
                          {cobradoresMap[pago.id] ? (
                            <span className="badge" style={{ backgroundColor: '#ffc107', color: '#000' }}>
                              {cobradoresMap[pago.id].nombre}
                            </span>
                          ) : (
                            <span className="text-muted">No</span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: '#ffc107', color: '#000', border: 'none' }}
                              title="Descargar recibo"
                              title="Recibo clásico (formato)"
                              onClick={async () => {
                                try {
                                  // Determinar receptor: primero cobrador (si existe), luego admin
                                  let receptor = null;

                                  // Intentar obtener comisión del cobrador (si hay registro se asume que él recibió el pago)
                                  try {
                                    const res = await fetch(`/api/pagos/${pago.id}/cobrador`);
                                    if (res.ok) {
                                      const registro = await res.json();
                                      if (registro?.empleado_id) {
                                        const empRes = await fetch(`/api/empleados/${registro.empleado_id}`);
                                        if (empRes.ok) {
                                          const emp = await empRes.json();
                                          receptor = { nombre: emp.nombre, dni: emp.dni || '' };
                                        } else {
                                          receptor = { nombre: registro.empleado_nombre, dni: '' };
                                        }
                                      } else if (registro?.empleado_nombre) {
                                        receptor = { nombre: registro.empleado_nombre, dni: '' };
                                      }
                                    }
                                  } catch (err) {
                                    // No hay cobrador para este pago
                                  }

                                  // Fallback a usuario autenticado (admin) solo si no se obtuvo cobrador
                                  if (!receptor) {
                                    const admin = await getCurrentUser().catch(() => null);
                                    if (admin) {
                                      receptor = { nombre: admin.nombre_completo || admin.username, dni: admin.dni || '' };
                                    } else {
                                      receptor = { nombre: '', dni: '' };
                                    }
                                  }

                                  await exportReciboPagoFormatoPDF({ pago, cliente, prestamo, receptor, metodo: pago.metodo_pago || 'efectivo' });
                                } catch (e) {
                                  console.error('Error exportando Recibo formato', e);
                                  alert('No se pudo generar el Recibo en PDF');
                                }
                              }}
                            >
                              Recibo
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal para registrar pago */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Registrar Nuevo Pago</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <form onSubmit={handleCreatePago}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label htmlFor="prestamo_id" className="form-label">Préstamo *</label>
                    <select
                      className="form-select"
                      id="prestamo_id"
                      name="prestamo_id"
                      value={formData.prestamo_id}
                      onChange={handleFormChange}
                      required
                      autoFocus
                    >
                      <option value="">Seleccionar préstamo...</option>
                      {prestamos.map(prestamo => {
                        const cliente = clientes.find(c => c.id === prestamo.cliente_id);
                        const saldoPendiente = Number(prestamo.saldo_pendiente) || 0;
                        const estado = (prestamo.estado || '').toLowerCase();
                        // Solo mostrar préstamos activos o impago con saldo pendiente
                        if (saldoPendiente <= 0 || estado === 'refinanciado' || estado === 'pagado') return null;
                        
                        return (
                          <option key={prestamo.id} value={prestamo.id}>
                            Préstamo #{prestamo.id} - {cliente?.nombre || 'Sin cliente'} - Saldo: {formatCurrency(prestamo.saldo_pendiente)}
                          </option>
                        );
                      })}
                    </select>
                    {prestamos.filter(p => Number(p.saldo_pendiente) > 0).length === 0 && (
                      <div className="form-text text-danger">
                        No hay préstamos activos con saldo pendiente
                      </div>
                    )}
                  </div>

                  {prestamoSeleccionado && (
                    <>
                      <div className="mb-3">
                        <label htmlFor="tipo_pago" className="form-label">Tipo de Pago *</label>
                        <select
                          className="form-select"
                          id="tipo_pago"
                          name="tipo_pago"
                          value={formData.tipo_pago}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="cuota">Pago de Cuota</option>
                          <option value="parcial">Pago Parcial</option>
                          <option value="total">Pago Total del Saldo</option>
                        </select>
                        {formData.tipo_pago === 'cuota' && (
                          <div className="mt-2">
                            <div className="alert alert-light border mb-2 py-2">
                              <small className="text-muted d-block mb-1">Valor de Cuota Establecida:</small>
                              <strong className="text-dark">{formatCurrency(prestamoSeleccionado.valor_cuota || 0)}</strong>
                            </div>
                            {prestamoSeleccionado.saldo_cuota !== 0 && (
                              <div className={`alert ${(prestamoSeleccionado.saldo_cuota || 0) > 0 ? 'alert-danger' : 'alert-success'} border mb-0 py-2`}>
                                <small className="text-muted d-block mb-1">
                                  {(prestamoSeleccionado.saldo_cuota || 0) > 0 ? 'Saldo Negativo:' : 'Saldo Positivo:'}
                                </small>
                                <strong>{formatCurrency(Math.abs(prestamoSeleccionado.saldo_cuota || 0))}</strong>
                              </div>
                            )}
                          </div>
                        )}
                        {formData.tipo_pago === 'total' && (
                          <div className="form-text">
                            Saldo total: {formatCurrency(prestamoSeleccionado.saldo_pendiente || 0)}
                          </div>
                        )}
                        {formData.tipo_pago === 'parcial' && (
                          <div className="form-text">
                            Ingrese el monto que desea pagar
                          </div>
                        )}
                      </div>

                      {formData.tipo_pago === 'parcial' && (
                        <div className="mb-3">
                          <label htmlFor="monto" className="form-label">Monto *</label>
                          <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                              type="number"
                              className="form-control"
                              id="monto"
                              name="monto"
                              value={formData.monto}
                              onChange={handleFormChange}
                              required
                              min="0.01"
                              step="0.01"
                              placeholder="0.00"
                              autoComplete="off"
                            />
                            <span className="input-group-text">ARS</span>
                          </div>
                          <div className="form-text">Ingrese el monto en pesos argentinos</div>
                        </div>
                      )}

                      {formData.tipo_pago !== 'parcial' && (
                        <div className="mb-3">
                          <label className="form-label">Monto a Pagar</label>
                          <div className="alert alert-info mb-0">
                            <strong>{formatCurrency(parseFloat(formData.monto) || 0)}</strong>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="mb-3">
                    <label htmlFor="metodo_pago" className="form-label">Método de Pago *</label>
                    <select
                      className="form-select"
                      id="metodo_pago"
                      name="metodo_pago"
                      value={formData.metodo_pago}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>

                  {/* Cobrador */}
                  <div className="mb-3">
                    <label className="form-label">Cobrador</label>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="cobrador_switch"
                        checked={cobradorHabilitado}
                        onChange={(e) => setCobradorHabilitado(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="cobrador_switch">
                        {cobradorHabilitado ? 'Sí' : 'No'}
                      </label>
                    </div>
                  </div>

                  {/* Información del vendedor si existe */}
                  {vendedorPrestamo && (
                    <div className="alert alert-info mb-3">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-user-tie me-2"></i>
                        <div className="flex-grow-1">
                          <strong>Vendedor del préstamo:</strong> {vendedorPrestamo.empleado_nombre}<br />
                          <small className="text-muted">
                            Porcentaje acordado: <strong>{vendedorPrestamo.porcentaje}%</strong> sobre el pago
                          </small>
                          {formData.monto && parseFloat(formData.monto) > 0 && (
                            <>
                              <br />
                              <small className="text-success">
                                <i className="fas fa-calculator me-1"></i>
                                Comisión sobre este pago: <strong>{formatCurrency((parseFloat(formData.monto) * parseFloat(vendedorPrestamo.porcentaje)) / 100)}</strong>
                              </small>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {cobradorHabilitado && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Seleccionar Cobrador</label>
                        <select
                          className="form-select"
                          value={cobradorId}
                          onChange={(e) => setCobradorId(e.target.value)}
                        >
                          <option value="">Seleccionar...</option>
                          {empleados.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                          ))}
                        </select>
                        {empleados.length === 0 && (
                          <div className="form-text">No hay cobradores cargados en el sistema</div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Porcentaje sobre este pago</label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0.00"
                            value={porcentajeCobrador}
                            onChange={(e) => setPorcentajeCobrador(e.target.value)}
                          />
                          <span className="input-group-text">%</span>
                        </div>
                        <div className="form-text">Se calcula sobre el monto del pago, no del préstamo.</div>
                        {previewError && (
                          <div className="alert alert-danger mt-2 py-2 mb-0">
                            <small>{previewError}</small>
                          </div>
                        )}
                        {previewComision != null && !previewError && (
                          <div className="alert alert-light border mt-2 py-2 mb-0">
                            <small className="text-muted d-block">El pago al cobrador es:</small>
                            <strong className="text-dark">{formatCurrency(previewComision)}</strong>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <label htmlFor="notas" className="form-label">Notas</label>
                    <textarea
                      className="form-control"
                      id="notas"
                      name="notas"
                      value={formData.notas}
                      onChange={handleFormChange}
                      rows="3"
                      placeholder="Información adicional sobre el pago..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={creatingPago}
                  >
                    {creatingPago ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Registrando...
                      </>
                    ) : (
                      ' Registrar Pago'
                    )}
                  </button>
                </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
