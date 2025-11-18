import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEmpleados } from "../api/empleados";
import "../styles/VerEmpleados.css";

const VerEmpleados = () => {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPuesto, setFiltroPuesto] = useState("todos"); // "todos", "Cobrador", "Vendedor", "Otro"
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const loadEmpleados = async () => {
      try {
        setLoading(true);
        const empleadosData = await fetchEmpleados();
        setEmpleados(empleadosData || []);
      } catch (err) {
        console.error("Error al cargar empleados:", err);
        setEmpleados([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmpleados();
  }, []);

  const verDetalle = (empleado) => navigate(`/empleados/${empleado.id}`);
  const cerrarDetalle = () => setSelected(null);

  const volverInicio = () => {
    navigate("/");
  };

  const agregarEmpleado = () => {
    navigate("/empleados");
  };

  // Filtrar empleados según búsqueda y puesto
  const empleadosFiltrados = empleados.filter((empleado) => {
    // Filtro por búsqueda (nombre)
    const coincideBusqueda = (empleado.nombre || "").toLowerCase().includes(busqueda.toLowerCase());
    
    // Filtro por puesto
    let coincidePuesto = true;
    if (filtroPuesto !== "todos") {
      coincidePuesto = empleado.puesto === filtroPuesto;
    }
    
    return coincideBusqueda && coincidePuesto;
  });

  // Contar por puesto
  const contadores = {
    total: empleados.length,
    cobrador: empleados.filter(e => e.puesto === "Cobrador").length,
    vendedor: empleados.filter(e => e.puesto === "Vendedor").length,
    otro: empleados.filter(e => e.puesto === "Otro").length
  };

  return (
    <div className="container my-5">
      {/* Encabezado con botón de regreso */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold mb-0 empleados-title">Gestión de Empleados</h1>
        <button
          className="btn fw-semibold empleados-back-button"
          onClick={volverInicio}
        >
          ← Volver al inicio
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      {!loading && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              {/* Buscador */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Buscar empleado</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              {/* Filtro por puesto */}
              <div className="col-md-3">
                <label className="form-label fw-semibold">Filtrar por puesto</label>
                <select
                  className="form-select"
                  value={filtroPuesto}
                  onChange={(e) => setFiltroPuesto(e.target.value)}
                >
                  <option value="todos">Todos los puestos</option>
                  <option value="Cobrador">Cobrador</option>
                  <option value="Vendedor">Vendedor</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Botón agregar */}
              <div className="col-md-3 d-flex align-items-end">
                <button
                  className="btn btn-primary w-100"
                  onClick={agregarEmpleado}
                >
                  + Nuevo Empleado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen estadístico */}
      {!loading && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card border-primary">
              <div className="card-body text-center">
                <h3 className="text-primary mb-0">{contadores.total}</h3>
                <p className="text-muted mb-0">Total Empleados</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-success">
              <div className="card-body text-center">
                <h3 className="text-success mb-0">{contadores.cobrador}</h3>
                <p className="text-muted mb-0">Cobradores</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-info">
              <div className="card-body text-center">
                <h3 className="text-info mb-0">{contadores.vendedor}</h3>
                <p className="text-muted mb-0">Vendedores</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-secondary">
              <div className="card-body text-center">
                <h3 className="text-secondary mb-0">{contadores.otro}</h3>
                <p className="text-muted mb-0">Otros</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de carga */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border empleados-spinner" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      )}

      {/* Lista de empleados */}
      {!loading && empleadosFiltrados.length === 0 && (
        <div className="alert alert-info">
          {busqueda || filtroPuesto !== "todos"
            ? "No se encontraron empleados con los filtros aplicados"
            : "No hay empleados registrados. Haz clic en 'Nuevo Empleado' para agregar uno."}
        </div>
      )}

      {!loading && empleadosFiltrados.length > 0 && (
        <div className="row g-3">
          {empleadosFiltrados.map((empleado) => {
            const totalCobrado = 0; // Backend aún no acumula cobros por empleado
            const totalVentas = 0;   // No se usa en backend actual
            const iniciales = (empleado.nombre || "?")
              .split(" ")
              .map(n => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            return (
              <div key={empleado.id} className="col-md-6 col-lg-4">
                <div className="card empleado-card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <div className="empleado-avatar rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold">
                        {iniciales}
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="mb-0 empleado-name">{empleado.nombre}</h5>
                        <p className="text-muted mb-0 small">{empleado.puesto}</p>
                      </div>
                    </div>

                    {/* Información personal */}
                    <div className="mb-3">
                      {empleado.telefono && (
                        <p className="mb-1 small">
                          <i className="fas fa-phone me-2"></i>
                          {empleado.telefono}
                        </p>
                      )}
                      {empleado.email && (
                        <p className="mb-1 small">
                          <i className="fas fa-envelope me-2"></i>
                          {empleado.email}
                        </p>
                      )}
                    </div>

                    {/* Estadísticas */}
                    <div className="mb-3">
                      {empleado.puesto === "Cobrador" && (
                        <div className="d-flex justify-content-between small">
                          <span className="text-muted">Total cobrado:</span>
                          <span className="fw-semibold">${totalCobrado.toFixed(2)}</span>
                        </div>
                      )}
                      {empleado.puesto === "Vendedor" && (
                        <div className="d-flex justify-content-between small">
                          <span className="text-muted">Total ventas:</span>
                          <span className="fw-semibold">${totalVentas.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between small">
                        <span className="text-muted">Registros:</span>
                        <span className="fw-semibold">0</span>
                      </div>
                    </div>

                    <button
                      className="btn empleado-ver-detalle w-100"
                      onClick={() => verDetalle(empleado)}
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detalle del empleado (lectura) */}
      {selected && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Detalle: {selected.nombre}</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={cerrarDetalle}>Cerrar</button>
            </div>

            <div className="mt-3">
              <div className="mb-2"><strong>Puesto:</strong> {selected.puesto || '—'}</div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="mb-2"><strong>Teléfono:</strong> <span className="text-muted">{selected.telefono || '—'}</span></div>
                  <div className="mb-2"><strong>DNI/Cédula:</strong> <span className="text-muted">{selected.dni || '—'}</span></div>
                  <div className="mb-2"><strong>Email:</strong> <span className="text-muted">{selected.email || '—'}</span></div>
                </div>
                <div className="col-md-6">
                  <div className="mb-2"><strong>Dirección:</strong> <span className="text-muted">{selected.direccion || '—'}</span></div>
                  <div className="mb-2"><strong>Fecha de nacimiento:</strong> <span className="text-muted">{selected.fecha_nacimiento ? new Date(selected.fecha_nacimiento).toLocaleDateString() : '—'}</span></div>
                  <div className="mb-2"><strong>Creado:</strong> <span className="text-muted">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</span></div>
                </div>
              </div>
              <div className="alert alert-light border mt-3 mb-0">
                <small className="text-muted">Los cobros y comisiones del cobrador se registran automáticamente al crear un pago con la opción Cobrador activada.</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerEmpleados;
