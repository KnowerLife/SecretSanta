import os
from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Secret Santa API"
    environment: str = os.getenv("ENVIRONMENT", "development")
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://secretsanta:secretsanta@localhost:5432/secretsanta")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    secret_key: str = os.getenv("SECRET_SANTA_SECRET", "change-me")
    token_ttl_seconds: int = int(os.getenv("SECRET_SANTA_TOKEN_TTL", "604800"))
    allow_origins: str = os.getenv("SECRET_SANTA_ALLOW_ORIGIN", "*")
    vapid_public_key: str | None = os.getenv("VAPID_PUBLIC_KEY")
    vapid_private_key: str | None = os.getenv("VAPID_PRIVATE_KEY")
    vapid_subject: str = os.getenv("VAPID_SUBJECT", "mailto:admin@example.com")
    smtp_host: str | None = os.getenv("SMTP_HOST")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str | None = os.getenv("SMTP_USER")
    smtp_password: str | None = os.getenv("SMTP_PASSWORD")
    smtp_from: str | None = os.getenv("SMTP_FROM")


settings = Settings()
