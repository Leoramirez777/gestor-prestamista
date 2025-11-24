import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmpleado, fetchComisionesEmpleado, fetchComisionesVendedorEmpleado } from "../api/empleados";
import "../styles/PerfilEmpleado.css";
import formatCurrency from '../utils/formatCurrency';
import useSettingsStore from '../stores/useSettingsStore';
import { getToken } from '../api/auth';
import axios from 'axios';

export default function PerfilEmpleado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [empleado, setEmpleado] = useState(null);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userMessage, setUserMessage] = useState(null);
  const [usuarioAsociado, setUsuarioAsociado] = useState(null);
  const [loadingUsuario, setLoadingUsuario] = useState(true);
  // Ganancias trasladadas al dashboard (Resumen), ya no se muestran aquí

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [dataEmpleado, cobrador, vendedor] = await Promise.all([
          fetchEmpleado(id),
          fetchComisionesEmpleado(id),
          fetchComisionesVendedorEmpleado(id)
        ]);
        setEmpleado(dataEmpleado);
        
        // Verificar si existe un usuario asociado a este empleado
        try {
          setLoadingUsuario(true);
          const token = getToken();
          const responseUsuarios = await axios.get('http://localhost:8000/api/auth/usuarios', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const usuarioEncontrado = responseUsuarios.data.find(u => u.empleado_id === parseInt(id));
          setUsuarioAsociado(usuarioEncontrado || null);
        } catch (err) {
          console.log('No se pudo verificar usuario asociado:', err);
        } finally {
          setLoadingUsuario(false);
        };
        const normalizadas = [
          ...(cobrador || []).map(c => ({
            id: `c-${c.id}`,
            tipo: 'cobrador',
            ref_label: 'Pago',
            ref_id: c.pago_id,
            porcentaje: c.porcentaje,
            monto_comision: c.monto_comision,
            created_at: c.created_at,
          })),
          ...(vendedor || []).map(v => ({
            id: `v-${v.id}`,
            tipo: 'vendedor',
            ref_label: 'Préstamo',
            ref_id: v.prestamo_id,
            porcentaje: v.porcentaje,
            monto_comision: v.monto_comision,
            created_at: v.created_at,
          }))
        ].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        setComisiones(normalizadas);
      } catch (e) {
        setError(e.message || "No se pudo cargar el empleado");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // subscribe to moneda to force re-render on currency change
  const moneda = useSettingsStore(state => state.moneda);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setUserMessage({ type: 'error', text: 'Usuario y contraseña son obligatorios' });
      return;
    }
    
    // Determinar rol basado en el puesto del empleado
    let role = 'vendedor'; // por defecto
    const puestoLower = (empleado.puesto || '').toLowerCase();
    if (puestoLower.includes('cobrador')) {
      role = 'cobrador';
    } else if (puestoLower.includes('vendedor')) {
      role = 'vendedor';
    }
    
    try {
      const token = getToken();
      if (!token) {
        setUserMessage({ type: 'error', text: 'No estás autenticado. Por favor inicia sesión nuevamente.' });
        return;
      }
      
      const userRole = localStorage.getItem('role');
      console.log('Current user role:', userRole);
      console.log('Token exists:', !!token);
      console.log('Creating user with role:', role);
      
      const response = await axios.post(
        'http://localhost:8000/api/auth/admin/create-user',
        {
          username: username.trim(),
          password: password.trim(),
          nombre_completo: empleado.nombre,
          role: role,
          empleado_id: parseInt(id),
          dni: empleado.dni || '',
          telefono: empleado.telefono || '',
          email: empleado.email || ''
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Usuario creado:', response.data);
      setUserMessage({ type: 'success', text: `Usuario creado exitosamente con rol: ${role}` });
      setUsername('');
      setPassword('');
      setShowUserForm(false);
    } catch (err) {
      console.error('Error completo:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);
      
      let errorMsg = 'Error al crear usuario';
      if (err.response?.status === 401) {
        errorMsg = 'No tienes permisos de administrador o tu sesión expiró. Por favor cierra sesión y vuelve a ingresar.';
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      
      setUserMessage({ 
        type: 'error', 
        text: errorMsg
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const [y, m, d] = String(dateString).split("T")[0].split("-");
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("es-AR");
  };

  if (loading) {
    return (
      <div className="container my-5">
        <div className="text-center my-5">
          <div className="spinner-border empleado-spinner" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !empleado) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error || "Empleado no encontrado"}
        </div>
        <button className="btn btn-secondary" onClick={() => navigate("/ver-empleados")}>← Volver a Empleados</button>
      </div>
    );
  }

  return (
    <div className="container my-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold mb-0 empleado-title">Perfil del Empleado</h1>
        <button className="btn fw-semibold empleado-back-button" onClick={() => navigate("/ver-empleados")}>← Volver a Empleados</button>
      </div>

      {/* Datos del empleado */}
      <div className="card shadow-sm mb-4 empleado-card">
        <div className="card-header empleado-card-header d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Datos Personales</h4>
          <button className="btn btn-light btn-sm" onClick={() => alert('Función de edición en desarrollo')}>
            Editar
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="d-flex align-items-center mb-4">
                <div className="rounded-circle fw-bold fs-1 d-flex align-items-center justify-content-center me-3 empleado-avatar">
                  {(empleado.nombre || "?")[0]}
                </div>
                <div>
                  <h3 className="mb-0">{empleado.nombre}</h3>
                  <small className="text-muted">ID: {empleado.id}</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="text-muted small">Puesto</label>
              <p className="fs-5 mb-0">{empleado.puesto || "—"}</p>
            </div>
            <div className="col-md-4 mb-3">
              <label className="text-muted small">Teléfono</label>
              <p className="fs-5 mb-0">{empleado.telefono || "—"}</p>
            </div>
            <div className="col-md-4 mb-3">
              <label className="text-muted small">Email</label>
              <p className="fs-5 mb-0">{empleado.email || "—"}</p>
            </div>
            <div className="col-md-4 mb-3">
              <label className="text-muted small">DNI/Cédula</label>
              <p className="fs-5 mb-0">{empleado.dni || "—"}</p>
            </div>
            <div className="col-md-4 mb-3">
              <label className="text-muted small">Dirección</label>
              <p className="fs-5 mb-0">{empleado.direccion || "—"}</p>
            </div>
            <div className="col-md-4 mb-3">
              <label className="text-muted small">Fecha de nacimiento</label>
              <p className="fs-5 mb-0">{formatDate(empleado.fecha_nacimiento)}</p>
            </div>
            <div className="col-md-4 mb-3">
              <label className="text-muted small">Creado</label>
              <p className="fs-5 mb-0">{formatDate(empleado.created_at)}</p>
            </div>
          </div>

          <div className="alert alert-light border mt-3 mb-0">
            <small className="text-muted">Las comisiones del cobrador se calculan automáticamente al registrar pagos con la opción Cobrador activada.</small>
          </div>
          {/* Ganancias removidas: ahora disponibles en el Dashboard (Resumen) */}
        </div>
      </div>

      {/* Sección de Crear Usuario */}
      <div className="card shadow-sm mb-4 empleado-card">
        <div className="card-header empleado-card-header d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Acceso al Sistema</h4>
          {!showUserForm && !usuarioAsociado && !loadingUsuario && (
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => setShowUserForm(true)}
            >
              <i className="fas fa-user-plus"></i> Crear Usuario
            </button>
          )}
        </div>
        <div className="card-body">
          {loadingUsuario ? (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : usuarioAsociado ? (
            <div>
              <div className="alert alert-success d-flex align-items-center">
                <i className="fas fa-check-circle fs-3 me-3"></i>
                <div>
                  <strong>Usuario activo en el sistema</strong>
                  <p className="mb-0 mt-1">Este empleado ya tiene credenciales de acceso</p>
                </div>
              </div>
              <div className="row mt-3">
                <div className="col-md-4 mb-2">
                  <label className="text-muted small">Usuario</label>
                  <p className="fs-5 mb-0"><strong>{usuarioAsociado.username}</strong></p>
                </div>
                <div className="col-md-4 mb-2">
                  <label className="text-muted small">Rol asignado</label>
                  <p className="fs-5 mb-0">
                    <span className={`badge bg-${usuarioAsociado.role === 'admin' ? 'danger' : usuarioAsociado.role === 'vendedor' ? 'primary' : 'success'}`}>
                      {usuarioAsociado.role.charAt(0).toUpperCase() + usuarioAsociado.role.slice(1)}
                    </span>
                  </p>
                </div>
                <div className="col-md-4 mb-2">
                  <label className="text-muted small">Nombre completo</label>
                  <p className="fs-5 mb-0">{usuarioAsociado.nombre_completo}</p>
                </div>
              </div>
            </div>
          ) : !showUserForm ? (
            <div className="text-center text-muted py-3">
              <i className="fas fa-user-lock fs-1"></i>
              <p className="mb-0 mt-2">Este empleado aún no tiene usuario del sistema</p>
              <small>Haz clic en "Crear Usuario" para darle acceso</small>
            </div>
          ) : (
            <form onSubmit={handleCreateUser}>
              <div className="alert alert-info mb-3">
                <small>
                  <i className="fas fa-info-circle me-2"></i>
                  El rol se asignará automáticamente según el puesto: <strong>{empleado.puesto}</strong>
                  {' → '}
                  <strong>
                    {(empleado.puesto || '').toLowerCase().includes('cobrador') ? 'Cobrador' : 'Vendedor'}
                  </strong>
                </small>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Usuario *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nombre de usuario"
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Contraseña *</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña segura"
                    required
                  />
                </div>
              </div>
              {userMessage && (
                <div className={`alert alert-${userMessage.type === 'success' ? 'success' : 'danger'} mb-3`}>
                  {userMessage.text}
                </div>
              )}
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Crear Usuario
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowUserForm(false);
                    setUsername('');
                    setPassword('');
                    setUserMessage(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Comisiones */}
      <div className="card shadow-sm empleado-card">
        <div className="card-header empleado-card-header d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Historial de Comisiones</h4>
          {comisiones.length > 0 && (
            <div className="fs-5 fw-bold">
              Total: {formatCurrency(comisiones.reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0))}
            </div>
          )}
        </div>
        <div className="card-body">
          {comisiones.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="bi bi-inbox fs-1"></i>
              <p className="mb-0 mt-2">No hay comisiones registradas</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Referencia</th>
                    <th className="text-center">Porcentaje</th>
                    <th className="text-end">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {comisiones.map((c) => (
                    <tr key={c.id}>
                      <td>{formatDate(c.created_at)}</td>
                      <td className="text-capitalize">{c.tipo}</td>
                      <td>{c.ref_label} #{c.ref_id}</td>
                      <td className="text-center">{c.porcentaje}%</td>
                        <td className="text-end fw-semibold empleado-comision-amount">
                        {formatCurrency(parseFloat(c.monto_comision || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
