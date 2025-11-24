from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import clientes, prestamos, pagos, auth, metrics, empleados, caja, comisiones
from app.database.database import engine, SessionLocal
from app.models import models
from app.caja_service import backfill_caja_movimientos, autocerrar_dias_pendientes, normalizar_descripciones_movimientos, backfill_caja_empleado_movimientos

# Crear las tablas en la base de datos
models.Base.metadata.create_all(bind=engine)

# Backfill movimientos de caja si está vacío
def init_backfill():
    db = SessionLocal()
    try:
        creados = backfill_caja_movimientos(db)
        if creados:
            print(f"[Caja] Backfill inicial completado: {creados} movimientos creados.")
        else:
            # Si ya había movimientos, intentar normalizar descripciones antiguas
            cambios = normalizar_descripciones_movimientos(db)
            if cambios:
                print(f"[Caja] Normalización de descripciones: {cambios} movimientos actualizados.")
        # Autocerrar días pendientes al iniciar
        autocerrar_dias_pendientes(db)
        emp_creados = backfill_caja_empleado_movimientos(db)
        if emp_creados:
            print(f"[Caja Empleado] Backfill movimientos empleado: {emp_creados} creados.")
    except Exception as e:
        print(f"[Caja] Error en backfill inicial: {e}")
    finally:
        db.close()

init_backfill()

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
app.include_router(caja.router)
app.include_router(comisiones.router, prefix="/api/comisiones", tags=["Comisiones"])

@app.get("/")
def read_root():
    return {"message": "Bienvenido a Gestor Prestamista API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
