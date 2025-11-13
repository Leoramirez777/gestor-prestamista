import { useNavigate } from 'react-router-dom';
import '../styles/Pagos.css';

export default function Pagos() {
  const navigate = useNavigate();

  return (
    <div className="pagos-container">
      <button
        onClick={() => navigate('/')}
        className="pagos-back-button"
      >
        ← Volver al Menú
      </button>
      
      <div className="pagos-content">
        <h1 className="pagos-title">
          Gestión de Pagos
        </h1>
        
        <div className="pagos-card">
          
          <p className="pagos-text">Registro de pagos</p>
        </div>
      </div>
    </div>
  );
}
