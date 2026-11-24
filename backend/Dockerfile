FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0

COPY backend/ /app/backend/
WORKDIR /app
EXPOSE 8000

CMD ["python", "-m", "backend.app.server", "--host", "0.0.0.0", "--port", "8000"]
