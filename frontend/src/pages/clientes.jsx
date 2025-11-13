import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Clientes = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    // Datos de ejemplo
    const datosEjemplo = [
      { id: 1, nombre: "Lucas Fernández", telefono: "1123456789", prestamoActivo: true },
      { id: 2, nombre: "María Gómez", telefono: "1133344455", prestamoActivo: false },
      { id: 3, nombre: "Javier Torres", telefono: "1145678901", prestamoActivo: true },
      { id: 4, nombre: "Camila Ruiz", telefono: "1167788990", prestamoActivo: false },
    ];
    setClientes(datosEjemplo);
  }, []);

  const verPerfil = (id) => {
    navigate(`/clientes/${id}`);
  };

  const volverInicio = () => {
    navigate("/"); // Te lleva a App.jsx
  };

  return (
    <div className="container my-5">
      {/* Encabezado con botón de regreso */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold mb-0" style={{ color: '#000000ff' }}>Gestión de Clientes</h1>
        <button
          className="btn fw-semibold"
          style={{ borderColor: '#10b981', color: '#10b981' }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = '#10b981'; e.target.style.color = 'white'; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#10b981'; }}
          onClick={volverInicio}
        >
          ← Volver al inicio
        </button>
      </div>

      {/* Tarjetas de clientes */}
      <div className="row g-4">
        {clientes.map((cliente) => (
          <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={cliente.id}>
            <div className="card shadow-sm h-100" style={{ borderColor: '#10b981' }}>
              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="rounded-circle fw-bold fs-4 d-flex align-items-center justify-content-center me-3"
                    style={{ width: "60px", height: "60px", backgroundColor: '#10b98140', color: '#10b981' }}
                  >
                    {cliente.nombre[0]}
                  </div>
                  <div>
                    <h5 className="card-title mb-1 fw-bold" style={{ color: '#000000' }}>
                      {cliente.nombre}
                    </h5>
                    <p className="card-text text-muted mb-0">
                      Telefono: {cliente.telefono}
                    </p>
                  </div>
                </div>

                <div className="text-center mb-3">
                  {cliente.prestamoActivo ? (
                    <span className="badge px-3 py-2" style={{ backgroundColor: '#10b981' }}>
                      Préstamo activo
                    </span>
                  ) : (
                    <span className="badge bg-secondary bg-opacity-50 px-3 py-2">
                      Sin préstamo activo
                    </span>
                  )}
                </div>

                <button
                  className="btn w-100 fw-semibold"
                  style={{ backgroundColor: '#10b981', color: 'white', border: 'none' }}
                  onClick={() => verPerfil(cliente.id)}
                >
                  Ver Perfil
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Clientes;
