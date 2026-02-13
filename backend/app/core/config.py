from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Configuraciones de la aplicación, cargadas desde variables de entorno.
    """
    # URL de conexión para la base de datos.
    # Pydantic-settings la buscará automáticamente como una variable de entorno.
    # El valor por defecto es una cadena vacía para forzar que se defina en el entorno.
    DATABASE_URL: str

    # --- Configuraciones de Seguridad JWT ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 días

    # Configuración para pydantic-settings
    model_config = SettingsConfigDict(
        env_file=".env",          # Lee un archivo .env si existe (útil para desarrollo local sin Docker)
        env_file_encoding="utf-8",
        case_sensitive=True       # Asegura que DATABASE_URL se lea tal cual
    )

# Se crea una única instancia de la configuración para ser usada en toda la app
settings = Settings()
