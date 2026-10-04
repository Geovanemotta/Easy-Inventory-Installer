import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text

from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.software import router as software_router
from app.api.v1.devices import router as devices_router
from app.api.v1.auth import router as auth_router
from app.api.v1.sites import router as sites_router
from app.api.v1.inventory import router as inventory_router

app = FastAPI(
    title="Device Inventory API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    sites_router,
    prefix="/api/v1",
)

app.include_router(
    devices_router,
    prefix="/api/v1",
)

app.include_router(
    software_router,
    prefix="/api/v1",
)

app.include_router(
    dashboard_router,
    prefix="/api/v1",
)

from app.api.v1.agents import router as agents_router
from app.api.v1.ad import router as ad_router

app.include_router(
    ad_router,
    prefix="/api/v1",
)

app.include_router(
    inventory_router,
    prefix="/api/v1",
)

# Compatibilidade com rotas legadas na raiz (ex: /inventory/receive_inventory.php)
app.include_router(
    inventory_router,
    prefix="",
)

app.include_router(
    agents_router,
    prefix="/api/v1",
)

# Distribuição rápida dos agentes na raiz (ex: /agent/install.sh, /agent/install.ps1)
app.include_router(
    agents_router,
    prefix="",
)

@app.get("/api/v1/health")
def health():
    return {
        "status": "ok",
        "service": "device-inventory-api",
        "version": "0.1.0",
    }


@app.get("/api/v1/health/db")
def health_db():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT 1")
        )
        result.scalar()

    return {
        "status": "ok",
        "database": "postgresql",
    }
