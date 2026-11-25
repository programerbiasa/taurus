from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, Time, ForeignKey, Enum
from sqlalchemy.orm import relationship, Session
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    status = Column(String(20), default="approved") # pending, approved, rejected
    role = Column(String(20), default="client")     # admin, it_support, client
    created_at = Column(DateTime, default=datetime.utcnow)

    reported_tickets = relationship("Ticket", foreign_keys="Ticket.reporter_id", back_populates="reporter")
    assigned_tickets = relationship("Ticket", foreign_keys="Ticket.assignee_id", back_populates="assignee")
    jobs = relationship("Job", foreign_keys="Job.user_id", back_populates="technician")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Priority(Base):
    __tablename__ = "priorities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    level = Column(Integer, default=1)
    color = Column(String(20), default="#1976d2")
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class VehicleUnit(Base):
    __tablename__ = "vehicle_units"

    id = Column(Integer, primary_key=True, index=True)
    unit_number = Column(String(50), unique=True, nullable=False, index=True)
    vehicle_brand = Column(String(100), nullable=True)
    unit_type = Column(String(100), nullable=True)
    radio_brand = Column(String(100), nullable=True)
    radio_type = Column(String(100), nullable=True)
    antenna_type = Column(String(100), nullable=True)
    antenna_base = Column(String(100), nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True, default="General")
    unit_number = Column(String(50), nullable=True)
    detail = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False, default="Medium") # Low, Medium, High, Critical
    attachment = Column(String(255), nullable=True)
    sla = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="Open") # Open, InProgress, Resolved, Closed
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_tickets")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tickets")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # teknisi
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    problem_category = Column(String(100), nullable=True)
    unit_number = Column(String(50), nullable=True)
    problem_detail = Column(Text, nullable=True)
    problem_finding = Column(Text, nullable=True)
    action_taken = Column(Text, nullable=True)
    attachment = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="Pending") # Pending, Completed
    work_date = Column(Date, default=datetime.utcnow().date)
    work_day = Column(String(15), default="Senin")
    start_time = Column(Time, default=datetime.utcnow().time)
    end_time = Column(Time, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    technician = relationship("User", foreign_keys=[user_id], back_populates="jobs")
    ticket = relationship("Ticket")


class Radio(Base):
    __tablename__ = "radios"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(100), unique=True, nullable=False, index=True)
    brand = Column(String(100), nullable=False, default="Motorola")
    model_type = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="Standby") # Baik, Standby, Rusak, Perbaikan
    current_unit_id = Column(Integer, nullable=True)
    current_unit_number = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    movements = relationship("RadioMovement", back_populates="radio", cascade="all, delete-orphan", order_by="desc(RadioMovement.moved_at)")


class RadioMovement(Base):
    __tablename__ = "radio_movements"

    id = Column(Integer, primary_key=True, index=True)
    radio_id = Column(Integer, ForeignKey("radios.id"), nullable=False)
    serial_number = Column(String(100), nullable=False)
    from_unit_id = Column(Integer, nullable=True)
    from_unit_number = Column(String(50), nullable=True)
    to_unit_id = Column(Integer, nullable=True)
    to_unit_number = Column(String(50), nullable=True)
    action_type = Column(String(50), nullable=False, default="PINDAH")
    moved_at = Column(DateTime, default=datetime.utcnow)
    performed_by = Column(String(100), nullable=False) # nama teknisi otomatis dari login
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    radio = relationship("Radio", back_populates="movements")


class Dashcam(Base):
    __tablename__ = "dashcams"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(100), unique=True, nullable=False, index=True)
    brand = Column(String(100), nullable=False, default="Hikvision")
    model_type = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="Standby")
    current_unit_id = Column(Integer, nullable=True)
    current_unit_number = Column(String(50), nullable=True)
    sd_card_capacity = Column(String(50), nullable=True)
    internet_provider = Column(String(100), nullable=False, default="Telkomsel")
    sim_card_number = Column(String(50), nullable=True)
    electrical_condition = Column(String(50), nullable=False, default="Baik") # Baik, Rusak
    gps_condition = Column(String(50), nullable=False, default="Baik")        # Baik, Rusak
    camera_status = Column(String(50), nullable=False, default="Aktif")       # Aktif, Tidak Aktif
    has_front_camera = Column(Boolean, nullable=False, default=True)
    has_cabin_camera = Column(Boolean, nullable=False, default=False)
    has_fatigue_camera = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    movements = relationship("DashcamMovement", back_populates="dashcam", cascade="all, delete-orphan", order_by="desc(DashcamMovement.moved_at)")


class DashcamMovement(Base):
    __tablename__ = "dashcam_movements"

    id = Column(Integer, primary_key=True, index=True)
    dashcam_id = Column(Integer, ForeignKey("dashcams.id"), nullable=False)
    serial_number = Column(String(100), nullable=False)
    from_unit_id = Column(Integer, nullable=True)
    from_unit_number = Column(String(50), nullable=True)
    to_unit_id = Column(Integer, nullable=True)
    to_unit_number = Column(String(50), nullable=True)
    action_type = Column(String(50), nullable=False, default="PINDAH")
    moved_at = Column(DateTime, default=datetime.utcnow)
    performed_by = Column(String(100), nullable=False) # nama teknisi otomatis dari login
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dashcam = relationship("Dashcam", back_populates="movements")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_broadcast = Column(Boolean, default=False)
    sender_name = Column(String(100), nullable=False)
    sender_role = Column(String(50), nullable=False, default="client")
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])


class DashcamBrand(Base):
    __tablename__ = "dashcam_brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    vendor_name = Column(String(150), nullable=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(50), unique=True, nullable=False)
    setting_value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_app_settings(db: Session) -> dict:
    rows = db.query(AppSetting).all()
    settings = {
        "app_name": "TAURUS",
        "app_tagline": "IT SUPPORT & RADIO SYSTEM",
        "app_logo_url": None
    }
    for r in rows:
        if r.setting_key in settings:
            settings[r.setting_key] = r.setting_value
    return settings
