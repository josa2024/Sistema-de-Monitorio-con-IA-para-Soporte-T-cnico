import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.services.ai_service import ai_service
from app.api import deps
from app.models.user_models import User

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

# Truco para hacer que la autenticación sea opcional en el chat
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login/access-token", auto_error=False)

def get_optional_user(db: Session = Depends(deps.get_db), token: str = Depends(oauth2_scheme_optional)):
    if token:
        try:
            return deps.get_current_user(db, token)
        except:
            return None
    return None

@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_optional_user) # Saber quién escribe
): 
    try:
        # 1. Calculamos la prioridad y categoría
        prioridad = await ai_service.classify_priority(request.message)
        categoria = await ai_service.extract_category(request.message)
        
        # 2. BÚSQUEDA DE CONTEXTO REAL EN BASE DE DATOS
        user_context = "Cliente no autenticado (Invitado web)."
        if current_user:
            user_context = ai_service.get_user_context(db, current_user.id)
            print(f"🧠 Contexto inyectado a IA para: {current_user.nombre}")
        
        # 3. Función generadora (Server-Sent Events)
        async def generate():
            meta = {"type": "metadata", "priority": prioridad, "category": categoria}
            yield f"data: {json.dumps(meta)}\n\n"
            
            # Pasamos el contexto de Postgres directamente al cerebro de LangChain
            async for chunk in ai_service.chat_stream(request.message, user_context):
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
        
    except Exception as e:
        print(f"Error en el chat: {e}")
        raise HTTPException(status_code=500, detail="Error procesando la IA")