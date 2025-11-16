import React from 'react';

export default function Empleados() {
  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">Gestión de Empleados</h1>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Usuarios y permisos</h5>
          <p className="card-text text-muted">Administra los empleados, roles y permisos dentro del sistema.</p>

          <div className="d-grid gap-2">
            <button className="btn btn-purple">Nuevo empleado</button>
            <button className="btn btn-outline-purple">Administrar roles</button>
          </div>
        </div>
      </div>
    </div>
  );
}
