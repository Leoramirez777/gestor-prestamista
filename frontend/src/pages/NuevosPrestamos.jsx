import { useNavigate } from 'react-router-dom';
import '../styles/NuevosPrestamos.css';

export default function NuevosPrestamos() {
  const navigate = useNavigate();

  return (
    <div className="nuevos-prestamos-container">
      <button
        onClick={() => navigate('/')}
        className="nuevos-prestamos-back-button"
      >
        ← Volver al Menú
      </button>
      
      <div className="nuevos-prestamos-content">
        <h1 className="nuevos-prestamos-title">
          Nuevo Préstamo
        </h1>
        
        <div className="nuevos-prestamos-card">
          
          <p className="nuevos-prestamos-text">Formulario de nuevo préstamo</p>
        </div>
      </div>
    </div>
  );
}
