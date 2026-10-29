from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Fillo API"
    database_url: str = "sqlite:///./fillo.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    # Loyalty rules: 1 point for every `amount_per_point` spent
    amount_per_point: float = 10.0

    model_config = SettingsConfigDict(env_file=".env", env_prefix="FILLO_")


settings = Settings()
