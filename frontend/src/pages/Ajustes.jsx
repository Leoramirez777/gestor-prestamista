import React, { useEffect, useState } from 'react';
import { getCurrentUser, updateCurrentUser } from '../api/auth';
import { useSettingsStore } from '../stores/useSettingsStore';
import '../styles/Ajustes.css';

export default function Ajustes() {
  const [usuario, setUsuario] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ nombre_completo:'', telefono:'', email:'', direccion:'', dni:'' });
  const [activeSection, setActiveSection] = useState('menu'); // menu | perfil | cambiar_contrasena | notificaciones | regional | respaldos
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notifications, setNotifications] = useState({ email: true, sms: false });
  const [regional, setRegional] = useState({ lenguaje: 'es', moneda: 'ARS' });
  const [backups, setBackups] = useState({ autoBackup: false, backupHour: '02:00' });

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
        // cargar preferencias locales (si existen)
        try {
          const notif = JSON.parse(localStorage.getItem('prefs_notifications') || 'null');
          if (notif) setNotifications(notif);
        } catch (e) { }
        try {
          const reg = JSON.parse(localStorage.getItem('prefs_regional') || 'null');
          if (reg) {
            setRegional(reg);
            // sincronizar con store
            try { useSettingsStore.getState().setMoneda(reg.moneda); } catch (e) {}
          }
        } catch (e) { }
        try {
          const bk = JSON.parse(localStorage.getItem('prefs_backups') || 'null');
          if (bk) setBackups(bk);
        } catch (e) { }
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

  const handlePasswordChange = async () => {
    setError(null);
    if (!passwordForm.newPassword) return setError('Ingrese la nueva contraseña');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setError('Las contraseñas no coinciden');
    setSaving(true);
    try {
      await updateCurrentUser({ password: passwordForm.newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setActiveSection('menu');
    } catch (err) {
      setError('Error al cambiar la contraseña');
    } finally { setSaving(false); }
  };

  const saveNotifications = () => {
    localStorage.setItem('prefs_notifications', JSON.stringify(notifications));
  };

  const saveRegional = () => {
    localStorage.setItem('prefs_regional', JSON.stringify(regional));
    try { useSettingsStore.getState().setMoneda(regional.moneda); } catch (e) {}
  };

  const saveBackups = () => {
    localStorage.setItem('prefs_backups', JSON.stringify(backups));
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

      {activeSection === 'menu' ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Seguridad y Sistema</h5>
            <p className="card-text text-muted">Aquí puedes cambiar contraseña, configurar políticas de seguridad y ajustes generales del sistema.</p>

            <div className="list-group">
              <button className="list-group-item list-group-item-action" onClick={() => setActiveSection('perfil')}>Mis datos</button>
              <button className="list-group-item list-group-item-action" onClick={() => setActiveSection('cambiar_contrasena')}>Cambiar contraseña</button>
              <button className="list-group-item list-group-item-action" onClick={() => setActiveSection('notificaciones')}>Configurar notificaciones</button>
              <button className="list-group-item list-group-item-action" onClick={() => setActiveSection('regional')}>Preferencias regionales</button>
              <button className="list-group-item list-group-item-action" onClick={() => setActiveSection('respaldos')}>Ajustes de respaldos</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <button className="btn btn-outline-secondary" onClick={() => setActiveSection('menu')}>
              ← Volver a Ajustes
            </button>
          </div>

          {activeSection === 'perfil' && (
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
          )}

          {activeSection === 'cambiar_contrasena' && (
            <div className="card mb-4">
              <div className="card-body">
                <h5>Cambiar contraseña</h5>
                <p className="text-muted small">Introduce tu nueva contraseña. Si quieres, puedes dejar el campo vacío para no cambiarla.</p>
                <form onSubmit={(e)=> { e.preventDefault(); handlePasswordChange(); }}>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Nueva contraseña</label>
                      <input type="password" className="form-control" value={passwordForm.newPassword} onChange={(e)=> setPasswordForm(p=> ({...p, newPassword: e.target.value}))} required />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Confirmar contraseña</label>
                      <input type="password" className="form-control" value={passwordForm.confirmPassword} onChange={(e)=> setPasswordForm(p=> ({...p, confirmPassword: e.target.value}))} required />
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Cambiando...' : 'Cambiar contraseña'}</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={()=> setActiveSection('menu')}>Cancelar</button>
                  </div>
                </form>
                {error && <div className="alert alert-danger mt-3 mb-0 py-2 small">{error}</div>}
              </div>
            </div>
          )}

          {activeSection === 'notificaciones' && (
            <div className="card mb-4">
              <div className="card-body">
                <h5>Notificaciones</h5>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" checked={notifications.email} id="notifEmail" onChange={(e)=> setNotifications(n=> ({...n, email: e.target.checked}))} />
                  <label className="form-check-label" htmlFor="notifEmail">Notificaciones por email</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" checked={notifications.sms} id="notifSms" onChange={(e)=> setNotifications(n=> ({...n, sms: e.target.checked}))} />
                  <label className="form-check-label" htmlFor="notifSms">Notificaciones por SMS</label>
                </div>
                <div className="mt-3 d-flex gap-2">
                  <button className="btn btn-dark" onClick={()=> { saveNotifications(); setActiveSection('menu'); }}>Guardar</button>
                  <button className="btn btn-outline-secondary" onClick={()=> setActiveSection('menu')}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'regional' && (
            <div className="card mb-4">
              <div className="card-body">
                <h5>Preferencias regionales</h5>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Lenguaje</label>
                    <select className="form-select" value={regional.lenguaje} onChange={(e)=> setRegional(r=> ({...r, lenguaje: e.target.value}))}>
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Moneda</label>
                    <select className="form-select" value={regional.moneda} onChange={(e)=> setRegional(r=> ({...r, moneda: e.target.value}))}>
                      <option value="ARS">ARS - Pesos Argentinos</option>
                      <option value="USD">USD - Dólares</option>
                      <option value="EUR">EUR - Euros</option>
                      <option value="BRL">BRL - Reales (BRL)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 d-flex gap-2">
                  <button className="btn btn-dark" onClick={()=> { saveRegional(); setActiveSection('menu'); }}>Guardar</button>
                  <button className="btn btn-outline-secondary" onClick={()=> setActiveSection('menu')}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'respaldos' && (
            <div className="card mb-4">
              <div className="card-body">
                <h5>Respaldos automáticos</h5>
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" checked={backups.autoBackup} id="autoBackup" onChange={(e)=> setBackups(b=> ({...b, autoBackup: e.target.checked}))} />
                  <label className="form-check-label" htmlFor="autoBackup">Habilitar respaldo automático</label>
                </div>
                <div className="mb-3">
                  <label className="form-label">Hora del respaldo</label>
                  <input type="time" className="form-control" value={backups.backupHour} onChange={(e)=> setBackups(b=> ({...b, backupHour: e.target.value}))} />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-dark" onClick={()=> { saveBackups(); setActiveSection('menu'); }}>Guardar</button>
                  <button className="btn btn-outline-secondary" onClick={()=> setActiveSection('menu')}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
