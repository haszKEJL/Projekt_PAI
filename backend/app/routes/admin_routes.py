"""Endpointy administracyjne do przeglądania bazy danych."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from ..database import get_db, Signature

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/signatures")
async def get_all_signatures(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Pobiera wszystkie podpisy z bazy danych.
    Zwraca dane w czytelnym formacie do wyświetlenia w interfejsie.
    """
    signatures = db.query(Signature).order_by(Signature.created_at.desc()).all()
    
    records = []
    for sig in signatures:
        records.append({
            "id": sig.id,
            "file_hash": sig.file_hash[:32] + "..." if len(sig.file_hash) > 32 else sig.file_hash,
            "signature_preview": sig.signature_data[:32] + "..." if len(sig.signature_data) > 32 else sig.signature_data,
            "signer_name": sig.signer_name or "Brak",
            "signer_location": sig.signer_location or "Brak",
            "signer_reason": sig.signer_reason or "Brak",
            "signer_contact": sig.signer_contact or "Brak",
            "original_filename": sig.original_filename or "Brak",
            "created_at": sig.created_at.isoformat(),
            "created_at_formatted": sig.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    
    return {
        "total_count": len(records),
        "records": records
    }


@router.get("/signatures/{signature_id}")
async def get_signature_details(signature_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Pobiera szczegóły pojedynczego podpisu."""
    sig = db.query(Signature).filter(Signature.id == signature_id).first()
    
    if not sig:
        return {"error": "Signature not found"}
    
    return {
        "id": sig.id,
        "file_hash": sig.file_hash,
        "signature_data": sig.signature_data,
        "public_key_jwk": sig.public_key_jwk,
        "signer_name": sig.signer_name,
        "signer_location": sig.signer_location,
        "signer_reason": sig.signer_reason,
        "signer_contact": sig.signer_contact,
        "original_filename": sig.original_filename,
        "created_at": sig.created_at.isoformat()
    }


@router.get("/database/info")
async def get_database_info(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Zwraca informacje o strukturze bazy danych."""
    
    # Pobierz licznik rekordów
    total_signatures = db.query(Signature).count()
    
    # Ostatni podpis
    latest_signature = db.query(Signature).order_by(Signature.created_at.desc()).first()
    
    # Struktura kolumn
    columns = [
        {"name": "id", "type": "String (UUID)", "description": "Unikalny identyfikator podpisu"},
        {"name": "file_hash", "type": "String", "description": "Hash SHA-256 pliku PDF (Base64)"},
        {"name": "signature_data", "type": "Text", "description": "Podpis cyfrowy RSA-PSS (Base64)"},
        {"name": "public_key_jwk", "type": "Text", "description": "Klucz publiczny w formacie JWK (JSON)"},
        {"name": "signer_name", "type": "String", "description": "Imię i nazwisko osoby podpisującej"},
        {"name": "signer_location", "type": "String", "description": "Lokalizacja osoby podpisującej"},
        {"name": "signer_reason", "type": "String", "description": "Powód podpisania dokumentu"},
        {"name": "signer_contact", "type": "String", "description": "Dane kontaktowe osoby podpisującej"},
        {"name": "original_filename", "type": "String", "description": "Oryginalna nazwa pliku PDF"},
        {"name": "created_at", "type": "DateTime", "description": "Data utworzenia rekordu (UTC)"}
    ]
    
    return {
        "database": "SQLite",
        "table_name": "signatures",
        "total_records": total_signatures,
        "latest_signature_date": latest_signature.created_at.isoformat() if latest_signature else None,
        "columns": columns
    }


@router.delete("/signatures/{signature_id}")
async def delete_signature(signature_id: str, db: Session = Depends(get_db)) -> Dict[str, str]:
    """Usuwa podpis z bazy danych (tylko do celów administracyjnych)."""
    sig = db.query(Signature).filter(Signature.id == signature_id).first()
    
    if not sig:
        return {"status": "error", "message": "Signature not found"}
    
    db.delete(sig)
    db.commit()
    
    return {"status": "success", "message": f"Signature {signature_id} deleted"}
