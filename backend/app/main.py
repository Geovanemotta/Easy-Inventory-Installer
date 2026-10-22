import asyncio
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text

from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.software import router as software_router, device_software_router
from app.api.v1.devices import router as devices_router
from app.api.v1.auth import router as auth_router
from app.api.v1.sites import router as sites_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.network_assets import router as network_assets_router
from app.services.network_asset_service import iniciar_background_ping_sweeper

ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
ENABLE_SWAGGER_DOCS = os.getenv("ENABLE_SWAGGER_DOCS", "false").lower() in ("true", "1", "yes")

docs_url = "/docs" if (ENABLE_SWAGGER_DOCS or ENVIRONMENT in ("dev", "development")) else None
redoc_url = "/redoc" if (ENABLE_SWAGGER_DOCS or ENVIRONMENT in ("dev", "development")) else None
openapi_url = "/openapi.json" if (ENABLE_SWAGGER_DOCS or ENVIRONMENT in ("dev", "development")) else None


def _run_startup_migrations():
    try:
        from app.database import engine
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE sites ADD COLUMN IF NOT EXISTS circuito VARCHAR(100);"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS smtp_settings (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    smtp_host VARCHAR(255) NOT NULL DEFAULT '',
                    smtp_port INTEGER NOT NULL DEFAULT 25,
                    smtp_user VARCHAR(255),
                    smtp_password VARCHAR(255),
                    use_tls BOOLEAN NOT NULL DEFAULT FALSE,
                    use_ssl BOOLEAN NOT NULL DEFAULT FALSE,
                    default_operator_email VARCHAR(255) NOT NULL DEFAULT '',
                    default_subject_prefix VARCHAR(255) NOT NULL DEFAULT 'Reserva de IP/MAC - Firewall',
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_smtp_settings_company_id ON smtp_settings(company_id);"))
            conn.commit()
    except Exception as e:
        print(f"[STARTUP MIGRATION WARNING] {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_startup_migrations()
    sweeper_task = asyncio.create_task(iniciar_background_ping_sweeper())
    try:
        yield
    finally:
        sweeper_task.cancel()
        try:
            await sweeper_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Device Inventory API",
    version="0.1.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
    lifespan=lifespan,
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
    device_software_router,
    prefix="/api/v1",
)

app.include_router(
    dashboard_router,
    prefix="/api/v1",
)

app.include_router(
    network_assets_router,
    prefix="/api/v1",
)

from app.api.v1.licenses import router as licenses_router
app.include_router(
    licenses_router,
    prefix="/api/v1",
)

from app.api.v1.agents import router as agents_router
from app.api.v1.ad import router as ad_router
from app.api.v1.terminal import router as terminal_router
from app.api.v1.remote_access import router as remote_access_router

app.include_router(
    remote_access_router,
    prefix="/api/v1",
)

app.include_router(
    terminal_router,
    prefix="/api/v1",
)

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
