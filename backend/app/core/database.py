from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Creación del motor de base de datos
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# 2. Configuración de la sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Declaración de la base para los modelos (¡Aquí es donde nace Base!)
Base = declarative_base()

# 4. Dependencia para obtener una sesión de base de datos en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()