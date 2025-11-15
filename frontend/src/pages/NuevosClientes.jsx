import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCliente } from '../api/clientes';
import axios from 'axios';
import '../styles/NuevosClientes.css';

export default function NuevosClientes() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    telefono: '',
    direccion: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      console.log('Enviando datos:', formData);
      
      // Intentar primero con la función API
      let result;
      try {
        result = await createCliente(formData);
      } catch (apiError) {
        console.log('Error con API, intentando con axios directo:', apiError);
        // Si falla, intentar con axios directamente
        result = await axios.post('http://localhost:8000/api/clientes/', formData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      console.log('Cliente creado:', result);
      
      setMensaje({
        tipo: 'success',
        texto: '¡Cliente registrado exitosamente!'
      });
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        dni: '',
        telefono: '',
        direccion: '',
        email: ''
      });
      
      // Opcional: redirigir después de un tiempo
      setTimeout(() => {
        navigate('/clientes');
      }, 2000);
      
    } catch (error) {
      console.error('Error completo al crear cliente:', error);
      let errorMessage = 'Error al registrar el cliente.';
      
      if (error.response?.data?.detail) {
        errorMessage = `Error: ${error.response.data.detail}`;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status) {
        errorMessage = `Error ${error.response.status}: No se pudo conectar con el servidor`;
      }
      
      setMensaje({
        tipo: 'error',
        texto: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-5">
      {/* Header con botón de regreso */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold text-dark">Registro de Nuevo Cliente</h1>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate('/')}
        >
          ← Volver al Menú
        </button>
      </div>

      {/* Mensaje de estado */}
      {mensaje.texto && (
        <div className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
          {mensaje.texto}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setMensaje({ tipo: '', texto: '' })}
          ></button>
        </div>
      )}

      {/* Formulario */}
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0">Información del Cliente</h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="nombre" className="form-label">Nombre Completo *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label htmlFor="dni" className="form-label">DNI/Cédula *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="dni"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      required
                      placeholder="Ej: 12345678"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="telefono" className="form-label">Teléfono *</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      required
                      placeholder="Ej: +1234567890"
                    />
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Ej: juan@example.com"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="direccion" className="form-label">Dirección *</label>
                  <textarea
                    className="form-control"
                    id="direccion"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    rows="3"
                    required
                    placeholder="Ej: Calle Principal 123, Ciudad"
                  ></textarea>
                </div>

                {/* Botones */}
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Guardando...
                      </>
                    ) : (
                      '💾 Guardar Cliente'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setFormData({
                        nombre: '',
                        dni: '',
                        telefono: '',
                        direccion: '',
                        email: ''
                      });
                      setMensaje({ tipo: '', texto: '' });
                    }}
                  >
                    🗑️ Limpiar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
