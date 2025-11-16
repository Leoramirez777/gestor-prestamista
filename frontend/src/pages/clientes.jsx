import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchClientes } from "../api/clientes";
import { fetchPrestamos } from "../api/prestamos";
import "../styles/clientes.css";

const Clientes = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos", "activos", "inactivos"

  useEffect(() => {
    const loadClientes = async () => {
      try {
        setLoading(true);
        const [clientesData, prestamosData] = await Promise.all([
          fetchClientes(),
          fetchPrestamos()
        ]);
        setClientes(clientesData);
        setPrestamos(prestamosData || []);
      } catch (err) {
        setError(err.message);
        console.error("Error al cargar clientes:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadClientes();
  }, []);

  const verPerfil = (id) => {
    navigate(`/clientes/${id}`);
  };

  const volverInicio = () => {
    navigate("/"); // Te lleva a App.jsx
  };

  // Filtrar clientes según búsqueda y estado
  const clientesFiltrados = clientes.filter((cliente) => {
    // Verificar si tiene préstamo activo
    const prestamoActivo = prestamos.some(p => p.cliente_id === cliente.id && p.estado === "activo");
    
    // Filtro por búsqueda (nombre)
    const coincideBusqueda = cliente.nombre.toLowerCase().includes(busqueda.toLowerCase());
    
    // Filtro por estado
    let coincideEstado = true;
    if (filtroEstado === "activos") {
      coincideEstado = prestamoActivo;
    } else if (filtroEstado === "inactivos") {
      coincideEstado = !prestamoActivo;
    }
    
    return coincideBusqueda && coincideEstado;
  });

  return (
    <div className="container my-5">
      {/* Encabezado con botón de regreso */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold mb-0 clientes-title">Gestión de Clientes</h1>
        <button
          className="btn fw-semibold clientes-back-button"
          onClick={volverInicio}
        >
          ← Volver al inicio
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      {!loading && !error && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Buscar por nombre</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ingrese el nombre del cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Filtrar por estado</label>
                <select
                  className="form-select"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="todos">Todos los clientes</option>
                  <option value="activos">Con préstamo activo</option>
                  <option value="inactivos">Sin préstamo activo</option>
                </select>
              </div>
            </div>
            <div className="mt-3 text-muted small">
              Mostrando {clientesFiltrados.length} de {clientes.length} clientes
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center my-5">
          <div className="spinner-border clientes-spinner" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tarjetas de clientes */}
      {!loading && !error && (
        <div className="row g-4">
          {clientesFiltrados.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                No se encontraron clientes con los filtros seleccionados
              </div>
            </div>
          ) : (
            clientesFiltrados.map((cliente) => {
              // Verificar si tiene préstamo activo
              const prestamoActivo = prestamos.some(p => p.cliente_id === cliente.id && p.estado === "activo");
              
              return (
                <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={cliente.id}>
                  <div className="card shadow-sm h-100 cliente-card">
                    <div className="card-body d-flex flex-column justify-content-between">
                      <div className="d-flex align-items-center mb-3">
                        <div className="rounded-circle fw-bold fs-4 d-flex align-items-center justify-content-center me-3 cliente-avatar">
                          {cliente.nombre[0]}
                        </div>
                        <div>
                          <h5 className="card-title mb-1 fw-bold cliente-name">
                            {cliente.nombre}
                          </h5>
                          <p className="card-text text-muted mb-0">
                            Telefono: {cliente.telefono}
                          </p>
                        </div>
                      </div>

                      <div className="text-center mb-3">
                        {prestamoActivo ? (
                          <span className="badge px-3 py-2 cliente-prestamo-activo">
                            Préstamo activo
                          </span>
                        ) : (
                          <span className="badge bg-secondary bg-opacity-50 px-3 py-2">
                            Sin préstamo activo
                          </span>
                        )}
                      </div>

                      <button
                        className="btn w-100 fw-semibold cliente-ver-perfil"
                        onClick={() => verPerfil(cliente.id)}
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Clientes;
