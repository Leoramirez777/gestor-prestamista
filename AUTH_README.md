# Sistema de Autenticación - Gestor Prestamista

## ✅ Sistema de Login Implementado

Se ha agregado un sistema completo de autenticación con JWT para proteger la aplicación.

### 🔐 Credenciales de Acceso

**Usuario inicial:**
- **Usuario:** `admin`
- **Contraseña:** `admin123`

⚠️ **IMPORTANTE:** Cambia esta contraseña después del primer inicio de sesión por seguridad.

### 🚀 Características Implementadas

1. **Backend (FastAPI)**
   - ✅ Modelo de Usuario en la base de datos
   - ✅ Autenticación con JWT (JSON Web Tokens)
   - ✅ Endpoints de login y registro
   - ✅ Protección de rutas con tokens
   - ✅ Encriptación de contraseñas con bcrypt
   - ✅ Tokens con expiración de 8 horas

2. **Frontend (React)**
   - ✅ Página de Login con diseño moderno
   - ✅ Formulario de registro de nuevos usuarios
   - ✅ Protección de rutas (ProtectedRoute)
   - ✅ Persistencia de sesión en localStorage
   - ✅ Botón de cerrar sesión en dashboard
   - ✅ Redirección automática al login si no hay sesión

### 📝 Endpoints de Autenticación

- **POST /api/auth/login** - Iniciar sesión
- **POST /api/auth/register** - Registrar nuevo usuario
- **GET /api/auth/me** - Obtener usuario actual
- **POST /api/auth/logout** - Cerrar sesión

### 🔧 Cómo Funciona

1. **Al iniciar la aplicación:**
   - El usuario es redirigido automáticamente al login
   - No puede acceder a ninguna página sin autenticarse

2. **Después del login:**
   - Se genera un token JWT que se guarda en localStorage
   - El token se envía en cada petición al backend
   - La sesión permanece activa por 8 horas

3. **Al cambiar de página:**
   - La sesión se mantiene activa
   - No necesitas volver a iniciar sesión
   - Todas las rutas están protegidas

4. **Al cerrar sesión:**
   - Se elimina el token del navegador
   - Redirección automática al login
   - Necesitas autenticarte nuevamente para acceder

### 📦 Dependencias Instaladas

Backend:
```
PyJWT==2.10.1
bcrypt==5.0.0
cryptography==46.0.3
passlib==1.7.4
python-multipart==0.0.9
```

### 🎨 Interfaz de Login

- Diseño moderno con gradiente morado
- Animaciones suaves
- Validación de formularios
- Mensajes de error claros
- Opción para alternar entre login y registro

### 🔄 Para Crear Más Usuarios

Puedes registrar nuevos usuarios de dos formas:

1. **Desde la interfaz de login:**
   - Clic en "¿No tienes cuenta? Regístrate aquí"
   - Completa el formulario
   - Inicia sesión con las nuevas credenciales

2. **Desde código Python:**
   ```python
   python create_admin.py
   ```
   (Modifica el script para crear otros usuarios)

### 🛡️ Seguridad

- ✅ Contraseñas encriptadas con bcrypt
- ✅ Tokens JWT firmados
- ✅ Validación de sesión en cada request
- ✅ Expiración automática de tokens
- ✅ Protección contra acceso no autorizado

### 📱 Uso

1. Inicia el backend: `uvicorn main:app --reload`
2. Inicia el frontend: `npm run dev`
3. Accede a la aplicación
4. Inicia sesión con las credenciales admin
5. Navega por la aplicación - tu sesión se mantiene activa
6. Cierra sesión cuando termines

---

**¡Tu aplicación ahora está protegida con autenticación!** 🎉
