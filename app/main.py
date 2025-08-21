from fastapi import FastAPI
from .config import get_settings
from .database import Base, engine
from .routers import admin as admin_router

app = FastAPI(title=get_settings().app_name, debug=get_settings().debug)

# Create tables on startup (simple dev approach)
Base.metadata.create_all(bind=engine)

app.include_router(admin_router.router)


@app.get("/health")
def health():
	return {"status": "ok"}
