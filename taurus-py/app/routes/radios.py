from fastapi import APIRouter, Depends, Request, Form, UploadFile, File, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import os
import shutil
from app.database import get_db
from app.models import Radio, RadioMovement, VehicleUnit, get_app_settings
from app.auth import require_user, require_staff
from app.config import UPLOAD_DIR

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/radios", response_class=HTMLResponse)
async def radio_list(request: Request, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    radios = db.query(Radio).order_by(desc(Radio.updated_at)).all()

    return templates.TemplateResponse("radios/list.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "radios",
        "radios": radios
    })

@router.get("/radios/create", response_class=HTMLResponse)
async def radio_create_view(request: Request, db: Session = Depends(get_db)):
    current_user = require_staff(request, db)
    settings = get_app_settings(db)

    vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()

    return templates.TemplateResponse("radios/form.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "radios",
        "radio": None,
        "vehicle_units": vehicle_units,
        "error": None
    })

@router.post("/radios/create")
async def radio_create_submit(
    request: Request,
    serial_number: str = Form(...),
    brand: str = Form("Motorola"),
    model: str = Form(None),
    frequency: str = Form(None),
    unit_id: str = Form(None),
    status_val: str = Form("Standby", alias="status"),
    notes: str = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)

    existing = db.query(Radio).filter(Radio.serial_number == serial_number.strip()).first()
    if existing:
        settings = get_app_settings(db)
        vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()
        return templates.TemplateResponse("radios/form.html", {
            "request": request,
            "current_user": current_user,
            "app_name": settings["app_name"],
            "app_tagline": settings["app_tagline"],
            "app_logo_url": settings["app_logo_url"],
            "active_page": "radios",
            "radio": None,
            "vehicle_units": vehicle_units,
            "error": f"Nomor Serial '{serial_number.strip()}' sudah terdaftar!"
        }, status_code=400)

    photo_url = None
    if photo and photo.filename:
        filename = f"radio_{int(datetime.utcnow().timestamp())}_{photo.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        photo_url = f"/uploads/{filename}"

    unit_obj = None
    if unit_id:
        unit_obj = db.query(VehicleUnit).filter(VehicleUnit.unit_number == unit_id).first()

    radio = Radio(
        serial_number=serial_number.strip(),
        brand=brand.strip() if brand else "Motorola",
        model_type=model.strip() if model else None,
        status=status_val,
        current_unit_id=unit_obj.id if unit_obj else None,
        current_unit_number=unit_id if unit_id else None,
        notes=notes.strip() if notes else None,
        photo_url=photo_url
    )
    db.add(radio)
    db.commit()

    return RedirectResponse(url="/taurus-py/radios", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/radios/{radio_id}/edit", response_class=HTMLResponse)
async def radio_edit_view(radio_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = require_staff(request, db)
    settings = get_app_settings(db)

    radio = db.query(Radio).filter(Radio.id == radio_id).first()
    if not radio:
        return RedirectResponse(url="/taurus-py/radios", status_code=status.HTTP_303_SEE_OTHER)

    vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()

    return templates.TemplateResponse("radios/form.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "radios",
        "radio": radio,
        "vehicle_units": vehicle_units,
        "error": None
    })

@router.post("/radios/{radio_id}/edit")
async def radio_edit_submit(
    radio_id: int,
    request: Request,
    serial_number: str = Form(...),
    brand: str = Form("Motorola"),
    model: str = Form(None),
    frequency: str = Form(None),
    unit_id: str = Form(None),
    status_val: str = Form("Standby", alias="status"),
    notes: str = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)
    radio = db.query(Radio).filter(Radio.id == radio_id).first()
    if not radio:
        return RedirectResponse(url="/taurus-py/radios", status_code=status.HTTP_303_SEE_OTHER)

    if photo and photo.filename:
        filename = f"radio_{int(datetime.utcnow().timestamp())}_{photo.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        radio.photo_url = f"/uploads/{filename}"

    unit_obj = None
    if unit_id:
        unit_obj = db.query(VehicleUnit).filter(VehicleUnit.unit_number == unit_id).first()

    radio.serial_number = serial_number.strip()
    radio.brand = brand.strip() if brand else "Motorola"
    radio.model_type = model.strip() if model else None
    radio.status = status_val
    radio.current_unit_id = unit_obj.id if unit_obj else None
    radio.current_unit_number = unit_id if unit_id else None
    radio.notes = notes.strip() if notes else None

    db.commit()
    return RedirectResponse(url="/taurus-py/radios", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/radios/move", response_class=HTMLResponse)
async def radio_move_view(request: Request, radio_id: int = None, db: Session = Depends(get_db)):
    current_user = require_staff(request, db)
    settings = get_app_settings(db)

    radios = db.query(Radio).order_by(Radio.serial_number).all()
    vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()

    return templates.TemplateResponse("radios/move.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "radios",
        "radios": radios,
        "vehicle_units": vehicle_units,
        "selected_radio_id": radio_id,
        "error": None
    })

@router.post("/radios/move")
async def radio_move_submit(
    request: Request,
    radio_id: int = Form(...),
    to_unit_id: str = Form(None),
    notes: str = Form(...),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)
    radio = db.query(Radio).filter(Radio.id == radio_id).first()
    if not radio:
        return RedirectResponse(url="/taurus-py/radios", status_code=status.HTTP_303_SEE_OTHER)

    unit_obj = None
    if to_unit_id:
        unit_obj = db.query(VehicleUnit).filter(VehicleUnit.unit_number == to_unit_id).first()

    movement = RadioMovement(
        radio_id=radio.id,
        serial_number=radio.serial_number,
        from_unit_id=radio.current_unit_id,
        from_unit_number=radio.current_unit_number,
        to_unit_id=unit_obj.id if unit_obj else None,
        to_unit_number=to_unit_id if to_unit_id else None,
        action_type="PINDAH",
        moved_at=datetime.utcnow(),
        performed_by=current_user.name or current_user.username,
        notes=notes.strip()
    )
    db.add(movement)

    radio.current_unit_id = unit_obj.id if unit_obj else None
    radio.current_unit_number = to_unit_id if to_unit_id else None
    db.commit()

    return RedirectResponse(url="/taurus-py/radios", status_code=status.HTTP_303_SEE_OTHER)
