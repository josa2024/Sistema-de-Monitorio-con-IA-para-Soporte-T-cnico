from typing import Dict, Any
from app.schemas.ai import AIStats

class AIService:
    async def chat(self, message: str, user_context: Dict[str, Any]) -> str:
        # Aquí iría la integración real con OpenAI/LangChain
        return f"Hola, entiendo que tienes un problema con: '{message}'. ¿Podrías darme más detalles?"

    async def get_stats(self) -> AIStats:
        # Simulación de estadísticas analizadas
        return AIStats(
            common_failures={"pantalla_azul": 15, "bateria_no_carga": 8, "disco_lento": 5},
            total_analyzed=28,
            last_updated="2023-10-27 14:30:00"
        )

ai_service = AIService()