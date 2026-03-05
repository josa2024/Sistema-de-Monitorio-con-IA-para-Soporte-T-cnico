import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash

# --- CORRECCIÓN DE IMPORTACIONES ---
from app.models.user_models import User
from app.models.roles import Role # Importamos Role de su propio archivo

# --- Configuración de la Base de Datos ---
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def create_user():
    db = SessionLocal()
    try:
        # --- Crear Roles si no existen ---
        admin_role = db.query(Role).filter(Role.nombre == "ADMIN").first()
        if not admin_role:
            admin_role = Role(nombre="ADMIN")
            db.add(admin_role)

        ventas_role = db.query(Role).filter(Role.nombre == "VENTAS").first()
        if not ventas_role:
            ventas_role = Role(nombre="VENTAS")
            db.add(ventas_role)
        
        db.commit()

        # --- Crear Usuario Admin ---
        admin_user = db.query(User).filter(User.email == "admin@innotrev.com").first()
        if not admin_user:
            admin_user = User(
                nombre="Admin User",
                email="admin@innotrev.com",
                password_hash=get_password_hash("admin123"),
                role_id=admin_role.id
            )
            db.add(admin_user)

        # --- Crear Usuario Ventas ---
        ventas_user = db.query(User).filter(User.email == "ventas@innotrev.com").first()
        if not ventas_user:
            ventas_user = User(
                nombre="Ventas User",
                email="ventas@innotrev.com",
                password_hash=get_password_hash("ventas123"),
                role_id=ventas_role.id
            )
            db.add(ventas_user)

        db.commit()
        print("Usuarios y roles creados exitosamente en la base de datos.")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(create_user())
