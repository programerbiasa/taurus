from fastapi import APIRouter, Depends, Request, Form, UploadFile, File, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from datetime import datetime
import os
import shutil
from app.database import get_db
from app.models import User, Category, Priority, VehicleUnit, AppSetting, get_app_settings
from app.auth import require_admin, get_password_hash
from app.config import UPLOAD_DIR

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# 1. PENGATURAN USER
@router.get("/admin/users", response_class=HTMLResponse)
async def admin_users_list(request: Request, db: Session = Depends(get_db)):
    current_user = require_admin(request, db)
    settings = get_app_settings(db)
    users = db.query(User).order_by(User.id).all()

    return templates.TemplateResponse("admin/users.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "admin_users",
        "users": users,
        "error": None
    })

@router.post("/admin/users/create")
async def admin_user_create(
    request: Request,
    username: str = Form(...),
    name: str = Form(...),
    role: str = Form("client"),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    current_user = require_admin(request, db)
    existing = db.query(User).filter(User.username == username.strip()).first()
    if existing:
        settings = get_app_settings(db)
        users = db.query(User).order_by(User.id).all()
        return templates.TemplateResponse("admin/users.html", {
            "request": request,
            "current_user": current_user,
            "app_name": settings["app_name"],
            "app_tagline": settings["app_tagline"],
            "app_logo_url": settings["app_logo_url"],
            "active_page": "admin_users",
            "users": users,
            "error": f"Username '{username.strip()}' sudah digunakan!"
        }, status_code=400)

    new_user = User(
        username=username.strip(),
        name=name.strip(),
        role=role,
        password_hash=get_password_hash(password),
        status="approved"
    )
    db.add(new_user)
    db.commit()

    return RedirectResponse(url="/taurus-py/admin/users", status_code=status.HTTP_303_SEE_OTHER)

# 2. KELOLA KATEGORI
@router.get("/admin/categories", response_class=HTMLResponse)
async def admin_categories_list(request: Request, db: Session = Depends(get_db)):
    current_user = require_admin(request, db)
    settings = get_app_settings(db)
    categories = db.query(Category).all()

    return templates.TemplateResponse("admin/categories.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "admin_categories",
        "categories": categories
    })

@router.post("/admin/categories/create")
async def admin_category_create(
    request: Request,
    name: str = Form(...),
    description: str = Form(None),
    db: Session = Depends(get_db)
):
    current_user = require_admin(request, db)
    if name.strip():
        c = Category(name=name.strip(), description=description.strip() if description else None)
        db.add(c)
        db.commit()

    return RedirectResponse(url="/taurus-py/admin/categories", status_code=status.HTTP_303_SEE_OTHER)

# 3. TINGKAT PRIORITAS
@router.get("/admin/priorities", response_class=HTMLResponse)
async def admin_priorities_list(request: Request, db: Session = Depends(get_db)):
    current_user = require_admin(request, db)
    settings = get_app_settings(db)
    priorities = db.query(Priority).order_by(Priority.level).all()

    return templates.TemplateResponse("admin/priorities.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "admin_priorities",
        "priorities": priorities
    })

@router.post("/admin/priorities/create")
async def admin_priority_create(
    request: Request,
    name: str = Form(...),
    level: int = Form(1),
    color: str = Form("#f59e0b"),
    db: Session = Depends(get_db)
):
    current_user = require_admin(request, db)
    if name.strip():
        p = Priority(name=name.strip(), level=level, color=color)
        db.add(p)
        db.commit()

    return RedirectResponse(url="/taurus-py/admin/priorities", status_code=status.HTTP_303_SEE_OTHER)

# 4. NOMOR UNIT KENDARAAN
@router.get("/admin/units", response_class=HTMLResponse)
async def admin_units_list(request: Request, db: Session = Depends(get_db)):
    current_user = require_admin(request, db)
    settings = get_app_settings(db)
    units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()

    return templates.TemplateResponse("admin/units.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "admin_units",
        "units": units
    })

@router.post("/admin/units/create")
async def admin_unit_create(
    request: Request,
    unit_number: str = Form(...),
    brand: str = Form(None),
    department: str = Form(None),
    db: Session = Depends(get_db)
):
    current_user = require_admin(request, db)
    if unit_number.strip():
        u = VehicleUnit(unit_number=unit_number.strip(), vehicle_brand=brand.strip() if brand else None, description=department.strip() if department else None)
        db.add(u)
        db.commit()

    return RedirectResponse(url="/taurus-py/admin/units", status_code=status.HTTP_303_SEE_OTHER)

# 5. PENGATURAN IDENTITAS APLIKASI
def save_setting(db: Session, key: str, val: str):
    row = db.query(AppSetting).filter(AppSetting.setting_key == key).first()
    if not row:
        row = AppSetting(setting_key=key, setting_value=val)
        db.add(row)
    else:
        row.setting_value = val
    db.commit()

@router.get("/admin/settings", response_class=HTMLResponse)
async def admin_settings_view(request: Request, success: str = None, db: Session = Depends(get_db)):
    current_user = require_admin(request, db)
    settings = get_app_settings(db)

    return templates.TemplateResponse("admin/settings.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "admin_settings",
        "setting": settings,
        "success": success
    })

@router.post("/admin/settings")
async def admin_settings_submit(
    request: Request,
    app_name: str = Form(...),
    app_tagline: str = Form(None),
    logo: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    current_user = require_admin(request, db)

    save_setting(db, "app_name", app_name.strip())
    if app_tagline:
        save_setting(db, "app_tagline", app_tagline.strip())

    if logo and logo.filename:
        filename = f"logo_{int(datetime.utcnow().timestamp())}_{logo.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)
        save_setting(db, "app_logo_url", f"/uploads/{filename}")

    return RedirectResponse(url="/taurus-py/admin/settings?success=Pengaturan+berhasil+disimpan", status_code=status.HTTP_303_SEE_OTHER)
