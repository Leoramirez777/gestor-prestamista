import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import './index.css'

import Clientes from './pages/clientes.jsx'
import PerfilCliente from './pages/PerfilCliente.jsx'
import NuevosClientes from './pages/NuevosClientes.jsx'
import Prestamos from './pages/Prestamos.jsx'
import NuevosPrestamos from './pages/NuevosPrestamos.jsx'
import Pagos from './pages/Pagos.jsx'
import Resumen from './pages/Resumen.jsx'
import { isAuthenticated } from './api/auth.js'

function AppRouter() {
  const [isAuth, setIsAuth] = useState(isAuthenticated());

  const handleLogin = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    setIsAuth(false);
  };

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuth ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <App onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clientes" 
        element={
          <ProtectedRoute>
            <Clientes />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clientes/:id" 
        element={
          <ProtectedRoute>
            <PerfilCliente />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nuevos-clientes" 
        element={
          <ProtectedRoute>
            <NuevosClientes />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/prestamos" 
        element={
          <ProtectedRoute>
            <Prestamos />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nuevos-prestamos" 
        element={
          <ProtectedRoute>
            <NuevosPrestamos />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pagos" 
        element={
          <ProtectedRoute>
            <Pagos />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pagos-atrasados" 
        element={
          <ProtectedRoute>
            <Pagos />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/resumen" 
        element={
          <ProtectedRoute>
            <Resumen />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to={isAuth ? "/" : "/login"} replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
