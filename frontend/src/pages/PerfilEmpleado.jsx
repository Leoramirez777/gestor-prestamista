import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmpleado, fetchComisionesEmpleado, fetchComisionesVendedorEmpleado } from "../api/empleados";
import "../styles/PerfilEmpleado.css";

export default function PerfilEmpleado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [empleado, setEmpleado] = useState(null);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        </div>
      </div>

      {/* Comisiones */}
      <div className="card shadow-sm empleado-card">
        <div className="card-header empleado-card-header d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Historial de Comisiones</h4>
          {comisiones.length > 0 && (
            <div className="fs-5 fw-bold">
              Total: ${comisiones.reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        ${parseFloat(c.monto_comision || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
