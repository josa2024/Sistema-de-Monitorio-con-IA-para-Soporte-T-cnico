import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user_models import User, Role

# --- Configuración de la Base de Datos ---
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def create_user():
    db = SessionLocal()
    try:
        # --- 1. CREAR ROLES SI NO EXISTEN ---
        roles_necesarios = ["ADMIN", "VENTAS", "CLIENTE"]
        
        for role_name in roles_necesarios:
            role = db.query(Role).filter(Role.nombre == role_name).first()
            if not role:
                new_role = Role(nombre=role_name)
                db.add(new_role)
        db.commit()

        # Obtenemos los IDs de los roles recién creados o existentes
        admin_role = db.query(Role).filter(Role.nombre == "ADMIN").first()
        ventas_role = db.query(Role).filter(Role.nombre == "VENTAS").first()
        cliente_role = db.query(Role).filter(Role.nombre == "CLIENTE").first()

        # --- 2. CREAR USUARIOS ---
        
        # Usuario Administrador / Técnico
        admin_user = db.query(User).filter(User.email == "admin@innotrev.com").first()
        if not admin_user:
            admin_user = User(
                nombre="Técnico Innotrev",
                email="admin@innotrev.com",
                password_hash=get_password_hash("admin123"),
                role_id=admin_role.id
            )
            db.add(admin_user)

        # Usuario Ventas
        ventas_user = db.query(User).filter(User.email == "ventas@innotrev.com").first()
        if not ventas_user:
            ventas_user = User(
                nombre="Ventas Innotrev",
                email="ventas@innotrev.com",
                password_hash=get_password_hash("ventas123"),
                role_id=ventas_role.id
            )
            db.add(ventas_user)

        # Usuario Cliente (¡NUEVO!)
        cliente_user = db.query(User).filter(User.email == "cliente@alpha.com").first()
        if not cliente_user:
            cliente_user = User(
                nombre="Cliente Alpha S.A.",
                email="cliente@alpha.com",
                password_hash=get_password_hash("cliente123"),
                role_id=cliente_role.id
            )
            db.add(cliente_user)

        db.commit()
        print("✅ Usuarios y roles (Admin, Ventas y Cliente) creados o verificados exitosamente.")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(create_user())