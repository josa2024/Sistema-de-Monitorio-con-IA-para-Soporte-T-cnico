import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Obtener URL de la DB desde el .env o usar valor por defecto de Docker
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://innotrev_user:innotrev_password@db:5432/innotrev_db")

engine = create_engine(DATABASE_URL)

# Es importante usar AUTOCOMMIT porque PostgreSQL no permite modificar ENUMs dentro de una transacción
with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
    try:
        print("⏳ Actualizando ENUMs en la base de datos...")
        connection.execute(text("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'MANTENIMIENTO'"))
        connection.execute(text("ALTER TYPE statusequipo ADD VALUE IF NOT EXISTS 'MANTENIMIENTO'"))
        print("✅ Valores 'MANTENIMIENTO' agregados exitosamente.")
    except Exception as e:
        print(f"❌ Ocurrió un error: {e}")