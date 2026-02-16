from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.ai_service import ai_service
# from app.api import deps  # <--- Seguridad (La comentamos para probar hoy)

router = APIRouter()

# Definimos qué esperamos recibir del Frontend (un mensaje de texto)
class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest): 
    # NOTA: Para activar seguridad después, agregar arriba:
    # ... current_user = Depends(deps.get_current_user)):
    """
    Endpoint público para probar el Chatbot IA.
    """
    try:
        # 1. Llamamos a tu cerebro (ai_service)
        respuesta_texto = await ai_service.chat(request.message)
        
        # 2. Devolvemos la respuesta en formato JSON
        return {"response": respuesta_texto}
        
    except Exception as e:
        print(f"Error en el chat: {e}")
        raise HTTPException(status_code=500, detail="Error procesando la IA")