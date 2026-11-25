from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
from app.database import get_db, SessionLocal
from app.models import ChatMessage, User, get_app_settings
from app.auth import require_user

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

class SendMessageSchema(BaseModel):
    message: str
    is_broadcast: bool = False
    target_user_id: Optional[int] = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast_chat(self, msg_payload: dict, target_user_id: Optional[int] = None, is_broadcast: bool = False):
        data = json.dumps({"type": "chat", "payload": msg_payload})
        if is_broadcast:
            for uid, connections in list(self.active_connections.items()):
                for conn in list(connections):
                    try:
                        await conn.send_text(data)
                    except Exception:
                        pass
        else:
            recipients = [msg_payload["user_id"]]
            if target_user_id:
                recipients.append(target_user_id)
            for uid in set(recipients):
                if uid in self.active_connections:
                    for conn in list(self.active_connections[uid]):
                        try:
                            await conn.send_text(data)
                        except Exception:
                            pass

manager = ConnectionManager()

@router.get("/chat", response_class=HTMLResponse)
async def chat_view(
    request: Request,
    channel: str = "broadcast",
    target_user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    current_user = require_user(request, db)
    settings = get_app_settings(db)

    members = db.query(User).filter(User.id != current_user.id, User.status == "approved").order_by(User.name).all()

    active_target_user = None
    messages = []

    if target_user_id:
        channel = "direct"
        active_target_user = db.query(User).filter(User.id == target_user_id).first()
        if active_target_user:
            messages = db.query(ChatMessage).filter(
                ChatMessage.is_broadcast == False,
                or_(
                    and_(ChatMessage.user_id == current_user.id, ChatMessage.target_user_id == active_target_user.id),
                    and_(ChatMessage.user_id == active_target_user.id, ChatMessage.target_user_id == current_user.id)
                )
            ).order_by(ChatMessage.created_at).all()
    else:
        channel = "broadcast"
        messages = db.query(ChatMessage).filter(
            ChatMessage.is_broadcast == True
        ).order_by(ChatMessage.created_at).all()

    return templates.TemplateResponse("chat/index.html", {
        "request": request,
        "current_user": current_user,
        "app_name": settings["app_name"],
        "app_tagline": settings["app_tagline"],
        "app_logo_url": settings["app_logo_url"],
        "active_page": "chat",
        "members": members,
        "active_channel": channel,
        "active_target_user": active_target_user,
        "messages": messages
    })

@router.post("/api/chat/send")
async def send_chat_message(
    payload: SendMessageSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = require_user(request, db)
    text = payload.message.strip()
    if not text:
        return JSONResponse(status_code=400, content={"message": "Pesan tidak boleh kosong"})

    target_user = None
    if not payload.is_broadcast:
        if not payload.target_user_id:
            return JSONResponse(status_code=400, content={"message": "Target penerima wajib dipilih"})
        target_user = db.query(User).filter(User.id == payload.target_user_id).first()
        if not target_user:
            return JSONResponse(status_code=404, content={"message": "Penerima tidak ditemukan"})

    new_msg = ChatMessage(
        user_id=current_user.id,
        target_user_id=payload.target_user_id if not payload.is_broadcast else None,
        is_broadcast=payload.is_broadcast,
        sender_name=current_user.name or current_user.username,
        sender_role=current_user.role,
        message=text,
        created_at=datetime.utcnow()
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    msg_dict = {
        "id": new_msg.id,
        "user_id": new_msg.user_id,
        "target_user_id": new_msg.target_user_id,
        "is_broadcast": new_msg.is_broadcast,
        "sender_name": new_msg.sender_name,
        "sender_role": new_msg.sender_role,
        "message": new_msg.message,
        "created_at": new_msg.created_at.strftime("%H:%M")
    }
    await manager.broadcast_chat(msg_dict, target_user_id=new_msg.target_user_id, is_broadcast=new_msg.is_broadcast)

    return msg_dict

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
