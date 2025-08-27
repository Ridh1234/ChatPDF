import os

# Disable ChromaDB telemetry at application startup to prevent PostHog errors
os.environ['ANONYMIZED_TELEMETRY'] = 'False'
os.environ['CHROMA_TELEMETRY_DISABLED'] = 'True'

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import extract
from app import chat

app = FastAPI(title="Zephyr PDF Extractor")

# CORS configuration – allow frontend dev server
origins = [
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
app.include_router(extract.router, prefix="/api/v1", tags=["PDF Extraction"])
app.include_router(chat.router, tags=["Chat"])

@app.get("/")
def health_check():
    return {"status": "ok", "project": "Zephyr PDF Extractor"}
