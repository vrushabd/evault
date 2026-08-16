import os
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("evault-integration")

# Initialize FastAPI Application
app = FastAPI(
    title="eVault Integration Service",
    description="Microservice providing eCourts case registry, AI document classifier, and Aadhaar identity binding.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for direct browser access. When traffic comes only via gateway,
# duplicate ACAO headers can break the browser — prefer Vite proxy / gateway CORS.
_cors_origins = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = f"{process_time:.2f}ms"
    
    logger.info(
        f"METHOD={request.method} PATH={request.url.path} STATUS={response.status_code} TIME={formatted_process_time}"
    )
    return response


# Import and Register Routers
from routers import ecourts, classifier, aadhaar

app.include_router(ecourts.router)
app.include_router(classifier.router)
app.include_router(aadhaar.router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "success": True,
        "data": {
            "name": "eVault Integration Service",
            "version": "1.0.0",
            "status": "RUNNING",
            "documentation": "/docs",
            "endpoints": [
                "/ecourts/cases",
                "/ecourts/case/{case_id}",
                "/ecourts/cases/judge/{judge_id}",
                "/ecourts/cases/lawyer/{bar_number}",
                "/ecourts/courts",
                "/ecourts/health",
                "/classify/document",
                "/classify/text",
                "/aadhaar/bind",
                "/aadhaar/verify/{wallet_address}"
            ]
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8086))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
