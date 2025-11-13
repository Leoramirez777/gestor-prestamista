import { useNavigate } from 'react-router-dom';
import '../styles/Prestamos.css';

export default function Prestamos() {
  const navigate = useNavigate();

  return (
    <div className="prestamos-container">
      <button
        onClick={() => navigate('/')}
        className="prestamos-back-button"
      >
        ← Volver al Menú
      </button>
      
      <div className="prestamos-content">
        <h1 className="prestamos-title">
          Gestión de Préstamos
        </h1>
        
        <div className="prestamos-card">
          {/* Aquí irá el contenido de préstamos */}
          <p className="prestamos-text">Lista de préstamos activos</p>
        </div>
      </div>
    </div>
  );
}
