import { useNavigate } from 'react-router-dom';
import '../styles/NuevosClientes.css';

export default function NuevosClientes() {
  const navigate = useNavigate();

  return (
    <div className="nuevos-clientes-container">
      <button
        onClick={() => navigate('/')}
        className="nuevos-clientes-back-button"
      >
        ← Volver al Menú
      </button>
      
      <div className="nuevos-clientes-content">
        <h1 className="nuevos-clientes-title">
          Registro de Nuevos Clientes
        </h1>
        
        <div className="nuevos-clientes-card">
          
          <p className="nuevos-clientes-text">Formulario de registro de clientes</p>
        </div>
      </div>
    </div>
  );
}
