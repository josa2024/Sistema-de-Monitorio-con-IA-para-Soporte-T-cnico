import os
from sqlalchemy.orm import Session
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

class AIService:
    def __init__(self):
        print("🔧 Inicializando Cerebro IA (Versión Contexto Dinámico)...")
        
        # 1. CONEXIÓN A DOCKER (Usamos la ruta que te funcionó)
        ollama_url = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
        print(f"📡 Conectando a Ollama en: {ollama_url}")
        
        self.llm = ChatOllama(model="llama3.2", temperature=0.1, base_url=ollama_url)
        
        try:
            self.embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=ollama_url)
        except:
            self.embeddings = OllamaEmbeddings(model="llama3.2", base_url=ollama_url)

        # Carga de conocimientos (RAG Base)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, "soluciones_clientes.txt")

        if os.path.exists(file_path):
            loader = TextLoader(file_path, encoding="utf-8")
            docs = loader.load()
            splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
            self.vector_db = FAISS.from_documents(splitter.split_documents(docs), self.embeddings)
            retriever = self.vector_db.as_retriever()
            
            # --- NUEVA PERSONALIDAD CON ACCESO A DATOS DINÁMICOS ---
            system_prompt = (
                "Eres el Asistente Técnico de INNOTREV (Soporte Nivel 0). "
                "REGLAS ESTRICTAS DE RESPUESTA: "
                "1. Sé directo, amable pero conciso. Cero rodeos. "
                "2. Si hay pasos a seguir, resúmelos en viñetas. "
                "3. Si encuentras la etiqueta 'ENLACE_VIDEO:' en el conocimiento, indícale que descargue el video y pégale el enlace. "
                "4. Si el cliente pregunta por el estado de sus EQUIPOS, GARANTÍAS o TICKETS, usa OBLIGATORIAMENTE la información de 'DATOS REALES DEL CLIENTE' que está abajo.\n\n"
                "=== DATOS REALES DEL CLIENTE ===\n{user_context}\n=================================\n\n"
                "=== BASE DE CONOCIMIENTOS (Manual) ===\n{context}\n================================="
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", "{input}"),
            ])
            
            chain = create_stuff_documents_chain(self.llm, prompt)
            self.rag_chain = create_retrieval_chain(retriever, chain)
            print("✅ Cerebro IA cargado correctamente con inyección de BD.")
        else:
            print(f"❌ ERROR: No se encontró {file_path}")
            self.rag_chain = None

    # --- NUEVO MÉTODO: BUSCADOR DE CONTEXTO EN BD ---
    def get_user_context(self, db: Session, user_id: int) -> str:
        # Importaciones locales para evitar ciclos
        from app.models.equipment_models import Equipo
        from app.models.ticket import Ticket
        
        equipos = db.query(Equipo).filter(Equipo.cliente_id == user_id).all()
        tickets = db.query(Ticket).filter(Ticket.cliente_id == user_id).all()
        
        if not equipos and not tickets:
            return "El cliente no tiene equipos comprados ni tickets registrados actualmente."
            
        contexto = "EQUIPOS DEL CLIENTE:\n"
        for eq in equipos:
            garantia = "Sin póliza activa"
            if eq.garantias and len(eq.garantias) > 0:
                g = eq.garantias[-1]
                vence = g.fecha_vencimiento.strftime("%Y-%m-%d") if g.fecha_vencimiento else "N/A"
                garantia = f"Póliza vence el {vence} (Folio: {g.folio})"
            contexto += f"- Modelo: {eq.modelo} | Serie: {eq.numero_serie} | Estado: {eq.status.value} | {garantia}\n"
            
        contexto += "\nTICKETS DE SOPORTE DEL CLIENTE:\n"
        for t in tickets:
            contexto += f"- Ticket #{t.id}: {t.titulo} | Estado actual: {t.status.value} | Prioridad: {t.prioridad.value}\n"
            
        return contexto

    async def chat(self, message: str, user_context: str = "Invitado no logueado") -> str:
        if not self.rag_chain:
            return "Error: El sistema de IA no está disponible."
        response = self.rag_chain.invoke({"input": message, "user_context": user_context})
        return response["answer"]
    
    # Agregamos 'user_context' al stream para que LangChain lo inyecte
    async def chat_stream(self, message: str, user_context: str = "Invitado no logueado"):
        if not self.rag_chain:
            yield "Error: El cerebro de IA está desconectado."
            return
            
        try:
            async for chunk in self.rag_chain.astream({"input": message, "user_context": user_context}):
                if "answer" in chunk:
                    yield chunk["answer"]
        except Exception as e:
            print(f"Error en streaming: {e}")
            yield " Ocurrió un error de latencia con el modelo local."
    
    # ... Tus métodos classify_priority y extract_category se quedan exactamente igual ...
    async def classify_priority(self, message: str) -> str:
        msg = message.lower()
        if any(w in msg for w in ["urgente", "fuego", "humo", "servidor", "caído", "producción"]):
            return "ALTA"
        elif any(w in msg for w in ["error", "falla", "no puedo", "internet", "lento"]):
            return "MEDIA"
        return "BAJA"
    
    async def extract_category(self, message: str) -> str:
        msg = message.lower()
        if any(w in msg for w in ["calienta", "fuego", "humo", "temperatura", "ventilador", "sobrecalentamiento", "calor"]):
            return "Sobrecalentamiento"
        elif any(w in msg for w in ["internet", "red", "conexión", "wifi", "lento", "desconectado", "ping", "lag"]):
            return "Fallo de Red"
        elif any(w in msg for w in ["pantalla", "azul", "monitor", "video", "imagen", "parpadea", "resolución"]):
            return "Pantalla / Video"
        elif any(w in msg for w in ["no enciende", "apaga", "batería", "corriente", "cable", "fuente", "energía", "corto"]):
            return "Energía / Encendido"
        elif any(w in msg for w in ["lentitud", "trabado", "congela", "virus", "software", "programa", "app", "crashea"]):
            return "Software / Rendimiento"
        return "General / Otro"

ai_service = AIService()