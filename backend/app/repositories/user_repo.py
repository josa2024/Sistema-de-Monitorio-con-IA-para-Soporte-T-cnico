from sqlalchemy.orm import Session
from app.models.user_models import User, Role
from app.core.security import get_password_hash

class UserRepository:
    def get_user_by_email(self, db: Session, email: str) -> User | None:
        return db.query(User).filter(User.email == email).first()

    def get_role_by_name(self, db: Session, nombre: str) -> Role | None:
        return db.query(Role).filter(Role.nombre == nombre).first()

    def create_user(self, db: Session, user_data, role_id: int) -> User:
        db_user = User(
            nombre=user_data.nombre,
            apellidos=user_data.apellidos,
            direccion=user_data.direccion,
            telefono=user_data.telefono,
            email=user_data.email,
            password_hash=get_password_hash(user_data.password), # Aquí se encripta la contraseña
            role_id=role_id
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

user_repo = UserRepository()