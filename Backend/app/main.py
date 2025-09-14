from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import extract

app = FastAPI(title="Inferra.ai - ChatPDF Platform")

# CORS configuration – allow frontend dev server
origins = [
    "*",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(extract.router, prefix="/api/v1", tags=["PDF Processing"])

@app.get("/")
def health_check():
    return {"status": "ok", "project": "Inferra.ai", "description": "ChatPDF Platform"}
