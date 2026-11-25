from fastapi import APIRouter, Depends, Request, Form, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, get_app_settings
from app.auth import verify_password, create_access_token, get_current_user

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if user:
        return RedirectResponse(url="/taurus-py/", status_code=status.HTTP_303_SEE_OTHER)
    
    settings = get_app_settings(db)
    return templates.TemplateResponse("login.html", {
        "request": request,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "error": None
    })

@router.post("/login", response_class=HTMLResponse)
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    settings = get_app_settings(db)
    user = db.query(User).filter(User.username == username.strip()).first()
    
    if not user or not verify_password(password, user.password_hash):
        return templates.TemplateResponse("login.html", {
            "request": request,
            "app_name": settings["app_name"],
            "app_tagline": settings["app_tagline"],
            "app_logo_url": settings["app_logo_url"],
            "error": "Username atau password yang Anda masukkan salah!"
        }, status_code=400)
    
    if user.status != "approved":
        return templates.TemplateResponse("login.html", {
            "request": request,
            "app_name": settings["app_name"],
            "app_tagline": settings["app_tagline"],
            "app_logo_url": settings["app_logo_url"],
            "error": f"Status akun Anda: {user.status}. Hubungi Administrator."
        }, status_code=403)
    
    # Buat JWT access token
    token = create_access_token({
        "userId": user.id,
        "username": user.username,
        "role": user.role
    })
    
    response = RedirectResponse(url="/taurus-py/", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        key="taurus_token",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        path="/taurus-py"
    )
    return response

@router.get("/logout")
async def logout():
    response = RedirectResponse(url="/taurus-py/login", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(key="taurus_token", path="/taurus-py")
    return response
