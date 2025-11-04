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


@router.post("/prepare-signature")
async def prepare_signature(file: UploadFile = File(...)):
    """
    Przygotowuje plik do podpisania (zapis tymczasowy) i zwraca jego hash.

    Zwraca m.in.: temp_file_path (na dysku serwera), file_hash (Base64) –
    to ten hash podpisuje front przy użyciu klucza prywatnego.
    """
    try:
        pdf_content = await file.read()
        file_hash_b64 = CryptoVerificationService.calculate_sha256_hash(pdf_content)
        
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(
            temp_dir, 
            f"temp_{datetime.now().timestamp()}_{file.filename}"
        )
        
        # Zapisz plik tymczasowo – finalny PDF nie jest modyfikowany przez backend
        with open(temp_file_path, "wb") as f:
            f.write(pdf_content)
        
        return {
            "success": True,
            "file_hash": file_hash_b64,
            "temp_file_path": temp_file_path,
            "original_filename": file.filename
        }
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
<<<<<<< HEAD
    """Zapisuje podpis w bazie danych i osadza w PDF"""
=======
    """
    Zapisuje podpis i metadane w bazie (bez modyfikacji samego PDF-a).

    Zwraca strumień pliku PDF (ten sam, który został przygotowany), aby
    użytkownik mógł go pobrać – nazwa pliku ma sufiks _signed.pdf.
    """
>>>>>>> f0e87180019e96d81c71b73f7b8ae761a705d7ba
    try:
        if not os.path.exists(temp_file_path):
            raise HTTPException(404, "Plik tymczasowy nie znaleziony")
        
        with open(temp_file_path, 'rb') as f:
            pdf_content = f.read()
        
        file_hash_b64 = CryptoVerificationService.calculate_sha256_hash(pdf_content)
        metadata_dict = json.loads(metadata)
        
        # Sprawdź czy rekord już istnieje (po hash-u pliku)
        existing = db.query(Signature).filter(
            Signature.file_hash == file_hash_b64
        ).first()
        
        if existing:
            raise HTTPException(409, "Dokument już podpisany")
        
        # Zapisz podpis i metadane w bazie
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
        
        # Przygotuj nazwy plików
        original_filename = metadata_dict.get('filename', 'document.pdf')
        signed_filename = original_filename.replace('.pdf', '_signed.pdf')
        
        # Ścieżka do nowego pliku z osadzonym podpisem
        temp_dir = tempfile.gettempdir()
        signed_file_path = os.path.join(
            temp_dir, 
            f"signed_{datetime.now().timestamp()}_{signed_filename}"
        )
        
        # Osadź metadane i podpis w PDF
        success = PdfService.embed_signature_in_pdf(
            input_pdf_path=temp_file_path,
            output_pdf_path=signed_file_path,
            signature_data=signature,
            metadata=metadata_dict
        )
        
        # Jeśli osadzenie się nie powiodło, zwróć oryginalny
        if not success:
            signed_file_path = temp_file_path
        
        # Zwróć podpisany plik
        return FileResponse(
            signed_file_path,
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


@router.post("/verify-signature-manual")
async def verify_signature_manual(
    pdf_file: UploadFile = File(...),
    public_key_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Weryfikacja z ZEWNĘTRZNYM kluczem publicznym
    """
    try:
        # Odczytaj PDF
        pdf_content = await pdf_file.read()
        file_hash_b64 = CryptoVerificationService.calculate_sha256_hash(pdf_content)
        
        # Odczytaj klucz publiczny
        public_key_content = await public_key_file.read()
        
        try:
            public_key_json = json.loads(public_key_content.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(400, "Nieprawidłowy format JSON klucza")
        
        # Obsługa formatów
        if 'publicKey' in public_key_json:
            public_key_jwk = json.dumps(public_key_json['publicKey'])
        elif 'kty' in public_key_json:
            public_key_jwk = json.dumps(public_key_json)
        else:
            raise HTTPException(400, "Brak pola 'kty' lub 'publicKey'")
        
        # Znajdź podpis w bazie po hash-u pliku
        signature_record = db.query(Signature).filter(
            Signature.file_hash == file_hash_b64
        ).first()
        
        if not signature_record:
            return {
                "success": True,
                "valid": False,
                "message": "❌ Dokument nie został podpisany"
            }
        
        # Weryfikuj podpis RSA-PSS używając dostarczonego klucza publicznego
        is_valid, message = CryptoVerificationService.verify_signature(
            signature_record.signature_data,
            public_key_jwk,
            file_hash_b64
        )
        
        if is_valid:
            return {
                "success": True,
                "valid": True,
                "message": "✅ Podpis prawidłowy!",
                "signature_info": {
                    "signer_name": signature_record.signer_name or "Nieznany",
                    "signer_location": signature_record.signer_location or "Brak",
                    "signed_at": signature_record.created_at.isoformat(),
                    "signer_contact": signature_record.signer_contact or "Brak",
                    "signer_reason": signature_record.signer_reason or "Brak",
                    "verification_method": "Klucz publiczny z pliku",
                    "file_hash": file_hash_b64[:16] + "..."
                }
            }
        else:
            return {
                "success": True,
                "valid": False,
                "message": "❌ Weryfikacja niepomyślna",
                "details": message
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
