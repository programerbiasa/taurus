from fastapi import APIRouter, Depends, Request, Form, UploadFile, File, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import os
import shutil
from app.database import get_db
from app.models import Dashcam, DashcamMovement, DashcamBrand, VehicleUnit, get_app_settings
from app.auth import require_user, require_staff
from app.config import UPLOAD_DIR

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/dashcams", response_class=HTMLResponse)
async def dashcam_list(request: Request, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    dashcams = db.query(Dashcam).order_by(desc(Dashcam.updated_at)).all()

    return templates.TemplateResponse("dashcams/list.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "dashcams",
        "dashcams": dashcams
    })

@router.get("/dashcams/create", response_class=HTMLResponse)
async def dashcam_create_view(request: Request, db: Session = Depends(get_db)):
    current_user = require_staff(request, db)
    settings = get_app_settings(db)

    vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()

    return templates.TemplateResponse("dashcams/form.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "dashcams",
        "dashcam": None,
        "vehicle_units": vehicle_units,
        "error": None
    })

@router.post("/dashcams/create")
async def dashcam_create_submit(
    request: Request,
    serial_number: str = Form(...),
    brand: str = Form("Hikvision"),
    unit_id: str = Form(None),
    sim_provider: str = Form("Telkomsel"),
    power_status: str = Form("Baik"),
    gps_status: str = Form("Baik"),
    camera_status: str = Form("Aktif"),
    has_front_camera: bool = Form(False),
    has_cabin_camera: bool = Form(False),
    has_fatigue_camera: bool = Form(False),
    notes: str = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)

    existing = db.query(Dashcam).filter(Dashcam.serial_number == serial_number.strip()).first()
    if existing:
        settings = get_app_settings(db)
        vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()
        return templates.TemplateResponse("dashcams/form.html", {
            "request": request,
            "current_user": current_user,
            "app_name": settings["app_name"],
            "app_tagline": settings["app_tagline"],
            "app_logo_url": settings["app_logo_url"],
            "active_page": "dashcams",
            "dashcam": None,
            "vehicle_units": vehicle_units,
            "error": f"Nomor Serial '{serial_number.strip()}' sudah terdaftar!"
        }, status_code=400)

    photo_url = None
    if photo and photo.filename:
        filename = f"dashcam_{int(datetime.utcnow().timestamp())}_{photo.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        photo_url = f"/uploads/{filename}"

    unit_obj = None
    if unit_id:
        unit_obj = db.query(VehicleUnit).filter(VehicleUnit.unit_number == unit_id).first()

    dashcam = Dashcam(
        serial_number=serial_number.strip(),
        brand=brand.strip() if brand else "Hikvision",
        current_unit_id=unit_obj.id if unit_obj else None,
        current_unit_number=unit_id if unit_id else None,
        internet_provider=sim_provider.strip() if sim_provider else "Telkomsel",
        electrical_condition=power_status,
        gps_condition=gps_status,
        camera_status=camera_status,
        has_front_camera=has_front_camera,
        has_cabin_camera=has_cabin_camera,
        has_fatigue_camera=has_fatigue_camera,
        notes=notes.strip() if notes else None,
        photo_url=photo_url
    )
    db.add(dashcam)
    db.commit()

    return RedirectResponse(url="/taurus-py/dashcams", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/dashcams/{dashcam_id}/edit", response_class=HTMLResponse)
async def dashcam_edit_view(dashcam_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = require_staff(request, db)
    settings = get_app_settings(db)

    dashcam = db.query(Dashcam).filter(Dashcam.id == dashcam_id).first()
    if not dashcam:
        return RedirectResponse(url="/taurus-py/dashcams", status_code=status.HTTP_303_SEE_OTHER)

    vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()

    return templates.TemplateResponse("dashcams/form.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "dashcams",
        "dashcam": dashcam,
        "vehicle_units": vehicle_units,
        "error": None
    })

@router.post("/dashcams/{dashcam_id}/edit")
async def dashcam_edit_submit(
    dashcam_id: int,
    request: Request,
    serial_number: str = Form(...),
    brand: str = Form("Hikvision"),
    unit_id: str = Form(None),
    sim_provider: str = Form("Telkomsel"),
    power_status: str = Form("Baik"),
    gps_status: str = Form("Baik"),
    camera_status: str = Form("Aktif"),
    has_front_camera: bool = Form(False),
    has_cabin_camera: bool = Form(False),
    has_fatigue_camera: bool = Form(False),
    notes: str = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)
    dashcam = db.query(Dashcam).filter(Dashcam.id == dashcam_id).first()
    if not dashcam:
        return RedirectResponse(url="/taurus-py/dashcams", status_code=status.HTTP_303_SEE_OTHER)

    if photo and photo.filename:
        filename = f"dashcam_{int(datetime.utcnow().timestamp())}_{photo.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        dashcam.photo_url = f"/uploads/{filename}"

    unit_obj = None
    if unit_id:
        unit_obj = db.query(VehicleUnit).filter(VehicleUnit.unit_number == unit_id).first()

    dashcam.serial_number = serial_number.strip()
    dashcam.brand = brand.strip() if brand else "Hikvision"
    dashcam.current_unit_id = unit_obj.id if unit_obj else None
    dashcam.current_unit_number = unit_id if unit_id else None
    dashcam.internet_provider = sim_provider.strip() if sim_provider else "Telkomsel"
    dashcam.electrical_condition = power_status
    dashcam.gps_condition = gps_status
    dashcam.camera_status = camera_status
    dashcam.has_front_camera = has_front_camera
    dashcam.has_cabin_camera = has_cabin_camera
    dashcam.has_fatigue_camera = has_fatigue_camera
    dashcam.notes = notes.strip() if notes else None

    db.commit()
    return RedirectResponse(url="/taurus-py/dashcams", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/dashcams/move", response_class=HTMLResponse)
async def dashcam_move_view(request: Request, dashcam_id: int = None, db: Session = Depends(get_db)):
    current_user = require_staff(request, db)
    settings = get_app_settings(db)

    dashcams = db.query(Dashcam).order_by(Dashcam.serial_number).all()
    vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()

    return templates.TemplateResponse("dashcams/move.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "dashcams",
        "dashcams": dashcams,
        "vehicle_units": vehicle_units,
        "selected_dashcam_id": dashcam_id,
        "error": None
    })

@router.post("/dashcams/move")
async def dashcam_move_submit(
    request: Request,
    dashcam_id: int = Form(...),
    to_unit_id: str = Form(None),
    notes: str = Form(...),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)
    dashcam = db.query(Dashcam).filter(Dashcam.id == dashcam_id).first()
    if not dashcam:
        return RedirectResponse(url="/taurus-py/dashcams", status_code=status.HTTP_303_SEE_OTHER)

    unit_obj = None
    if to_unit_id:
        unit_obj = db.query(VehicleUnit).filter(VehicleUnit.unit_number == to_unit_id).first()

    movement = DashcamMovement(
        dashcam_id=dashcam.id,
        serial_number=dashcam.serial_number,
        from_unit_id=dashcam.current_unit_id,
        from_unit_number=dashcam.current_unit_number,
        to_unit_id=unit_obj.id if unit_obj else None,
        to_unit_number=to_unit_id if to_unit_id else None,
        action_type="PINDAH",
        moved_at=datetime.utcnow(),
        performed_by=current_user.name or current_user.username,
        notes=notes.strip()
    )
    db.add(movement)

    dashcam.current_unit_id = unit_obj.id if unit_obj else None
    dashcam.current_unit_number = to_unit_id if to_unit_id else None
    db.commit()

    return RedirectResponse(url="/taurus-py/dashcams", status_code=status.HTTP_303_SEE_OTHER)


@router.get("/dashcams/brands", response_class=HTMLResponse)
async def dashcam_brands_view(request: Request, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)
    brands = db.query(DashcamBrand).order_by(DashcamBrand.name).all()

    return templates.TemplateResponse("dashcams/brands.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "dashcams",
        "brands": brands
    })


@router.post("/dashcams/brands")
async def dashcam_brands_submit(
    request: Request,
    name: str = Form(...),
    description: str = Form(None),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)
    existing = db.query(DashcamBrand).filter(DashcamBrand.name == name.strip()).first()
    if not existing:
        brand = DashcamBrand(name=name.strip(), description=description.strip() if description else None)
        db.add(brand)
        db.commit()
    return RedirectResponse(url="/taurus-py/dashcams/brands", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/dashcams/brands/{brand_id}/delete")
async def dashcam_brands_delete(brand_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = require_staff(request, db)
    brand = db.query(DashcamBrand).filter(DashcamBrand.id == brand_id).first()
    if brand:
        db.delete(brand)
        db.commit()
    return RedirectResponse(url="/taurus-py/dashcams/brands", status_code=status.HTTP_303_SEE_OTHER)

