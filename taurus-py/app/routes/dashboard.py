from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import Ticket, Job, Radio, Dashcam, get_app_settings
from app.auth import require_user

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/", response_class=HTMLResponse)
async def dashboard_view(request: Request, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    # KPI Metrics
    if current_user.role == "client":
        total_tickets = db.query(Ticket).filter(Ticket.reporter_id == current_user.id).count()
        open_tickets = db.query(Ticket).filter(Ticket.reporter_id == current_user.id, Ticket.status.in_(["Open", "InProgress"])).count()
        recent_tickets = db.query(Ticket).filter(Ticket.reporter_id == current_user.id).order_by(desc(Ticket.created_at)).limit(5).all()
    else:
        total_tickets = db.query(Ticket).count()
        open_tickets = db.query(Ticket).filter(Ticket.status.in_(["Open", "InProgress"])).count()
        recent_tickets = db.query(Ticket).order_by(desc(Ticket.created_at)).limit(5).all()

    total_jobs = db.query(Job).count()
    completed_jobs = db.query(Job).filter(Job.status == "Completed").count()
    recent_jobs = db.query(Job).order_by(desc(Job.created_at)).limit(5).all()

    total_radios = db.query(Radio).count()
    active_radios = db.query(Radio).filter(Radio.current_unit_number.isnot(None), Radio.current_unit_number != "").count()

    total_dashcams = db.query(Dashcam).count()
    active_dashcams = db.query(Dashcam).filter(Dashcam.current_unit_number.isnot(None), Dashcam.current_unit_number != "").count()

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "dashboard",
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "total_radios": total_radios,
        "active_radios": active_radios,
        "total_dashcams": total_dashcams,
        "active_dashcams": active_dashcams,
        "recent_tickets": recent_tickets,
        "recent_jobs": recent_jobs,
    })
