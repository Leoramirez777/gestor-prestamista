import React from 'react';
import { Navigate } from 'react-router-dom';

// Ahora la protección depende del estado de autenticación en memoria (prop)
function ProtectedRoute({ children, isAuth }) {
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;
