import { useNavigate } from 'react-router-dom';

export default function Prestamos() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white p-8">
      <button
        onClick={() => navigate('/')}
        className="mb-8 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white"
      >
        ← Volver al Menú
      </button>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Gestión de Préstamos
        </h1>
        
        <div className="bg-white shadow-lg rounded-lg p-6">
          {/* Aquí irá el contenido de préstamos */}
          <p className="text-gray-600">Lista de préstamos activos</p>
        </div>
      </div>
    </div>
  );
}
