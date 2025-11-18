import React, { useEffect, useState } from 'react';
import { getCurrentUser, updateCurrentUser } from '../api/auth';
import '../styles/Ajustes.css';

export default function Ajustes() {
  const [usuario, setUsuario] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ nombre_completo:'', telefono:'', email:'', direccion:'', dni:'' });

  useEffect(() => {
    (async () => {
      const me = await getCurrentUser();
      if (me) {
        setUsuario(me);
        setFormData({
          nombre_completo: me.nombre_completo || '',
            telefono: me.telefono || '',
            email: me.email || '',
            direccion: me.direccion || '',
            dni: me.dni || ''
        });
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if(!usuario) return;
    setSaving(true);
    try {
      const payload = { ...formData };
      const actualizado = await updateCurrentUser(payload);
      setUsuario(actualizado);
      setEditMode(false);
    } catch (e) { setError('Error guardando cambios'); } finally { setSaving(false); }
  };

  const [verPerfil, setVerPerfil] = useState(false);

  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">Ajustes Generales</h1>
        <button className="btn btn-outline-secondary" onClick={() => window.location.href = '/'}>
          ← Volver al Inicio
        </button>
      </div>

      {!verPerfil ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Seguridad y Sistema</h5>
            <p className="card-text text-muted">Aquí puedes cambiar contraseña, configurar políticas de seguridad y ajustes generales del sistema.</p>

            <div className="list-group">
              <button className="list-group-item list-group-item-action" onClick={() => setVerPerfil(true)}>Mis datos</button>
              <button className="list-group-item list-group-item-action">Cambiar contraseña</button>
              <button className="list-group-item list-group-item-action">Configurar notificaciones</button>
              <button className="list-group-item list-group-item-action">Preferencias regionales</button>
              <button className="list-group-item list-group-item-action">Ajustes de respaldos</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <button className="btn btn-outline-secondary" onClick={() => setVerPerfil(false)}>
              ← Volver a Ajustes
            </button>
          </div>
          <div className="ajustes-perfil-card mb-4">
            <div className="ajustes-perfil-header">
              <h5 className="mb-0">Mi Perfil</h5>
              {usuario && (
                <button className="ajustes-edit-btn" onClick={() => setEditMode(m => !m)}>
                  {editMode ? 'Cancelar' : 'Editar mis datos'}
                </button>
              )}
            </div>
            <div className="ajustes-perfil-body">
              {!usuario && <div className="text-muted">Inicia sesión para ver tu perfil.</div>}
              {usuario && !editMode && (
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="ajustes-field-label">Usuario</div>
                    <div className="ajustes-field-value">{usuario.username}</div>
                  </div>
                  <div className="col-md-3">
                    <div className="ajustes-field-label">Nombre</div>
                    <div className="ajustes-field-value">{usuario.nombre_completo}</div>
                  </div>
                  <div className="col-md-2">
                    <div className="ajustes-field-label">DNI</div>
                    <div className="ajustes-field-value">{usuario.dni || '—'}</div>
                  </div>
                  <div className="col-md-2">
                    <div className="ajustes-field-label">Teléfono</div>
                    <div className="ajustes-field-value">{usuario.telefono || '—'}</div>
                  </div>
                  <div className="col-md-2">
                    <div className="ajustes-field-label">Email</div>
                    <div className="ajustes-field-value">{usuario.email || '—'}</div>
                  </div>
                  <div className="col-md-12">
                    <div className="ajustes-field-label">Dirección</div>
                    <div className="ajustes-field-value">{usuario.direccion || '—'}</div>
                  </div>
                </div>
              )}
              {usuario && editMode && (
                <form onSubmit={(e)=> { e.preventDefault(); handleSave(); }}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Nombre completo</label>
                      <input className="form-control" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} required />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">DNI</label>
                      <input className="form-control" name="dni" value={formData.dni} onChange={handleChange} />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Teléfono</label>
                      <input className="form-control" name="telefono" value={formData.telefono} onChange={handleChange} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Dirección</label>
                      <input className="form-control" name="direccion" value={formData.direccion} onChange={handleChange} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Nueva contraseña (opcional)</label>
                      <input type="password" className="form-control" name="password" onChange={handleChange} />
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={()=> setEditMode(false)}>Cancelar</button>
                  </div>
                </form>
              )}
              {error && <div className="alert alert-danger mt-3 mb-0 py-2 small">{error}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
