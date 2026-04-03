from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user_models import User
from app.models.roles import Role, RoleEnum
from app.schemas.user import UserCreate, UserUpdate, ClientRegister
from app.core.security import get_password_hash, verify_password


class UserService:
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def get_role_by_id(self, db: Session, role_id: int) -> Optional[Role]:
        return db.query(Role).filter(Role.id == role_id).first()

    def get_all_users(self, db: Session) -> List[User]:
        return db.query(User).all()

    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def create_user(self, db: Session, user_in: UserCreate) -> User:
        """Crea un usuario general (usado por ADMIN)."""
        if not user_in.role_id:
            # Asignar rol de CLIENTE por defecto si no se especifica
            client_role = db.query(Role).filter(Role.nombre == RoleEnum.CLIENTE).first()
            if not client_role:
                raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Client role not found")
            user_in.role_id = client_role.id

        db_user = User(
            email=user_in.email,
            nombre=user_in.nombre,
            password_hash=get_password_hash(user_in.password),
            role_id=user_in.role_id,
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def update_user(self, db: Session, user_id: int, user_in: UserUpdate) -> Optional[User]:
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None

        update_data = user_in.model_dump(exclude_unset=True)

        if "password" in update_data and update_data["password"]:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))

        for field, value in update_data.items():
            setattr(db_user, field, value)

        db.commit()
        db.refresh(db_user)
        return db_user

    def disable_user(self, db: Session, user_id: int) -> Optional[User]:
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None
        
        db_user.is_active = False
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def authenticate(self, db: Session, email: str, password: str) -> Optional[User]:
        """
        Verifica las credenciales del usuario.
        Retorna el usuario si es válido, o None si falla.
        """
        print(f"DEBUG authenticate: Buscando usuario con email={email}")
        user = self.get_by_email(db, email)
        if not user:
            print(f"DEBUG authenticate: Usuario no encontrado")
            return None
        
        print(f"DEBUG authenticate: Usuario encontrado, verificando contraseña")
        print(f"DEBUG authenticate: user.password_hash={user.password_hash[:20] if user.password_hash else 'None'}...")
        
        if not verify_password(password, user.password_hash):
            print(f"DEBUG authenticate: Contraseña incorrecta")
            return None
        
        print(f"DEBUG authenticate: Autenticación exitosa para {email}")
        return user

    def register_client(self, db: Session, client_in: ClientRegister) -> User:
        """
        HU-01: Registra un nuevo cliente en el sistema.
        Verifica duplicados y asigna el rol de CLIENTE automáticamente.
        """
        if self.get_by_email(db, client_in.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado en el sistema."
            )

        role = db.query(Role).filter(Role.nombre == RoleEnum.CLIENTE).first()
        if not role:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Client role not found")

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

# Creamos una instancia global del servicio para ser usada en los endpoints
user_service = UserService()
