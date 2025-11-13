import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./styles/App.css";

export default function App() {
  const navigate = useNavigate();

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="bg-white border-bottom shadow-sm py-3">
        <div className="container">
          <div className="d-flex align-items-center gap-2">
           
            <h1 className="fs-3 fw-bold text-primary mb-0">Gestor Prestamista</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-5">
        {/* Cards Grid */}
        <div className="row g-4 mb-4">
          {/* Gestión de Clientes */}
          <div className="col-md-4">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center icon-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                      <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
                    </svg>
                  </div>
                </div>
                <h3 className="card-title h5 mb-2">Gestión de Clientes</h3>
                <p className="card-text text-muted small mb-3">Ver, agregar y administrar clientes</p>
                <button 
                  className="btn btn-primary w-100 mb-2"
                  onClick={() => navigate('/clientes')}
                >
                  Ver Clientes
                </button>
                <button 
                  className="btn btn-outline-primary w-100"
                  onClick={() => navigate('/nuevos-clientes')}
                >
                  Nuevo Cliente
                </button>
              </div>
            </div>
          </div>

          {/* Gestión de Préstamos */}
          <div className="col-md-4">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center icon-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" className="text-success" viewBox="0 0 16 16">
                      <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                      <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z"/>
                    </svg>
                  </div>
                </div>
                <h3 className="card-title h5 mb-2">Gestión de Préstamos</h3>
                <p className="card-text text-muted small mb-3">Administrar préstamos activos e historial</p>
                <button 
                  className="btn btn-success w-100 mb-2"
                  onClick={() => navigate('/prestamos')}
                >
                  Ver Préstamos
                </button>
                <button 
                  className="btn btn-outline-success w-100"
                  onClick={() => navigate('/nuevos-prestamos')}
                >
                  Nuevo Préstamo
                </button>
              </div>
            </div>
          </div>

          {/* Gestión de Pagos */}
          <div className="col-md-4">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <div className="rounded-circle bg-warning bg-opacity-10 d-inline-flex align-items-center justify-content-center icon-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" className="text-warning" viewBox="0 0 16 16">
                      <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z"/>
                    </svg>
                  </div>
                </div>
                <h3 className="card-title h5 mb-2">Gestión de Pagos</h3>
                <p className="card-text text-muted small mb-3">Registrar y seguir pagos realizados</p>
                <button 
                  className="btn btn-warning w-100 mb-2"
                  onClick={() => navigate('/pagos')}
                >
                  Ver Pagos
                </button>
                <button 
                  className="btn btn-outline-warning w-100"
                  onClick={() => navigate('/pagos-atrasados')}
                >
                  Pagos Atrasados
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="row g-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <div className="rounded-circle bg-info bg-opacity-10 d-inline-flex align-items-center justify-content-center icon-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" className="text-info" viewBox="0 0 16 16">
                      <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
                    </svg>
                  </div>
                </div>
                <h3 className="card-title h5 mb-2">Resumen</h3>
                <p className="card-text text-muted small mb-3">Accede rápidamente a las diferentes secciones del sistema</p>
                <button 
                  className="btn btn-info text-white"
                  onClick={() => navigate('/resumen')}
                >
                  📊 Ver Resumen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Control - Removido */}
      </main>
    </div>
  );
}
