from fastapi import APIRouter, Depends, Request, Form, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, date, time
from app.database import get_db
from app.models import Job, Ticket, VehicleUnit, get_app_settings
from app.auth import require_user, require_staff

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/jobs", response_class=HTMLResponse)
async def job_list(request: Request, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    jobs = db.query(Job).order_by(desc(Job.created_at)).all()

    return templates.TemplateResponse("jobs/list.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "jobs",
        "jobs": jobs
    })

@router.get("/jobs/create", response_class=HTMLResponse)
async def job_create_view(request: Request, db: Session = Depends(get_db)):
    current_user = require_staff(request, db)
    settings = get_app_settings(db)

    vehicle_units = db.query(VehicleUnit).order_by(VehicleUnit.unit_number).all()
    open_tickets = db.query(Ticket).filter(Ticket.status.in_(["Open", "InProgress"])).all()

    return templates.TemplateResponse("jobs/create.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "job_create",
        "vehicle_units": vehicle_units,
        "open_tickets": open_tickets
    })

@router.post("/jobs/create")
async def job_create_submit(
    request: Request,
    problem_category: str = Form(...),
    problem_description: str = Form(...),
    action_taken: str = Form(None),
    vehicle_unit_id: str = Form(None),
    ticket_id: int = Form(None),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)

    now = datetime.utcnow()
    job = Job(
        user_id=current_user.id,
        ticket_id=ticket_id if ticket_id else None,
        problem_category=problem_category.strip(),
        unit_number=vehicle_unit_id if vehicle_unit_id else None,
        problem_detail=problem_description.strip(),
        action_taken=action_taken.strip() if action_taken else None,
        status="Pending",
        work_date=now.date(),
        work_day=now.strftime("%A"),
        start_time=now.time()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    if ticket_id:
        t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if t and t.status == "Open":
            t.status = "InProgress"
            t.assignee_id = current_user.id
            db.commit()

    return RedirectResponse(url=f"/taurus-py/jobs/{job.id}", status_code=status.HTTP_303_SEE_OTHER)

@router.get("/jobs/{job_id}", response_class=HTMLResponse)
async def job_detail(job_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return RedirectResponse(url="/taurus-py/jobs", status_code=status.HTTP_303_SEE_OTHER)

    return templates.TemplateResponse("jobs/detail.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "jobs",
        "job": job
    })

@router.post("/jobs/{job_id}/update")
async def job_update(
    job_id: int,
    request: Request,
    action_taken: str = Form(None),
    status: str = Form(...),
    db: Session = Depends(get_db)
):
    current_user = require_staff(request, db)
    job = db.query(Job).filter(Job.id == job_id).first()
    if job:
        if action_taken:
            job.action_taken = action_taken.strip()
        job.status = status
        if status == "Completed":
            job.end_time = datetime.utcnow().time()
        db.commit()

    return RedirectResponse(url=f"/taurus-py/jobs/{job_id}", status_code=status.HTTP_303_SEE_OTHER)
