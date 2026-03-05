from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user_models import User
from app.models.roles import Role
from app.schemas.user import ClientRegister
from app.core.security import get_password_hash, verify_password

class UserService:
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Busca un usuario por su correo electrónico."""
        return db.query(User).filter(User.email == email).first()

    def authenticate(self, db: Session, email: str, password: str) -> Optional[User]:
        """
        Verifica las credenciales del usuario.
        Retorna el usuario si es válido, o None si falla.
        """
        user = self.get_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def register_client(self, db: Session, client_in: ClientRegister) -> User:
        """
        HU-01: Registra un nuevo cliente en el sistema.
        Verifica duplicados y asigna el rol de CLIENTE automáticamente.
        """
        # 1. Verificar si el email ya existe
        if self.get_by_email(db, client_in.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado en el sistema."
            )

        # 2. Obtener el rol de CLIENTE
        # Asumimos que los roles básicos se crean con las migraciones o script de inicio
        role = db.query(Role).filter(Role.nombre == "CLIENTE").first()
        if not role:
            # Fallback de seguridad: crear el rol si no existe (opcional)
            role = Role(nombre="CLIENTE")
            db.add(role)
            db.commit()
            db.refresh(role)

        # 3. Crear el usuario con contraseña hasheada
        db_user = User(
            email=client_in.email,
            nombre=client_in.nombre,
            password_hash=get_password_hash(client_in.password),
            role_id=role.id,
            is_active=True
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
