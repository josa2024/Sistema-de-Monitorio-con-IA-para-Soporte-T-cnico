# Backend del Sistema de Soporte Innotrev

Este proyecto contiene el backend para el sistema de monitoreo y soporte técnico de Innotrev. Ha sido desarrollado con **Python 3.13**, **FastAPI**, **SQLAlchemy** y **PostgreSQL**, e incluye procesamiento de tareas en segundo plano con **Celery** y **Redis**, comunicación en tiempo real vía **WebSockets**, y módulos de Inteligencia Artificial (**LangChain**, **FAISS**, **Ollama**) para asistencia automatizada.

## Arquitectura

El backend sigue un diseño de **Monolito Modular con Arquitectura en Capas**, lo que facilita su mantenimiento y escalabilidad:

-   **`app/core`**: Configuración central (variables de entorno), seguridad (JWT), y la configuración de la app de Celery.
-   **`app/models`**: Modelos de datos (ORM de SQLAlchemy) que definen la estructura de la base de datos.
-   **`app/schemas`**: Esquemas de Pydantic para la validación de datos de entrada/salida de la API.
-   **`app/repositories`**: Capa de Acceso a Datos que abstrae las operaciones CRUD con la base de datos.
-   **`app/services`**: Capa de Lógica de Negocio donde residen las reglas y operaciones complejas, incluyendo lógica de WebSockets y motores RAG de IA (ej. lectura de `soluciones_clientes.txt`).
-   **`app/api/endpoints`**: Capa de Presentación que define los endpoints HTTP de la API.
-   **`app/tasks`**: Tareas de Celery que se ejecutan en segundo plano.
-   **`uploads/`**: Estructura de directorios generada dinámicamente para el almacenamiento de archivos estáticos (licencias, evidencias y tickets).

## Requisitos Previos

-   **Python 3.13** o superior.
-   **Docker y Docker Compose** (método de ejecución recomendado).
-   Un servidor PostgreSQL (solo si no se utiliza Docker).

## 🚀 Ejecución con Docker (Recomendado)

El proyecto está optimizado para un despliegue rápido y consistente en cualquier máquina con Docker.

1.  **Configurar Variables de Entorno**:
    Crea un archivo `.env` en la raíz de `innotrev-sistema/backend/`. Puedes usar el archivo `backend/.env.example` como plantilla.

2.  **Levantar los servicios**:
    Desde la raíz del proyecto (`innotrev-sistema/`), ejecuta el siguiente comando:
    ```bash
    docker-compose up --build
    ```
    Este comando orquestará todos los servicios definidos en `docker-compose.yml`:
    -   `db`: La base de datos PostgreSQL.
    -   `redis`: El broker de mensajes para Celery.
    -   `backend`: La API principal de FastAPI.
    -   `celery_worker`: Un worker que consume y ejecuta tareas asíncronas.
    -   `celery_beat`: Un planificador que emite tareas en intervalos programados (ej. tareas CRON).
    -   `frontend`: La aplicación cliente.

Una vez levantado, la API estará disponible en `http://localhost:8000` y la documentación interactiva (Swagger UI) en `http://localhost:8000/docs`.

## Configuración para Desarrollo Local (Sin Docker)

### 1. Variables de Entorno

Crea un archivo `.env` en `innotrev-sistema/backend/` con el siguiente contenido:

```env
# URL de conexión a tu base de datos PostgreSQL
DATABASE_URL=postgresql+psycopg2://innotrev_user:innotrev_password@localhost:5432/innotrev_db

# Clave secreta para firmar los tokens JWT (¡genera una nueva!)
SECRET_KEY=tu_clave_secreta_aqui_super_segura

# Algoritmo de firma para JWT
ALGORITHM=HS256

# Duración del token de acceso en minutos (ej. 30 días)
ACCESS_TOKEN_EXPIRE_MINUTES=43200

# URL del broker de Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Configuración de IA (Ollama local o remoto)
# OLLAMA_BASE_URL=http://localhost:11434
```
> **Tip**: Genera una `SECRET_KEY` segura con:
> `python -c "import secrets; print(secrets.token_hex(32))"`

### 2. Instalación de Dependencias

Se recomienda crear un entorno virtual primero. El archivo `requirements.txt` ha sido organizado por funcionalidad para mayor claridad.

```bash
# Navega al directorio del backend
cd innotrev-sistema/backend

# Crea y activa un entorno virtual
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate

# Instala las dependencias
pip install -r requirements.txt
```

### 3. Migraciones de la Base de Datos

Con la base de datos accesible y el `.env` configurado, ejecuta las migraciones para crear o actualizar las tablas:

```bash
alembic upgrade head
```

### 4. Creación de Datos Iniciales

El proyecto incluye un script para crear roles y usuarios de prueba.

```bash
python create_user.py
```

### 5. Ejecución del Servidor

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Configuración de Inteligencia Artificial (Ollama Local)

El sistema utiliza Ollama junto con LangChain y FAISS para procesar la asistencia automatizada de forma local. Para que el agente de IA (chatbot RAG) funcione correctamente, sigue estos pasos:

1. **Instalar Ollama:** Descarga e instala el motor de Ollama en tu máquina anfitriona desde su página oficial.
2. **Descargar los modelos base:** Abre tu terminal y ejecuta los siguientes comandos para descargar el modelo de lenguaje principal (llama3.2) y el modelo para búsquedas vectoriales (nomic-embed-text), que son los requeridos por la aplicación:

    ```bash
    ollama run llama3.2
    ollama pull nomic-embed-text

## Dockerfile Optimizado

El `Dockerfile` del backend ha sido actualizado para mejorar la seguridad y la eficiencia:
-   **Build Multi-etapa**: Se usa una etapa para instalar dependencias y otra para la imagen final, reduciendo su tamaño.
-   **Usuario no-root**: La aplicación se ejecuta con un usuario de sistema (`app`) sin privilegios de administrador, una práctica de seguridad esencial.
-   **Cache de dependencias**: Se aprovecha el cache de Docker para acelerar los builds cuando solo cambia el código fuente.
