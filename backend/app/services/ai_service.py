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
        print("🔧 Inicializando Cerebro IA (Versión Docker + Prioridad)...")
        
        # 1. CONEXIÓN A DOCKER (Vital para que no falle)
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
            
            system_prompt = (
                "Eres el Asistente Técnico de INNOTREV. Ayuda con soporte Nivel 0. "
                "Si encuentras la etiqueta 'ENLACE_VIDEO:', COPIA Y PEGA el enlace exacto al final. "
                "Usa solo el contexto proporcionado:\n{context}"
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
    
    # 2. DETECTOR DE PRIORIDAD (Nuevo)
    async def classify_priority(self, message: str) -> str:
        msg = message.lower()
        if any(w in msg for w in ["urgente", "fuego", "humo", "servidor", "caído", "producción"]):
            return "ALTA"
        elif any(w in msg for w in ["error", "falla", "no puedo", "internet", "lento"]):
            return "MEDIA"
        return "BAJA"

ai_service = AIService()