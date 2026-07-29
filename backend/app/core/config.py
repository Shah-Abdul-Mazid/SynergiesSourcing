from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── MongoDB ─────────────────────────────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "smartfactory"

    # ── Ollama / OpenAI-compatible LLM endpoint ────────────────────────────────
    OLLAMA_API_KEY: str = "ollama"
    OLLAMA_API_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL_NAME: str = "openchat:latest"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
