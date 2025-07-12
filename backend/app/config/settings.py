from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for the application."""

    # Databases
    MONGO_DB: str
    REDIS_URL: str
    CHROMADB_HOST: str = "http://chromadb:8000"

    # Authentication
    JWT_SECRET_KEY: str
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Environment & Deployment
    ENV: str = "production"
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
    )


settings = Settings()  # type: ignore
