from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api.rooms import router as rooms_router
from .api.access import router as access_router
from .api.notifications_api import router as notifications_router
from .api.events import router as events_router

app = FastAPI(title=settings.app_name, version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allow_origins] if settings.allow_origins != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms_router, prefix="/api")
app.include_router(access_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(events_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"ok": True, "stack": "fastapi", "env": settings.environment}
