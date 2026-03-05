from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_service import ai_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest): 
    try:
        respuesta_texto = await ai_service.chat(request.message)
        prioridad = await ai_service.classify_priority(request.message)
        categoria = await ai_service.extract_category(request.message)
        
        # 3. Enviamos ambos datos
        return {
            "response": respuesta_texto,
            "priority": prioridad,
            "category": categoria
        }
        
    except Exception as e:
        print(f"Error en el chat: {e}")
        raise HTTPException(status_code=500, detail="Error procesando la IA")