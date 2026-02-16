# Backend de Innotrev

Este es el backend para el sistema Innotrev, construido con FastAPI. Incluye gestión de usuarios, roles, equipos, tickets con WebSockets y licencias.

## Ejecutando la aplicación

1.  **Instalar dependencias:**
    ```bash
    pip install -r requirements.txt
    # Parche de compatibilidad para passlib:
    pip install "bcrypt==3.2.2"
    ```

2.  **Configurar la base de datos:**
    - Asegúrate de tener un servidor PostgreSQL en ejecución.
    - Crea una base de datos llamada `innotrev`.
    - Crea un archivo `.env` en este directorio con el siguiente contenido, reemplazando las credenciales con las tuyas:
      ```
      DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/innotrev
      SECRET_KEY=<your_secret_key>
      ALGORITHM=HS256
      ACCESS_TOKEN_EXPIRE_MINUTES=43200
      ```
      Puedes generar una clave secreta usando `python -c "import secrets; print(secrets.token_hex(32))"`.

3.  **Ejecutar migraciones de base de datos:**
    ```bash
    alembic upgrade head
    ```

4.  **Ejecutar la aplicación:**
    ```bash
    uvicorn app.main:app --reload
    ```
    La aplicación estará disponible en `http://127.0.0.1:8000`.

## Creando un usuario con un rol específico

Para probar los endpoints protegidos, necesitas crear un usuario con un rol específico en la base de datos. Puedes hacer esto ejecutando un script de Python.

1.  **Crea un script `create_user.py` en el directorio `backend` con el siguiente contenido:**
    ```python
    import asyncio
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.core.config import settings
    from app.core.security import get_password_hash
    from app.models.user_models import User, Role

    # --- Configuración de Base de Datos ---
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    async def create_user():
        db = SessionLocal()
        try:
            # --- Crear Roles si no existen ---
            admin_role = db.query(Role).filter(Role.nombre == "ADMIN").first()
            if not admin_role:
                admin_role = Role(nombre="ADMIN")
                db.add(admin_role)

            ventas_role = db.query(Role).filter(Role.nombre == "VENTAS").first()
            if not ventas_role:
                ventas_role = Role(nombre="VENTAS")
                db.add(ventas_role)
            
            db.commit()

            # --- Crear Usuario Admin ---
            admin_user = db.query(User).filter(User.email == "admin@innotrev.com").first()
            if not admin_user:
                admin_user = User(
                    nombre="Admin User",
                    email="admin@innotrev.com",
                    password_hash=get_password_hash("admin123"),
                    role_id=admin_role.id
                )
                db.add(admin_user)

            # --- Crear Usuario Ventas ---
            ventas_user = db.query(User).filter(User.email == "ventas@innotrev.com").first()
            if not ventas_user:
                ventas_user = User(
                    nombre="Ventas User",
                    email="ventas@innotrev.com",
                    password_hash=get_password_hash("ventas123"),
                    role_id=ventas_role.id
                )
                db.add(ventas_user)

            db.commit()
            print("Usuarios y roles creados exitosamente.")

        finally:
            db.close()

    if __name__ == "__main__":
        asyncio.run(create_user())

    ```

2.  **Ejecutar el script:**
    ```bash
    python create_user.py
    ```

Esto creará un usuario "ADMIN" con el correo `admin@innotrev.com` y contraseña `admin123`, y un usuario "VENTAS" con el correo `ventas@innotrev.com` y contraseña `ventas123`. Ahora puedes usar estas credenciales para iniciar sesión y acceder a los endpoints protegidos.

## Estado actual del desarrollo (Para Frontend e IA)

El backend expone una API REST documentada automáticamente en `/docs`.

### Módulos listos para integración:
1.  **Autenticación (JWT):** Login y protección de rutas por roles (ADMIN, VENTAS, TECNICO, CLIENTE).
2.  **Equipos:** CRUD completo.
3.  **Tickets de Soporte:**
    -   Creación y asignación.
    -   **WebSockets:** Conectar a `ws://localhost:8000/ws/tickets` para recibir eventos en tiempo real (`NUEVO_TICKET`, `TICKET_ASIGNADO`).
4.  **Licencias:**
    -   Subida de archivos (PDF/Certificados).
    -   Control de vencimientos.

### Pendiente de implementación (IA):
-   El campo `prioridad` en los tickets actualmente se define por defecto. Se espera que el módulo de IA analice la `descripcion_cliente` para actualizar este campo automáticamente.
