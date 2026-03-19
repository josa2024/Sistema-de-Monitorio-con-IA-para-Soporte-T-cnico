# --- Etapa 1: Build ---
# Usamos una imagen de Python ligera y moderna. La nombramos "builder"
FROM python:3.13-slim as builder

# Establecemos variables de entorno recomendadas para Python en contenedores
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Primero instalamos las dependencias para aprovechar el cache de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# --- Etapa 2: Final ---
# Usamos la misma imagen base para la imagen final
FROM python:3.13-slim

# Creamos un grupo y un usuario sin privilegios de root para ejecutar la aplicación
RUN addgroup --system app && adduser --system --group app

# Cambiamos al usuario no-root
USER app

WORKDIR /home/app

# Copiamos las dependencias instaladas desde la etapa de "builder"
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
# Copiamos el código de la aplicación
COPY --chown=app:app ./ /home/app

# Expone el puerto que usará la aplicación. 8000 es el estándar para FastAPI.
EXPOSE 8000

# Comando para arrancar el servidor de Uvicorn en producción.
# Para desarrollo, este comando es sobreescrito por docker-compose.yml para habilitar el --reload.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
