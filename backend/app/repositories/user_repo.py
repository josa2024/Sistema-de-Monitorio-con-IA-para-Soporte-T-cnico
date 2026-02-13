from sqlalchemy.orm import Session
from app.models.user_models import User

class UserRepository:
    def get_user_by_email(self, db: Session, email: str) -> User | None:
        """
        Recupera un usuario por su dirección de correo electrónico.

        Args:
            db: La sesión de la base de datos.
            email: El correo electrónico del usuario a recuperar.

        Returns:
            El objeto usuario si se encuentra, de lo contrario None.
        """
        return db.query(User).filter(User.email == email).first()

user_repo = UserRepository()
