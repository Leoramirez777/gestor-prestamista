import React, { useEffect, useState } from 'react';

// Gestión de empleados totalmente en frontend (localStorage).
// Solo el dueño puede agregar/quitar: se activa con una confirmación
// o con la contraseña definida en VITE_OWNER_PASSWORD.

const STORAGE_KEY = 'empleados_gestor';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveToStorage(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function Empleados() {
  const [empleados, setEmpleados] = useState(() => loadFromStorage());
  const [nombre, setNombre] = useState('');
  const [puesto, setPuesto] = useState('Cobrador');
  const [comision, setComision] = useState(0);
  const [ownerMode, setOwnerMode] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    saveToStorage(empleados);
  }, [empleados]);

  function addEmpleado(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    const nuevo = {
      id: Date.now(),
      nombre: nombre.trim(),
      puesto: puesto,
      comision_percent: Number(comision) || 0,
      personal: { telefono: '', dni: '', email: '' },
      collections: [],
      ventas: [],
    };
    setEmpleados(prev => [nuevo, ...prev]);
    setNombre('');
    setPuesto('Cobrador');
    setComision(0);
  }

  function removeEmpleado(id) {
    if (!ownerMode) return;
    setEmpleados(prev => {
      const next = prev.filter(x => x.id !== id);
      if (selected && selected.id === id) setSelected(null);
      return next;
    });
  }

  function toggleOwner() {
    const secret = import.meta.env.VITE_OWNER_PASSWORD;
    if (secret) {
      const attempt = window.prompt('Ingrese la contraseña de dueño:');
      if (attempt === secret) {
        setOwnerMode(true);
        return;
      }
      alert('Contraseña incorrecta');
      return;
    }

    // Si no hay contraseña definida, pedir confirmación simple
    const ok = window.confirm('Activar modo dueño en este navegador? Esto permitirá agregar/quitar empleados.');
    if (ok) setOwnerMode(true);
  }

  function logoutOwner() {
    setOwnerMode(false);
  }

  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">Gestión de Empleados</h1>
        <div>
          {!ownerMode ? (
            <button className="btn btn-outline-primary" onClick={toggleOwner}>Entrar como dueño</button>
          ) : (
            <button className="btn btn-outline-danger" onClick={logoutOwner}>Salir modo dueño</button>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title">Agregar empleado (solo dueño)</h5>
              <form onSubmit={addEmpleado}>
                <div className="mb-3">
                  <label className="form-label">Nombre</label>
                  <input className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Puesto</label>
                  <select className="form-select" value={puesto} onChange={e => setPuesto(e.target.value)}>
                    <option>Cobrador</option>
                    <option>Vendedor</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Porcentaje de comisión (%)</label>
                  <input type="number" min="0" max="100" className="form-control" value={comision} onChange={e => setComision(e.target.value)} />
                </div>
                <div className="d-grid">
                  <button className="btn btn-purple" type="submit" disabled={!ownerMode}>Agregar</button>
                </div>
                {!ownerMode && <small className="text-muted">Activa "Entrar como dueño" para agregar empleados.</small>}
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Empleados</h5>
              {empleados.length === 0 ? (
                <p className="text-muted">No hay empleados registrados.</p>
              ) : (
                <ul className="list-group">
                  {empleados.map(emp => (
                    <li key={emp.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{emp.nombre}</strong>
                        <div className="text-muted small">{emp.puesto} — {emp.comision_percent || 0}%</div>
                      </div>
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelected(emp)}>Ver</button>
                        {ownerMode && (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeEmpleado(emp.id)}>Eliminar</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 mt-3">
          {selected ? (
            <EmployeeDetail empleado={selected} onUpdate={(u) => {
              setEmpleados(prev => prev.map(p => p.id === u.id ? u : p));
              setSelected(u);
            }} ownerMode={ownerMode} onClose={() => setSelected(null)} />
          ) : (
            <div className="text-muted">Selecciona un empleado para ver detalles</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeDetail({ empleado, onUpdate, ownerMode, onClose }) {
  const [editPersonal, setEditPersonal] = useState(empleado.personal || { telefono: '', dni: '', email: '' });
  const [amount, setAmount] = useState('');
  const [prestamoId, setPrestamoId] = useState('');
  const [ventaCliente, setVentaCliente] = useState('');
  const [ventaMonto, setVentaMonto] = useState('');

  function savePersonal() {
    const next = { ...empleado, personal: editPersonal };
    onUpdate(next);
  }

  function registrarCobro(e) {
    e?.preventDefault();
    if (!ownerMode) return alert('Solo el dueño puede registrar cobros');
    const monto = Number(amount);
    if (!monto || monto <= 0) return;
    const comision = (empleado.comision_percent || 0) * monto / 100;
    const registro = { id: Date.now(), monto, prestamoId: prestamoId || null, fecha: new Date().toISOString(), comision };
    const next = { ...empleado, collections: [registro, ...(empleado.collections || [])] };
    onUpdate(next);
    setAmount(''); setPrestamoId('');
  }

  function registrarVenta(e) {
    e?.preventDefault();
    if (!ownerMode) return alert('Solo el dueño puede registrar ventas');
    const monto = Number(ventaMonto);
    if (!monto || monto <= 0) return;
    const comision = (empleado.comision_percent || 0) * monto / 100;
    const registro = { id: Date.now(), cliente: ventaCliente, monto, fecha: new Date().toISOString(), comision };
    const next = { ...empleado, ventas: [registro, ...(empleado.ventas || [])] };
    onUpdate(next);
    setVentaCliente(''); setVentaMonto('');
  }

  const totalCobrado = (empleado.collections || []).reduce((s, c) => s + (c.monto || 0), 0);
  const totalComisionCobros = (empleado.collections || []).reduce((s, c) => s + (c.comision || 0), 0);
  const totalVentas = (empleado.ventas || []).reduce((s, v) => s + (v.monto || 0), 0);
  const totalComisionVentas = (empleado.ventas || []).reduce((s, v) => s + (v.comision || 0), 0);

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between">
          <h5 className="card-title">Detalle: {empleado.nombre}</h5>
          <div>
            <button className="btn btn-sm btn-outline-secondary me-2" onClick={onClose}>Cerrar</button>
            {ownerMode && <small className="text-muted">Modo dueño activo</small>}
          </div>
        </div>

        <div className="mb-3">
          <strong>Puesto:</strong> {empleado.puesto} — <strong>{empleado.comision_percent || 0}%</strong>
        </div>

        <div className="row">
          <div className="col-md-6">
            <h6>Datos personales</h6>
            <div className="mb-2">
              <label className="form-label">Teléfono</label>
              <input className="form-control" value={editPersonal.telefono || ''} onChange={e => setEditPersonal({...editPersonal, telefono: e.target.value})} disabled={!ownerMode} />
            </div>
            <div className="mb-2">
              <label className="form-label">DNI</label>
              <input className="form-control" value={editPersonal.dni || ''} onChange={e => setEditPersonal({...editPersonal, dni: e.target.value})} disabled={!ownerMode} />
            </div>
            <div className="mb-2">
              <label className="form-label">Email</label>
              <input className="form-control" value={editPersonal.email || ''} onChange={e => setEditPersonal({...editPersonal, email: e.target.value})} disabled={!ownerMode} />
            </div>
            {ownerMode && <div className="d-grid"><button className="btn btn-sm btn-primary" onClick={savePersonal}>Guardar datos</button></div>}
          </div>

          <div className="col-md-6">
            <h6>Resumen</h6>
            <p className="mb-1">Total cobrado: <strong>{totalCobrado.toFixed(2)}</strong></p>
            <p className="mb-1">Comisión cobros: <strong>{totalComisionCobros.toFixed(2)}</strong></p>
            <p className="mb-1">Total ventas: <strong>{totalVentas.toFixed(2)}</strong></p>
            <p className="mb-1">Comisión ventas: <strong>{totalComisionVentas.toFixed(2)}</strong></p>
          </div>
        </div>

        <hr />

        {empleado.puesto === 'Cobrador' && (
          <div>
            <h6>Registrar cobro</h6>
            <form onSubmit={registrarCobro} className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label">Monto</label>
                <input className="form-control" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Prestamo ID (opcional)</label>
                <input className="form-control" value={prestamoId} onChange={e => setPrestamoId(e.target.value)} />
              </div>
              <div className="col-md-4">
                <button className="btn btn-sm btn-success w-100" type="submit">Registrar cobro</button>
              </div>
            </form>

            <h6 className="mt-3">Historial de cobros</h6>
            <ul className="list-group">
              {(empleado.collections || []).map(c => (
                <li className="list-group-item" key={c.id}>
                  <div><strong>Monto:</strong> {c.monto.toFixed(2)} — <small className="text-muted">Comisión: {c.comision.toFixed(2)}</small></div>
                  <div className="text-muted small">Fecha: {new Date(c.fecha).toLocaleString()} {c.prestamoId ? `— Prestamo ${c.prestamoId}` : ''}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {empleado.puesto === 'Vendedor' && (
          <div>
            <h6>Registrar venta / cliente</h6>
            <form onSubmit={registrarVenta} className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label">Cliente</label>
                <input className="form-control" value={ventaCliente} onChange={e => setVentaCliente(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Monto venta</label>
                <input className="form-control" value={ventaMonto} onChange={e => setVentaMonto(e.target.value)} />
              </div>
              <div className="col-md-4">
                <button className="btn btn-sm btn-success w-100" type="submit">Registrar venta</button>
              </div>
            </form>

            <h6 className="mt-3">Historial de ventas</h6>
            <ul className="list-group">
              {(empleado.ventas || []).map(v => (
                <li className="list-group-item" key={v.id}>
                  <div><strong>Cliente:</strong> {v.cliente} — <strong>Monto:</strong> {v.monto.toFixed(2)}</div>
                  <div className="text-muted small">Fecha: {new Date(v.fecha).toLocaleString()} — Comisión: {v.comision.toFixed(2)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
