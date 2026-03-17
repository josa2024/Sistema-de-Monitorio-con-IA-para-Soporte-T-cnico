import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

class AIService:
    def __init__(self):
        print("🔧 Inicializando Cerebro IA (Versión Docker + Prioridad + Streaming)...")
        
        # 1. CONEXIÓN A DOCKER
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        print(f"📡 Conectando a Ollama en: {ollama_url}")
        
        self.llm = ChatOllama(model="llama3.2", temperature=0.1, base_url=ollama_url)
        
        try:
            self.embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=ollama_url)
        except:
            self.embeddings = OllamaEmbeddings(model="llama3.2", base_url=ollama_url)

        # Carga de conocimientos
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, "soluciones_clientes.txt")

        if os.path.exists(file_path):
            loader = TextLoader(file_path, encoding="utf-8")
            docs = loader.load()
            splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
            vector_db = FAISS.from_documents(splitter.split_documents(docs), self.embeddings)
            retriever = vector_db.as_retriever()
            
            # --- NUEVA PERSONALIDAD DE LA IA ---
            system_prompt = (
                "Eres el Asistente Técnico de INNOTREV (Soporte Nivel 0). "
                "REGLAS ESTRICTAS DE RESPUESTA: "
                "1. Sé extremadamente directo y conciso. Cero rodeos, saludos largos o explicaciones innecesarias. "
                "2. Si hay pasos a seguir, resúmelos en viñetas (bullet points) muy cortas. "
                "3. Si en el contexto encuentras la etiqueta 'ENLACE_VIDEO:', NO expliques el proceso completo paso a paso; "
                "simplemente indícale al usuario que descargue el video instructivo desde Drive para ver la solución y pégale el enlace exacto. "
                "Usa estrictamente la siguiente información de la base de datos para responder:\n{context}"
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", "{input}"),
            ])
            
            chain = create_stuff_documents_chain(self.llm, prompt)
            self.rag_chain = create_retrieval_chain(retriever, chain)
            print("✅ Cerebro IA cargado correctamente.")
        else:
            print(f"❌ ERROR: No se encontró {file_path}")
            self.rag_chain = None

    async def chat(self, message: str) -> str:
        if not self.rag_chain:
            return "Error: El sistema de IA no está disponible."
        response = self.rag_chain.invoke({"input": message})
        return response["answer"]
    
    async def chat_stream(self, message: str):
        if not self.rag_chain:
            yield "Error: El cerebro de IA está desconectado."
            return
            
        try:
            async for chunk in self.rag_chain.astream({"input": message}):
                if "answer" in chunk:
                    yield chunk["answer"]
        except Exception as e:
            print(f"Error en streaming: {e}")
            yield " Ocurrió un error de latencia con el modelo local."
    
    # 2. DETECTOR DE PRIORIDAD
    async def classify_priority(self, message: str) -> str:
        msg = message.lower()
        if any(w in msg for w in ["urgente", "fuego", "humo", "servidor", "caído", "producción"]):
            return "ALTA"
        elif any(w in msg for w in ["error", "falla", "no puedo", "internet", "lento"]):
            return "MEDIA"
        return "BAJA"
    
    # 3. EXTRACTOR DE CATEGORÍAS
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