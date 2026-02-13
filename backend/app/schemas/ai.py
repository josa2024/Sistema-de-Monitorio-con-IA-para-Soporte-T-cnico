from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    """Mensaje enviado por el usuario al chatbot."""
    message: str
    context: Optional[Dict[str, Any]] = {}

class ChatResponse(BaseModel):
    """Respuesta generada por la IA."""
    response: str
    suggested_actions: List[str] = []

class AIStats(BaseModel):
    """Estadísticas de fallos para el dashboard de Admin."""
    common_failures: Dict[str, int]
    total_analyzed: int
    last_updated: str