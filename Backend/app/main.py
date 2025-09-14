from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import extract

app = FastAPI(title="Inferra.ai - ChatPDF Platform")

# CORS configuration – allow frontend dev server and production domains
origins = [
    "*",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://your-vercel-app.vercel.app",  # Replace with your actual Vercel URL
    "https://*.vercel.app",  # Allow all Vercel apps
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
