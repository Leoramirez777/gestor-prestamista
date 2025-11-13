import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPrestamo } from '../api/prestamos';
import { fetchClientes } from '../api/clientes';

export default function NuevosPrestamos() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    monto: '',
    tasa_interes: '',
    plazo_dias: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const clientesData = await fetchClientes();
        setClientes(clientesData || []);
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        setMensaje({
          tipo: 'error',
          texto: 'Error al cargar la lista de clientes'
        });
      } finally {
        setLoadingClientes(false);
      }
    };
    
    loadClientes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calcularMontoTotal = () => {
    const monto = parseFloat(formData.monto) || 0;
    const tasa = parseFloat(formData.tasa_interes) || 0;
    const plazo = parseInt(formData.plazo_dias) || 0;
    
    // Cálculo simple de interés: monto + (monto * tasa / 100)
    const interes = (monto * tasa) / 100;
    return monto + interes;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      // Preparar datos del préstamo
      const prestamoData = {
        cliente_id: parseInt(formData.cliente_id),
        monto: parseFloat(formData.monto),
        tasa_interes: parseFloat(formData.tasa_interes),
        plazo_dias: parseInt(formData.plazo_dias),
        fecha_inicio: new Date().toISOString().split('T')[0] // Fecha actual
      };

      console.log('Enviando datos de préstamo:', prestamoData);
      
      await createPrestamo(prestamoData);
      
      setMensaje({
        tipo: 'success',
        texto: '¡Préstamo creado exitosamente!'
      });
      
      // Limpiar formulario
      setFormData({
        cliente_id: '',
        monto: '',
        tasa_interes: '',
        plazo_dias: ''
      });
      
      // Redirigir después de un tiempo
      setTimeout(() => {
        navigate('/prestamos');
      }, 2000);
      
    } catch (error) {
      console.error('Error al crear préstamo:', error);
      let errorMessage = 'Error al crear el préstamo.';
      
      if (error.response?.data?.detail) {
        errorMessage = `Error: ${error.response.data.detail}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMensaje({
        tipo: 'error',
        texto: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingClientes) {
    return (
      <div className="container my-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando clientes...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5">
      {/* Header con botón de regreso */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold text-dark">💰 Nuevo Préstamo</h1>
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
            <div className="card-header bg-success text-white">
              <h5 className="card-title mb-0">Información del Préstamo</h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="cliente_id" className="form-label">Cliente *</label>
                    <select
                      className="form-select"
                      id="cliente_id"
                      name="cliente_id"
                      value={formData.cliente_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} - DNI: {cliente.dni}
                        </option>
                      ))}
                    </select>
                    {clientes.length === 0 && (
                      <small className="text-muted">
                        No hay clientes disponibles. 
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 ms-1"
                          onClick={() => navigate('/nuevos-clientes')}
                        >
                          Crear uno nuevo
                        </button>
                      </small>
                    )}
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label htmlFor="monto" className="form-label">Monto a Prestar *</label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <input
                        type="number"
                        className="form-control"
                        id="monto"
                        name="monto"
                        value={formData.monto}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="tasa_interes" className="form-label">Tasa de Interés *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        id="tasa_interes"
                        name="tasa_interes"
                        value={formData.tasa_interes}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.1"
                        placeholder="5.0"
                      />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label htmlFor="plazo_dias" className="form-label">Plazo *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        id="plazo_dias"
                        name="plazo_dias"
                        value={formData.plazo_dias}
                        onChange={handleChange}
                        required
                        min="1"
                        placeholder="30"
                      />
                      <span className="input-group-text">días</span>
                    </div>
                  </div>
                </div>

                {/* Resumen del préstamo */}
                {formData.monto && formData.tasa_interes && (
                  <div className="alert alert-info">
                    <h6 className="fw-bold">📊 Resumen del Préstamo:</h6>
                    <div className="row">
                      <div className="col-sm-6">
                        <strong>Monto prestado:</strong> ${parseFloat(formData.monto || 0).toFixed(2)}
                      </div>
                      <div className="col-sm-6">
                        <strong>Total a pagar:</strong> ${calcularMontoTotal().toFixed(2)}
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-sm-6">
                        <strong>Interés:</strong> ${(calcularMontoTotal() - parseFloat(formData.monto || 0)).toFixed(2)}
                      </div>
                      <div className="col-sm-6">
                        <strong>Plazo:</strong> {formData.plazo_dias} días
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading || clientes.length === 0}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creando...
                      </>
                    ) : (
                      '💰 Crear Préstamo'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setFormData({
                        cliente_id: '',
                        monto: '',
                        tasa_interes: '',
                        plazo_dias: ''
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
