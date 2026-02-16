import os
# --- IMPORTS CORREGIDOS PARA LANGCHAIN v1.x (2026) ---
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

# Usamos la librería oficial de Ollama (más estable)
from langchain_ollama import ChatOllama, OllamaEmbeddings

# Aquí está el truco: Usamos langchain_classic para las cadenas
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

from langchain_core.prompts import ChatPromptTemplate

class AIService:
    def __init__(self):
        print("🔧 Inicializando Cerebro IA (Modo LangChain v1.2)...")
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, "soluciones_clientes.txt")
        
        # Configuración optimizada para Llama 3.2
        self.llm = ChatOllama(model="llama3.2", temperature=0.1)
        
        # Embeddings usando la librería dedicada
        try:
            embeddings = OllamaEmbeddings(model="nomic-embed-text")
        except:
            embeddings = OllamaEmbeddings(model="llama3.2")

        if os.path.exists(file_path):
            loader = TextLoader(file_path, encoding="utf-8")
            docs = loader.load()
            splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
            vector_db = FAISS.from_documents(splitter.split_documents(docs), embeddings)
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
            
            # Cadenas construidas con el paquete classic
            chain = create_stuff_documents_chain(self.llm, prompt)
            self.rag_chain = create_retrieval_chain(retriever, chain)
            print("✅ Cerebro IA cargado correctamente.")
        else:
            print(f"❌ ERROR: No se encontró {file_path}")
            self.rag_chain = None

    async def chat(self, message: str, user_context: dict = None) -> str:
        if not self.rag_chain:
            return "Error: El sistema de IA no está disponible (falta base de conocimiento)."
            
        response = self.rag_chain.invoke({"input": message})
        return response["answer"]

    async def get_stats(self):
        return {"model": "Llama 3.2", "status": "Active", "rag_docs_loaded": True}

ai_service = AIService()