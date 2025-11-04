"""Warstwa dostępu do danych (SQLite) dla podpisów.

Zawiera definicję modelu `Signature` oraz inicjalizację bazy.
"""

from sqlalchemy import create_engine, Column, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid
import os

# Utwórz folder data jeśli nie istnieje
os.makedirs('data', exist_ok=True)

DATABASE_URL = "sqlite:///./data/signatures.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Signature(Base):
    __tablename__ = "signatures"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Hash pliku PDF (Base64 z SHA-256) – unikalny identyfikator dokumentu
    file_hash = Column(String, nullable=False, unique=True, index=True)
    # Podpis w Base64 (wynik RSA-PSS nad hashem pliku)
    signature_data = Column(Text, nullable=False)
    # Klucz publiczny w formacie JWK (JSON jako tekst)
    public_key_jwk = Column(Text, nullable=False)
    # Dane opisowe osoby podpisującej
    signer_name = Column(String, nullable=True)
    signer_location = Column(String, nullable=True)
    signer_reason = Column(String, nullable=True)
    signer_contact = Column(String, nullable=True)
    # Oryginalna nazwa pliku (pomocniczo)
    original_filename = Column(String, nullable=True)
    # Data utworzenia rekordu (UTC)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully!")


if __name__ == "__main__":
    init_db()
