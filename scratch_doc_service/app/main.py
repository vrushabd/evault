from fastapi import FastAPI
from dotenv import load_dotenv

# Load shared .env before settings / encryption read os.environ
load_dotenv()

from app.config.settings import settings
from app.routes.documents import router as documents_router

app = FastAPI(
    title=settings.app_name,
    description="Document Microservice for eVault",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

app.include_router(documents_router)

@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint to verify service is running.
    """
    return {
        "service": settings.app_name,
        "status": "healthy"
    }
