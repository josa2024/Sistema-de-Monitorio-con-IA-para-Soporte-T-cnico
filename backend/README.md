# Backend del Sistema de Soporte Innotrev

Este proyecto contiene el backend para el sistema de monitoreo y soporte técnico de Innotrev. Está desarrollado con Python, FastAPI, SQLAlchemy y PostgreSQL.

## Arquitectura

El backend sigue un diseño de **Monolito Modular con Arquitectura en Capas**:

-   **`app/core`**: Configuración central, seguridad y gestión de la sesión de BD.
-   **`app/models`**: Modelos de datos (ORM de SQLAlchemy).
-   **`app/schemas`**: Esquemas de validación y serialización (Pydantic).
-   **`app/repositories`**: Capa de acceso a datos (CRUD).
-   **`app/services`**: Capa de lógica de negocio.
-   **`app/api/endpoints`**: Capa de presentación (endpoints HTTP).

## Requisitos Previos

-   Python 3.11 o superior.
-   Docker y Docker Compose (recomendado para un despliegue sencillo).
-   Un servidor PostgreSQL en ejecución (si no se usa Docker).

## Configuración y Puesta en Marcha

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del directorio `backend/`. Este archivo no debe ser versionado en Git.

```env
# URL de conexión a tu base de datos PostgreSQL
DATABASE_URL=postgresql+psycopg2://usuario:contraseña@host:puerto/nombre_db

# Clave secreta para firmar los tokens JWT
SECRET_KEY=tu_clave_secreta_aqui

# Algoritmo de firma para JWT
ALGORITHM=HS256

# Duración del token de acceso en minutos
ACCESS_TOKEN_EXPIRE_MINUTES=43200
```

> **Tip**: Puedes generar una `SECRET_KEY` segura con el comando:
> `python -c "import secrets; print(secrets.token_hex(32))"`

### 2. Instalación de Dependencias

```bash
pip install -r requirements.txt
```

### 3. Migraciones de la Base de Datos

Con la base de datos accesible y el archivo `.env` configurado, ejecuta las migraciones para crear las tablas:

```bash
alembic upgrade head
```

### 4. Creación de Usuarios Iniciales

El proyecto incluye un script para crear roles y usuarios de prueba (ADMIN, CLIENTE, etc.).

```bash
python create_user.py
```

### 5. Ejecución del Servidor

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en `http://localhost:8000` y la documentación interactiva (Swagger UI) en `http://localhost:8000/docs`.

---

## Ejecución con Docker (Recomendado)

El proyecto está configurado para ejecutarse fácilmente con Docker Compose.

1.  Asegúrate de tener el archivo `.env` configurado como se describió anteriormente.
2.  Desde la raíz del proyecto (`innotrev-sistema/`), levanta los servicios:

```bash
docker-compose up --build
```

Esto construirá la imagen del backend, levantará un servicio de PostgreSQL y ejecutará las migraciones y la aplicación automáticamente.
