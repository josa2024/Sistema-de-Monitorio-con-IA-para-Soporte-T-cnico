# Sistema de Soporte y Monitoreo - Innotrev

Bienvenido al repositorio principal del **Sistema de Soporte Innotrev**. Esta plataforma integral proporciona una solución completa para la gestión de tickets de soporte técnico, monitoreo de métricas operativas (KPIs), asistencia en tiempo real y resoluciones automatizadas impulsadas por Inteligencia Artificial.

El proyecto está estructurado como un **Monorepo**, dividiendo claramente las responsabilidades entre el cliente (Frontend) y el servidor (Backend), orquestados en conjunto mediante contenedores.

## 🏗️ Arquitectura General y Stack Tecnológico

El ecosistema se compone de los siguientes microservicios principales:

1.  **Frontend (Aplicación Cliente)**
    *   **Stack:** React 18, Tailwind CSS, React Router v7, Recharts, Framer Motion.
    *   **Propósito:** Interfaz de usuario SPA para el dashboard administrativo, gestión de tickets y visualización de guías de soporte.
    *   [📖 Leer Documentación del Frontend](./frontend/README.md)

2.  **Backend (API Core e IA)**
    *   **Stack:** Python 3.13, FastAPI, SQLAlchemy, WebSockets, LangChain, FAISS.
    *   **Propósito:** Lógica de negocio, autenticación JWT, conexión a base de datos, servicio de tiempo real (WebSockets) y motor RAG para asistencia con IA.
    *   [📖 Leer Documentación del Backend](./backend/README.md)

3.  **Procesamiento Asíncrono (Workers)**
    *   **Stack:** Celery, Redis.
    *   **Propósito:** Ejecución de tareas pesadas en segundo plano y trabajos programados (CRON) sin bloquear la API principal.

4.  **Persistencia de Datos**
    *   **Stack:** PostgreSQL 15, Volúmenes Docker (`uploads/`).
    *   **Propósito:** Almacenamiento seguro de usuarios, tickets, equipos, licencias y archivos estáticos.

## 🚀 Inicio Rápido con Docker (Recomendado)

La forma más sencilla y robusta de levantar todo el ecosistema de Innotrev es utilizando **Docker** y **Docker Compose**. Esto garantiza que las versiones de base de datos, Redis y Node/Python sean exactamente las mismas para todo el equipo.

### Requisitos Previos
*   Docker Desktop instalado y en ejecución.
*   Git.

### Paso 1: Configurar Variables de Entorno

Antes de iniciar, debes definir las variables de entorno para cada entorno.

1. **Backend:** Navega a la carpeta `backend/`, copia el archivo `.env.example` a un nuevo archivo `.env` y ajusta las claves si es necesario (ej. `SECRET_KEY`, conexión a base de datos).
2. **Frontend:** Navega a la carpeta `frontend/`, crea un archivo `.env` y define la URL de la API:
   ```env
   REACT_APP_API_URL=http://localhost:8000/api/v1
   ```

### Paso 2: Levantar la Infraestructura

Abre tu terminal en esta ruta raíz (`innotrev-sistema/`) donde se encuentra el archivo `docker-compose.yml` y ejecuta:

```bash
docker-compose up --build
```

Este comando descargará las imágenes base, compilará el código y levantará en orden:
- `db` (PostgreSQL)
- `redis` (Broker de mensajes)
- `backend` (FastAPI)
- `celery_worker` (Procesador de tareas)
- `celery_beat` (Planificador)
- `frontend` (React SPA)

### Paso 3: Acceder al Sistema

Una vez que los contenedores reporten estar "Healthy" o en ejecución, podrás acceder a:

*   🌐 **Aplicación Web (Frontend):** http://localhost:3000
*   ⚙️ **API REST (Backend):** http://localhost:8000
*   📚 **Documentación Interactiva de la API (Swagger UI):** http://localhost:8000/docs

---

## 🛠️ Desarrollo Local Individual

Si deseas trabajar en el frontend o backend de forma aislada sin utilizar Docker en tu máquina anfitriona, por favor consulta el `README.md` específico de cada directorio.

¡Bienvenido al equipo Innotrev!