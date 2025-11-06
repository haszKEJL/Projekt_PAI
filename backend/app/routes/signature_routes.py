from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import json
import os
import tempfile
from datetime import datetime
from ..database import get_db, Signature
from ..services.crypto_service import CryptoVerificationService
from ..services.pdf_service import PdfService

router = APIRouter(prefix="/signature", tags=["signature"])


@router.get("/")
async def signature_root():
    return {"message": "Signature API"}


@router.post("/prepare-signature-with-metadata")
async def prepare_signature_with_metadata(
    file: UploadFile = File(...),
    metadata: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Przygotowuje plik Z METADANAMI do podpisania
    Zwraca hash FINAŁOWEGO pliku (z metadanymi)
    
    NOWE: Sprawdza czy dokument nie był już wcześniej podpisany
    """
    try:
        pdf_content = await file.read()
        metadata_dict = json.loads(metadata)

        # ✅ NOWE: Sprawdź hash ORYGINALNEGO pliku przed przygotowaniem
        original_hash = CryptoVerificationService.calculate_sha256_hash(pdf_content)
        
        existing_original = db.query(Signature).filter(
            Signature.file_hash == original_hash
        ).first()
        
        if existing_original:
            raise HTTPException(
                status_code=409,
                detail=f"⚠️ Ten dokument został już podpisany przez {existing_original.signer_name or 'kogoś'} w dniu {existing_original.created_at.strftime('%Y-%m-%d %H:%M:%S')}. Nie można podpisać go ponownie."
            )

        temp_dir = tempfile.gettempdir()

        # Zapisz oryginalny plik
        original_path = os.path.join(
            temp_dir,
            f"orig_{datetime.now().timestamp()}_{file.filename}"
        )

        with open(original_path, "wb") as f:
            f.write(pdf_content)

        # Utwórz plik Z METADANAMI
        temp_signed_path = os.path.join(
            temp_dir,
            f"temp_signed_{datetime.now().timestamp()}_{file.filename}"
        )

        # Dodaj metadane
        success = PdfService.embed_signature_in_pdf(
            input_pdf_path=original_path,
            output_pdf_path=temp_signed_path,
            signature_data="PENDING",
            metadata=metadata_dict
        )

        if not success:
            temp_signed_path = original_path

        # Oblicz hash FINAŁOWEGO pliku
        with open(temp_signed_path, 'rb') as f:
            final_pdf_content = f.read()

        file_hash_b64 = CryptoVerificationService.calculate_sha256_hash(final_pdf_content)
        
        # ✅ NOWE: Sprawdź też hash pliku z metadanymi
        existing_with_metadata = db.query(Signature).filter(
            Signature.file_hash == file_hash_b64
        ).first()
        
        if existing_with_metadata:
            # Usuń pliki tymczasowe
            if os.path.exists(original_path):
                os.remove(original_path)
            if os.path.exists(temp_signed_path):
                os.remove(temp_signed_path)
                
            raise HTTPException(
                status_code=409,
                detail=f"⚠️ Dokument z takimi metadanymi został już podpisany. Zmień dane lub wybierz inny dokument."
            )

        return {
            "success": True,
            "file_hash": file_hash_b64,
            "temp_file_path": temp_signed_path,
            "original_filename": file.filename
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Błąd przygotowania: {str(e)}"
        )


@router.post("/embed-signature")
async def embed_signature(
    temp_file_path: str = Form(...),
    signature: str = Form(...),
    public_key: str = Form(...),
    metadata: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Zapisuje podpis w bazie (plik JUŻ ma metadane!)
    """
    try:
        if not os.path.exists(temp_file_path):
            raise HTTPException(404, "Plik tymczasowy nie znaleziony")

        # Oblicz hash ISTNIEJĄCEGO pliku
        with open(temp_file_path, 'rb') as f:
            pdf_content = f.read()

        file_hash_b64 = CryptoVerificationService.calculate_sha256_hash(pdf_content)
        metadata_dict = json.loads(metadata)

        # ✅ ULEPSZONE: Sprawdź czy już istnieje (podwójne zabezpieczenie)
        existing = db.query(Signature).filter(
            Signature.file_hash == file_hash_b64
        ).first()

        if existing:
            raise HTTPException(
                status_code=409, 
                detail=f"⚠️ Dokument już podpisany przez {existing.signer_name or 'kogoś'} w dniu {existing.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
            )

        # Zapisz w bazie
        new_signature = Signature(
            file_hash=file_hash_b64,
            signature_data=signature,
            public_key_jwk=public_key,
            signer_name=metadata_dict.get('name'),
            signer_location=metadata_dict.get('location'),
            signer_reason=metadata_dict.get('reason'),
            signer_contact=metadata_dict.get('contact'),
            original_filename=metadata_dict.get('filename', 'unknown.pdf')
        )

        db.add(new_signature)
        db.commit()

        # Nazwij plik
        original_filename = metadata_dict.get('filename', 'document.pdf')
        signed_filename = original_filename.replace('.pdf', '_signed.pdf')

        # Zwróć plik (już ma metadane)
        return FileResponse(
            temp_file_path,
            media_type="application/pdf",
            filename=signed_filename,
            headers={
                "Content-Disposition": f"attachment; filename={signed_filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Błąd: {str(e)}")


@router.post("/verify-signature")
async def verify_signature(
    file: UploadFile = File(...),
    public_key_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Weryfikacja z ZEWNĘTRZNYM kluczem publicznym"""
    try:
        pdf_content = await file.read()
        file_hash_b64 = CryptoVerificationService.calculate_sha256_hash(pdf_content)

        public_key_content = await public_key_file.read()

        try:
            public_key_json = json.loads(public_key_content.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(400, "Nieprawidłowy format JSON klucza")

        # Sprawdź format klucza
        if 'publicKey' in public_key_json:
            public_key_jwk = json.dumps(public_key_json['publicKey'])
        elif 'kty' in public_key_json:
            public_key_jwk = json.dumps(public_key_json)
        else:
            raise HTTPException(400, "Brak pola 'kty' lub 'publicKey'")

        # Szukaj podpisu w bazie
        signature_record = db.query(Signature).filter(
            Signature.file_hash == file_hash_b64
        ).first()

        if not signature_record:
            return {
                "valid": False,
                "message": "❌ Dokument nie został podpisany lub został zmodyfikowany"
            }

        # Weryfikuj podpis
        is_valid, message = CryptoVerificationService.verify_signature(
            signature_record.signature_data,
            public_key_jwk,
            file_hash_b64
        )

        if is_valid:
            return {
                "valid": True,
                "message": "✅ Podpis prawidłowy!",
                "signature_info": {
                    "signer_name": signature_record.signer_name or "Nieznany",
                    "signer_location": signature_record.signer_location or "Brak",
                    "signed_at": signature_record.created_at.isoformat(),
                    "signer_contact": signature_record.signer_contact or "Brak",
                    "signer_reason": signature_record.signer_reason or "Brak",
                    "verification_method": "RSA-PSS + SHA-256",
                    "file_hash": file_hash_b64[:32] + "..."
                }
            }
        else:
            return {
                "valid": False,
                "message": f"❌ Weryfikacja niepomyślna: {message}"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Błąd: {str(e)}")


@router.get("/signatures")
async def list_signatures(db: Session = Depends(get_db)):
    """Lista wszystkich podpisów"""
    signatures = db.query(Signature).all()

    return {
        "success": True,
        "count": len(signatures),
        "signatures": [
            {
                "id": sig.id,
                "signer_name": sig.signer_name,
                "signed_at": sig.created_at.isoformat(),
                "filename": sig.original_filename
            }
            for sig in signatures
        ]
    }
