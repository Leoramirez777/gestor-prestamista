import React from 'react';

export default function Ajustes() {
  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">Ajustes Generales</h1>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Seguridad y Sistema</h5>
          <p className="card-text text-muted">Aquí puedes cambiar contraseña, configurar políticas de seguridad y ajustes generales del sistema.</p>

          <div className="list-group">
            <button className="list-group-item list-group-item-action">Cambiar contraseña</button>
            <button className="list-group-item list-group-item-action">Configurar notificaciones</button>
            <button className="list-group-item list-group-item-action">Preferencias regionales</button>
            <button className="list-group-item list-group-item-action">Ajustes de respaldos</button>
          </div>
        </div>
      </div>
    </div>
  );
}
