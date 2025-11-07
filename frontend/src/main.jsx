import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

import Clientes from './pages/clientes.jsx'
import NuevosClientes from './pages/NuevosClientes.jsx'
import Prestamos from './pages/Prestamos.jsx'
import NuevosPrestamos from './pages/NuevosPrestamos.jsx'
import Pagos from './pages/Pagos.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="nuevos-clientes" element={<NuevosClientes />} />
        <Route path="prestamos" element={<Prestamos />} />
        <Route path="nuevos-prestamos" element={<NuevosPrestamos />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="pagos-atrasados" element={<Pagos />} />
        <Route path="resumen" element={<Pagos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
