from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "evault-documents"
    app_port: int = 8082
    
    database_url: str = "mysql+aiomysql://root@localhost:3306/evault_documents"
    
    pinata_jwt: str = ""
    pinata_api_key: str = ""
    pinata_secret_api_key: str = ""
    
    blockchain_service_url: str = "http://localhost:8083"
    audit_service_url: str = "http://localhost:8084"
    notification_service_url: str = "http://localhost:8085"
    integration_service_url: str = "http://localhost:8086"
    
    max_file_size_mb: int = 20
    enable_ai_classification: bool = False

    # Shared with evault-auth when verifying JWTs (empty = decode without verify, dev only)
    jwt_secret: str = ""
    allow_mock_auth: bool = True

    # 32-byte hex key for AES-GCM
    encryption_master_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
