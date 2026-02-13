# 1. Usa una imagen base de Python ligera
FROM python:3.11-slim

# 2. Establece variables de entorno recomendadas
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 3. Establece el directorio de trabajo
WORKDIR /app

# 4. Copia e instala las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Copia el resto de la aplicación
COPY . .

# 6. Expone el puerto que usará la aplicación
EXPOSE 8000

# 7. Comando para arrancar el servidor de Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
