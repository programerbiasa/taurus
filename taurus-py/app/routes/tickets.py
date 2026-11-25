from fastapi import APIRouter, Depends, Request, Form, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from app.database import get_db
from app.models import Ticket, Category, Priority, VehicleUnit, get_app_settings
from app.auth import require_user

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/tickets", response_class=HTMLResponse)
async def ticket_list(request: Request, status_filter: str = None, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    query = db.query(Ticket)
    if current_user.role == "client":
        query = query.filter(Ticket.reporter_id == current_user.id)

    # Counts
    base_query = db.query(Ticket)
    if current_user.role == "client":
        base_query = base_query.filter(Ticket.reporter_id == current_user.id)

    counts = {
        "all": base_query.count(),
        "open": base_query.filter(Ticket.status == "Open").count(),
        "in_progress": base_query.filter(Ticket.status == "InProgress").count(),
        "resolved": base_query.filter(Ticket.status == "Resolved").count(),
    }

    if status_filter:
        query = query.filter(Ticket.status == status_filter)

    tickets = query.order_by(desc(Ticket.created_at)).all()

    return templates.TemplateResponse("tickets/list.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "tickets",
        "tickets": tickets,
        "counts": counts,
        "selected_status": status_filter
    })

@router.get("/tickets/create", response_class=HTMLResponse)
async def ticket_create_view(request: Request, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    categories = db.query(Category).order_by(Category.name).all()
    priorities = db.query(Priority).order_by(Priority.level).all()
    vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()

    return templates.TemplateResponse("tickets/create.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "ticket_create",
        "categories": categories,
        "priorities": priorities,
        "vehicle_units": vehicle_units,
        "error": None
    })

@router.post("/tickets/create")
async def ticket_create_submit(
    request: Request,
    subject: str = Form(...),
    description: str = Form(...),
    category_id: str = Form("General"),
    priority_id: str = Form("Medium"),
    vehicle_unit_id: str = Form(None),
    db: Session = Depends(get_db)
):
    current_user = require_user(request, db)

    ticket = Ticket(
        subject=subject.strip(),
        detail=description.strip(),
        category=category_id if category_id else "General",
        priority=priority_id if priority_id else "Medium",
        unit_number=vehicle_unit_id if vehicle_unit_id else None,
        reporter_id=current_user.id,
        status="Open"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return RedirectResponse(url=f"/taurus-py/tickets/{ticket.id}", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/tickets/{ticket_id}", response_class=HTMLResponse)
async def ticket_detail(ticket_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return RedirectResponse(url="/taurus-py/tickets", status_code=status.HTTP_303_SEE_OTHER)

    return templates.TemplateResponse("tickets/detail.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "tickets",
        "ticket": ticket
    })

@router.post("/tickets/{ticket_id}/status")
async def ticket_update_status(ticket_id: int, request: Request, status_val: str = Form(..., alias="status"), db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket:
        ticket.status = status_val
        ticket.updated_at = datetime.utcnow()
        db.commit()

    return RedirectResponse(url=f"/taurus-py/tickets/{ticket_id}", status_code=status.HTTP_303_SEE_OTHER)
