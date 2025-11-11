import { useNavigate } from 'react-router-dom';

export default function NuevosClientes() {
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
          Registro de Nuevos Clientes
        </h1>
        
        <div className="bg-white shadow-lg rounded-lg p-6">
          
          <p className="text-gray-600">Formulario de registro de clientes</p>
        </div>
      </div>
    </div>
  );
}
