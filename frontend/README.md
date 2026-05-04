# Frontend del Sistema de Soporte Innotrev

Este proyecto contiene la interfaz de usuario (cliente) para el sistema de monitoreo, dashboard y soporte técnico de Innotrev. Ha sido desarrollado como una **Single Page Application (SPA)** utilizando **React 18**, **Tailwind CSS** para el sistema de diseño, **React Router DOM** para la navegación, y **Recharts** para la visualización de métricas y KPIs.

## Arquitectura

El frontend sigue un diseño **Modular Basado en Componentes** con una clara separación de responsabilidades, lo que facilita la escalabilidad y el mantenimiento del código:

-   **`src/services`**: Capa de comunicación con el backend. Aquí reside `api.js`, que funciona como un cliente HTTP centralizado para interceptar peticiones, inyectar el token JWT y manejar errores de sesión (401).
-   **`src/pages` (o `src/views`)**: Componentes contenedores (Smart Components) que representan las rutas principales de la aplicación (ej. `Login`, `Dashboard`, `Tickets`). Orquestan el estado y las llamadas a la API.
-   **`src/components`**: Piezas de UI reutilizables (Dumb Components) como botones, tarjetas, modales, alertas y gráficos.
-   **`src/hooks` / `src/context`**: (Si aplica) Lógica de React reutilizable y gestión del estado global (ej. sesión del usuario, conexión de WebSockets).
-   **`src/assets`**: Recursos estáticos de la aplicación (imágenes, fuentes, iconos).

## Requisitos Previos

-   **Node.js 18** o superior.
-   **npm** o **yarn** como gestor de paquetes.
-   **Docker y Docker Compose** (método de ejecución recomendado para evitar problemas de entorno).

## 🚀 Ejecución con Docker (Recomendado)

Al igual que el backend, el frontend está integrado en la orquestación global del proyecto, permitiendo un despliegue rápido.

1.  **Configurar Variables de Entorno**:
    Crea un archivo `.env` en la raíz de `innotrev-sistema/frontend/`. Puedes basarte en las instrucciones de desarrollo local.

2.  **Levantar los servicios**:
    Desde la raíz principal del proyecto (`innotrev-sistema/`), donde se encuentra el `docker-compose.yml`, ejecuta:
    ```bash
    docker-compose up --build
    ```
    Este comando orquestará todo el ecosistema. El servicio de `frontend` levantará la aplicación cliente.

Una vez compilado, la interfaz gráfica estará disponible en tu navegador apuntando a `http://localhost:3000` (o el puerto configurado en tu docker-compose).

## Configuración para Desarrollo Local (Sin Docker)

Si necesitas desarrollar nuevas vistas, componentes o probar animaciones de forma rápida con Hot-Reload, sigue estos pasos:

### 1. Variables de Entorno

Crea un archivo `.env` en `innotrev-sistema/frontend/` con el siguiente contenido:

```env
# URL base para consumir la API del backend
REACT_APP_API_URL=http://localhost:8000/api/v1

# Otras variables de configuración (si aplican)
# REACT_APP_WS_URL=ws://localhost:8000/api/v1/ws
```
> **Nota**: Si usas Vite en lugar de Create React App, recuerda que el prefijo debe ser `VITE_` (ej. `VITE_API_URL`).

### 2. Instalación de Dependencias

Asegúrate de tener Node.js instalado. Abre tu terminal y ejecuta:

```bash
# Navega al directorio del frontend
cd innotrev-sistema/frontend

# Instala todas las dependencias listadas en package.json
npm install
```

### 3. Ejecución del Servidor de Desarrollo

Para iniciar la aplicación en modo desarrollo, ejecuta:

```bash
npm start
```
*(Si el proyecto fue inicializado con Vite, el comando equivalente sería `npm run dev`)*.

Esto abrirá automáticamente la aplicación en `http://localhost:3000` en tu navegador predeterminado. La página se recargará automáticamente al realizar cambios en el código.

## Dockerfile Optimizado para Producción

El `Dockerfile` del frontend debería estar diseñado utilizando un enfoque **Multi-etapa (Multi-stage build)**:
-   **Etapa de Build (Node)**: Instala dependencias y compila los archivos estáticos minimizados (`npm run build`).
-   **Etapa de Producción (Nginx)**: Toma únicamente los archivos estáticos generados y los sirve a través de un servidor Nginx ligero (basado en Alpine). 

Esto reduce drásticamente el peso de la imagen final y mejora la seguridad al no incluir el código fuente original ni herramientas de desarrollo en producción.