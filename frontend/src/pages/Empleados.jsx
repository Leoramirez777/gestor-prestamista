import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEmpleado } from '../api/empleados';

// Gestión de empleados unificada con backend (API)

export default function Empleados() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [puesto, setPuesto] = useState('Cobrador');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [mensaje, setMensaje] = useState(null);

  async function addEmpleado(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    try {
      const payload = {
        nombre: nombre.trim(),
        puesto,
        telefono: telefono.trim() || null,
        dni: dni.trim() || null,
        email: email.trim() || null,
        direccion: direccion.trim() || null,
        fecha_nacimiento: fechaNacimiento || null,
      };
      await createEmpleado(payload);
      setNombre('');
      setPuesto('Cobrador');
      setTelefono('');
      setDni('');
      setEmail('');
      setDireccion('');
      setFechaNacimiento('');
      setMensaje('Empleado creado correctamente. Puedes verlo en "Ver Empleados".');
    } catch (err) {
      alert('No se pudo crear el empleado');
    }
  }

  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold mb-0">Gestión de Empleados</h1>
        <button
          className="btn btn-outline-primary fw-semibold"
          onClick={() => navigate('/')}
        >
          ← Volver al inicio
        </button>
      </div>

      <div className="row">
        <div className="col-md-6 col-lg-5">
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
                  <label className="form-label">Teléfono</label>
                  <input type="tel" className="form-control" value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">DNI/Cédula</label>
                  <input className="form-control" value={dni} onChange={e => setDni(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Dirección</label>
                  <input className="form-control" value={direccion} onChange={e => setDireccion(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Fecha de nacimiento</label>
                  <input type="date" className="form-control" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
                </div>
                <div className="d-grid">
                  <button className="btn btn-purple" type="submit">Agregar</button>
                </div>
              </form>
              {mensaje && (
                <div className="alert alert-success mt-3 mb-0">
                  {mensaje}
                  <button className="btn btn-link btn-sm ms-2" onClick={() => navigate('/ver-empleados')}>Ver Empleados</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-7 d-flex align-items-start">
          <div className="alert alert-info w-100">
            Para ver, buscar o gestionar empleados usa la opción <strong>Ver Empleados</strong>.
            <button className="btn btn-link btn-sm ms-2" onClick={() => navigate('/ver-empleados')}>Ir a Ver Empleados</button>
          </div>
        </div>
      </div>
    </div>
  );
}
// Ya no se muestra detalle aquí; solo alta de empleados.
