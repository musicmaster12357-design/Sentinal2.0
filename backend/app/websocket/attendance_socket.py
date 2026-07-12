from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Maps session_id to list of active websockets
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.current_attendees: Dict[int, list] = {}

    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        if session_id not in self.current_attendees:
            self.current_attendees[session_id] = []
            
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: int):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast_attendance_update(self, session_id: int, student_data: dict):
        if session_id not in self.current_attendees:
            self.current_attendees[session_id] = []
        # Insert at beginning to match frontend behavior
        self.current_attendees[session_id].insert(0, student_data)
        
        if session_id in self.active_connections:
            message = json.dumps({"type": "attendance_update", "data": student_data})
            for connection in list(self.active_connections[session_id]):
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/ws/attendance/{session_id}")
async def attendance_endpoint(websocket: WebSocket, session_id: int):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WS messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
