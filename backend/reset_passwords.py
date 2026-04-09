from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user_models import User

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_all():
    db = SessionLocal()
    try:
        usuarios = db.query(User).all()
        for u in usuarios:
            # Toma la primera parte del correo (ej. de "ventas@innotrev.com" saca "ventas")
            prefijo = u.email.split('@')[0] 
            nueva_pass = f"{prefijo}123"
            
            u.password_hash = get_password_hash(nueva_pass)
            print(f"✅ Contraseña reseteada para {u.email} -> {nueva_pass}")
            
        db.commit()
        print("¡Todas las contraseñas han sido forzadas y actualizadas!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_all()