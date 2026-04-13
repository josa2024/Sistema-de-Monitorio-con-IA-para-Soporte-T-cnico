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

    def get_role_by_name(self, db: Session, role_name: str) -> Optional[Role]:
        """Busca el objeto Role por su nombre string."""
        return db.query(Role).filter(Role.nombre == role_name).first()

    def get_all_users(self, db: Session) -> List[User]:
        return db.query(User).all()

    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def create_user(self, db: Session, user_in: UserCreate) -> User:
        """Crea un usuario (usado por ADMIN) traduciendo el nombre del rol a ID."""
        # Buscamos el rol solicitado o asignamos CLIENTE por defecto
        role_name = user_in.role_id if user_in.role_id else RoleEnum.CLIENTE
        role = self.get_role_by_name(db, role_name)

        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"El rol '{role_name}' no existe en el sistema."
            )

        db_user = User(
            email=user_in.email,
            nombre=user_in.nombre,
            password_hash=get_password_hash(user_in.password),
            role_id=role.id,
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

        # Manejo de contraseña
        if "password" in update_data and update_data["password"]:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))

        # Manejo de rol (traducción de nombre a ID)
        if "role_id" in update_data and update_data["role_id"]:
            role = self.get_role_by_name(db, update_data["role_id"])
            if not role:
                 raise HTTPException(status_code=400, detail="Rol inválido")
            update_data["role_id"] = role.id

        for field, value in update_data.items():
            setattr(db_user, field, value)

        db.commit()
        db.refresh(db_user)
        return db_user

    def disable_user(self, db: Session, user_id: int) -> Optional[User]:
        db_user = self.get_user_by_id(db, user_id)
        if not db_user: return None
        db_user.is_active = False
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def authenticate(self, db: Session, email: str, password: str) -> Optional[User]:
        user = self.get_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            return None
        return user

    def register_client(self, db: Session, client_in: ClientRegister) -> User:
        if self.get_by_email(db, client_in.email):
            raise HTTPException(status_code=400, detail="Email ya registrado.")
        
        role = self.get_role_by_name(db, RoleEnum.CLIENTE)
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

user_service = UserService()