from fastapi import FastAPI, Request, status
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routes import auth, dashboard, tickets, jobs, radios, dashcams, chat, admin
from app.config import ROOT_PATH

app = FastAPI(
    title="TAURUS - IT Support & Radio System (Python Edition)",
    description="Python Fullstack edition of TAURUS Management System",
    version="1.0.0",
    root_path=ROOT_PATH
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(tickets.router)
app.include_router(jobs.router)
app.include_router(radios.router)
app.include_router(dashcams.router)
app.include_router(chat.router)
app.include_router(admin.router)

# Mount Static Files (Uploads and Static Assets)
static_dir = os.path.join(os.path.dirname(__file__), "app", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Error Handling Fallback
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return RedirectResponse(url="/taurus-py/", status_code=status.HTTP_303_SEE_OTHER)

@app.exception_handler(401)
async def unauthorized_handler(request: Request, exc):
    return RedirectResponse(url="/taurus-py/login", status_code=status.HTTP_303_SEE_OTHER)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5001, workers=2)
