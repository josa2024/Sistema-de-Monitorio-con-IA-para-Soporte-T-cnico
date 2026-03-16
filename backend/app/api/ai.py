import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.ai_service import ai_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest): 
    try:
        # 1. Calculamos la prioridad y categoría en milisegundos primero
        prioridad = await ai_service.classify_priority(request.message)
        categoria = await ai_service.extract_category(request.message)
        
        # 2. Función generadora para enviar los datos en vivo (Server-Sent Events)
        async def generate():
            # A) Mandamos la metadata oculta primero (Para los colores del ticket)
            meta = {"type": "metadata", "priority": prioridad, "category": categoria}
            yield f"data: {json.dumps(meta)}\n\n"
            
            # B) Empezamos a inyectar palabra por palabra
            async for chunk in ai_service.chat_stream(request.message):
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            
            # C) Avisamos que terminamos
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
        
    except Exception as e:
        print(f"Error en el chat: {e}")
        raise HTTPException(status_code=500, detail="Error procesando la IA")