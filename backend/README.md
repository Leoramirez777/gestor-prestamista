# Gestor Prestamista - Backend API

API REST construida con FastAPI y SQLAlchemy para gestionar préstamos, clientes y pagos.

## Requisitos

- Python 3.8+
- MySQL 5.7+ o MariaDB

## Instalación

1. Crear entorno virtual:
```bash
python -m venv venv
```

2. Activar entorno virtual:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
```bash
# Copiar el archivo de ejemplo
copy .env.example .env

# Editar .env con tus credenciales de base de datos
```

5. Crear la base de datos:
```sql
CREATE DATABASE gestor_prestamista CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Ejecutar

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en: http://localhost:8000

Documentación interactiva: http://localhost:8000/docs

## Endpoints principales

### Clientes
- `GET /api/clientes` - Listar clientes
- `POST /api/clientes` - Crear cliente
- `GET /api/clientes/{id}` - Obtener cliente
- `PUT /api/clientes/{id}` - Actualizar cliente
- `DELETE /api/clientes/{id}` - Eliminar cliente

### Préstamos
- `GET /api/prestamos` - Listar préstamos
- `POST /api/prestamos` - Crear préstamo
- `GET /api/prestamos/{id}` - Obtener préstamo
- `GET /api/prestamos/cliente/{id}` - Préstamos de un cliente
- `PUT /api/prestamos/{id}` - Actualizar préstamo
- `DELETE /api/prestamos/{id}` - Eliminar préstamo

### Pagos
- `GET /api/pagos` - Listar pagos
- `POST /api/pagos` - Registrar pago
- `GET /api/pagos/{id}` - Obtener pago
- `GET /api/pagos/prestamo/{id}` - Pagos de un préstamo
- `DELETE /api/pagos/{id}` - Eliminar pago

## Estructura del proyecto

```
backend/
├── app/
│   ├── database/
│   │   └── database.py
│   ├── models/
│   │   └── models.py
│   ├── routers/
│   │   ├── clientes.py
│   │   ├── prestamos.py
│   │   └── pagos.py
│   └── schemas/
│       └── schemas.py
├── main.py
├── requirements.txt
└── .env
```
