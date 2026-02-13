from fastapi import APIRouter, Depends
from app.api import deps
from app.schemas.ai import ChatRequest, ChatResponse, AIStats
from app.models.user_models import User
from app.services.ai_service import ai_service

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_user: User = Depends(deps.get_current_user)
) -> ChatResponse:
    """
    Chat con el asistente virtual de soporte técnico.
    """
    response_text = await ai_service.chat(
        message=request.message, 
        user_context={"user_id": current_user.id, "email": current_user.email}
    )
    
    return ChatResponse(
        response=response_text,
        suggested_actions=["Ver manual", "Crear ticket de soporte"]
    )

@router.get("/stats", response_model=AIStats)
async def get_ai_failure_stats(
    current_user: User = Depends(deps.get_current_active_admin)
) -> AIStats:
    """
    Obtiene estadísticas de fallos comunes analizados por la IA.
    Solo accesible para administradores.
    """
    stats = await ai_service.get_stats()
    return stats