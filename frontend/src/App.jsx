import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaUserPlus,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import { BsCashStack, BsGraphUp, BsClock } from "react-icons/bs";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./index.css";

export default function App() {
  const navigate = useNavigate();

  const buttons = [
    { icon: <FaUsers size={32} />, text: "Clientes", path: "/clientes" },
    { icon: <FaUserPlus size={32} />, text: "Nuevos Clientes", path: "/nuevos-clientes" },
    { icon: <FaMoneyBillWave size={32} />, text: "Préstamos", path: "/prestamos" },
    { icon: <BsCashStack size={32} />, text: "Nuevos Préstamos", path: "/nuevos-prestamos" },
    { icon: <FaFileInvoiceDollar size={32} />, text: "Pagos", path: "/pagos" },
    { icon: <BsClock size={32} />, text: "Pagos Atrasados", path: "/pagos-atrasados" },
    { icon: <BsGraphUp size={32} />, text: "Resumen", path: "/resumen" },
  ];

  return (
    <div className="min-vh-100 bg-light text-dark">
     
      <header className="d-flex align-items-center justify-content-center gap-2 py-4 bg-white border-bottom shadow-sm">
        <div
          className="d-grid place-items-center rounded bg-success logo-box"
        >
          <div className="d-grid logo-grid">
            <div className="bg-white rounded small-square"></div>
            <div className="bg-white rounded small-square"></div>
            <div className="bg-white rounded small-square"></div>
            <div className="bg-white rounded small-square"></div>
          </div>
        </div>
        <span className="fw-bold fs-4 text-secondary">Gestor Prestamista</span>
      </header>

      
      <main className="text-center py-5 px-3">
        <h1 className="fw-bold display-5 text-dark mb-2">Menú Principal</h1>
        <p className="text-muted mb-5">Selecciona una opción para comenzar</p>

        <div className="container">
          <div className="row justify-content-center g-4">
            {buttons.map((btn, index) => (
              <div key={index} className="col-6 col-sm-4 col-md-3 col-lg-2">
                <div
                  onClick={() => navigate(btn.path)}
                  className="card-dashboard h-100"
                >
                  <div className="icon-box mx-auto mb-3">{btn.icon}</div>
                  <p className="fw-semibold text-secondary mb-0">{btn.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
