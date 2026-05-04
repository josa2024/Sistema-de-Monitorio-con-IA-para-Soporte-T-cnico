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
        # --- 1. CREAR ROLES SI NO EXISTEN ---
        # ¡NUEVO!: Se agregó el rol TECNICO a la lista
        roles_necesarios = ["ADMIN", "VENTAS", "CLIENTE", "TECNICO"]
        
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
        tecnico_role = db.query(Role).filter(Role.nombre == "TECNICO").first()

        # --- 2. CREAR USUARIOS ---
        
        # Usuario Administrador
        admin_user = db.query(User).filter(User.email == "admin@innotrev.com").first()
        if not admin_user:
            admin_user = User(
                nombre="Admin Innotrev",
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

        # Usuario Soporte Técnico (¡NUEVO!)
        soporte_user = db.query(User).filter(User.email == "soporte@innotrev.com").first()
        if not soporte_user:
            soporte_user = User(
                nombre="Soporte Técnico Innotrev",
                email="soporte@innotrev.com",
                password_hash=get_password_hash("soporte123"),
                role_id=tecnico_role.id
            )
            db.add(soporte_user)

        # Usuario Cliente
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
        print("Usuarios y roles creados exitosamente en la base de datos.")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(create_user())