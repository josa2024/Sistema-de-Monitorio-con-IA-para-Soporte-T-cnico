import os
import sys
from logging.config import fileConfig
from dotenv import load_dotenv

# Cargar variables del .env para poder leer DB_HOST
load_dotenv()

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# --- CUSTOM CONFIGURATION START ---
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.core.database import Base
from app.models.ticket import Ticket, ComentarioTicket, TicketLog, TicketAttachment
# --- CUSTOM CONFIGURATION END ---

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# --- CONFIGURACIÓN PRO: RESOLUCIÓN DINÁMICA DEL HOST ---
def get_dynamic_db_url() -> str:
    # Obtenemos la URL que viene de tu app/core/config.py
    url = str(settings.DATABASE_URL)
    
    # Obtenemos el host desde el .env. Si no existe, asume 'db'
    db_host = os.getenv("DB_HOST", "db")
    
    # Si DB_HOST es 'localhost' (como pusimos en el .env) y '@db:' está en la URL, lo reemplazamos
    if db_host != "db" and "@db:" in url:
        url = url.replace("@db:", f"@{db_host}:")
        
    return url
# -------------------------------------------------------

def run_migrations_offline() -> None:
    # Usamos la URL dinámica
    url = get_dynamic_db_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    
    # Usamos la URL dinámica aquí también
    configuration["sqlalchemy.url"] = get_dynamic_db_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()