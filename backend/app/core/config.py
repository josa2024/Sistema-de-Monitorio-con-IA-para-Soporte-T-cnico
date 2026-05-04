from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Configuraciones de la aplicación, cargadas desde variables de entorno.
    """
    # --- Base de Datos ---
    # URL de conexión para la base de datos (PostgreSQL).
    DATABASE_URL: str

    # --- Configuraciones de Celery & Redis ---
    # Estas son las que causaban el error al no estar declaradas.
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # --- Configuraciones de Seguridad JWT ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 días

    # --- Configuración para pydantic-settings ---
    model_config = SettingsConfigDict(
        env_file=".env",            # Lee un archivo .env si existe
        env_file_encoding="utf-8",
        case_sensitive=True,        # Respeta mayúsculas/minúsculas
        extra="ignore"              # ¡CLAVE! Ignora variables extras en el .env que no estén aquí
    )

# Se crea una única instancia de la configuración para ser usada en toda la app
settings = Settings()
