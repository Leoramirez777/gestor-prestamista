import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre_completo: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        await login(formData.username, formData.password);
        onLogin();
        navigate('/');
      } else {
        if (!formData.nombre_completo) {
          setError('El nombre completo es requerido');
          setLoading(false);
          return;
        }
        await register(formData.username, formData.password, formData.nombre_completo);
        setIsLoginMode(true);
        setFormData({ username: '', password: '', nombre_completo: '' });
        setError('');
        alert('Usuario registrado exitosamente. Por favor inicia sesión.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <i className="fas fa-hand-holding-usd"></i>
          </div>
          <h1 className="login-title">Gestor Prestamista</h1>
          <p className="login-subtitle">
            {isLoginMode ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">
              <i className="fas fa-user me-2"></i>
              Usuario
            </label>
            <input
              type="text"
              className="form-control"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Ingresa tu usuario"
              autoComplete="username"
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="nombre_completo">
                <i className="fas fa-id-card me-2"></i>
                Nombre Completo
              </label>
              <input
                type="text"
                className="form-control"
                id="nombre_completo"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                required={!isLoginMode}
                placeholder="Ingresa tu nombre completo"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">
              <i className="fas fa-lock me-2"></i>
              Contraseña
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Ingresa tu contraseña"
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                {isLoginMode ? 'Iniciando sesión...' : 'Registrando...'}
              </>
            ) : (
              <>
                <i className={`fas ${isLoginMode ? 'fa-sign-in-alt' : 'fa-user-plus'} me-2`}></i>
                {isLoginMode ? 'Iniciar Sesión' : 'Registrarse'}
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <button 
            className="btn btn-link"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
              setFormData({ username: '', password: '', nombre_completo: '' });
            }}
          >
            {isLoginMode 
              ? '¿No tienes cuenta? Regístrate aquí' 
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
