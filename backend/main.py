from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import clientes, prestamos, pagos, auth, metrics, empleados
from app.database.database import engine
from app.models import models

# Crear las tablas en la base de datos
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestor Prestamista API",
    description="API para gestión de préstamos, clientes y pagos",
    version="1.0.0"
)

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todos los orígenes en desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth.router)
app.include_router(clientes.router, prefix="/api/clientes", tags=["Clientes"])
app.include_router(prestamos.router, prefix="/api/prestamos", tags=["Préstamos"])
app.include_router(pagos.router, prefix="/api/pagos", tags=["Pagos"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Métricas"])
app.include_router(empleados.router)

@app.get("/")
def read_root():
    return {"message": "Bienvenido a Gestor Prestamista API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
