import json
import base64
import hashlib
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from PyPDF2 import PdfReader, PdfWriter
import io


def calculate_pdf_content_hash(pdf_content: bytes) -> bytes:
    """
    Oblicza hash ZAWARTOŚCI PDF (stron) bez metadanych.
    Używane zarówno przy podpisywaniu jak i weryfikacji.
    """
    try:
        pdf_reader = PdfReader(io.BytesIO(pdf_content))
        writer = PdfWriter()
        
        # Skopiuj tylko strony (bez metadanych)
        for page in pdf_reader.pages:
            writer.add_page(page)
        
        # Zapisz do bufora
        buffer = io.BytesIO()
        writer.write(buffer)
        content_only = buffer.getvalue()
        
        # Oblicz hash
        return hashlib.sha256(content_only).digest()
    except Exception as e:
        print(f"⚠️ Błąd obliczania hasha: {e}")
        # Fallback - hash całego pliku
        return hashlib.sha256(pdf_content).digest()


def verify_pdf_signature(pdf_content: bytes, public_key_jwk: dict) -> dict:
    """
    Weryfikuje podpis cyfrowy PDF.
    Sprawdza:
    1. Czy zawartość PDF (strony) nie została zmodyfikowana
    2. Czy podpis kryptograficzny jest prawidłowy
    """
    try:
        # 1. Wczytaj PDF i wyciągnij metadane
        pdf_reader = PdfReader(io.BytesIO(pdf_content))
        
        if '/Signature' not in pdf_reader.metadata:
            return {
                'valid': False, 
                'error': 'Brak podpisu w PDF - dokument nie został podpisany'
            }
        
        # 2. Parsuj metadane podpisu
        signature_metadata = json.loads(pdf_reader.metadata['/Signature'])
        signature_base64 = signature_metadata['signature']
        file_hash_base64 = signature_metadata['file_hash']
        metadata = signature_metadata.get('metadata', {})
        
        # 3. Konwertuj z Base64
        signature_bytes = base64.b64decode(signature_base64)
        original_hash_bytes = base64.b64decode(file_hash_base64)
        
        # 4. Oblicz hash AKTUALNEJ zawartości (stron)
        current_hash = calculate_pdf_content_hash(pdf_content)
        
        print(f"🔍 Hash zapisany w podpisie: {base64.b64encode(original_hash_bytes).decode()[:64]}...")
        print(f"🔍 Hash aktualnej zawartości: {base64.b64encode(current_hash).decode()[:64]}...")
        
        # 5. Sprawdź czy zawartość się zgadza
        if current_hash != original_hash_bytes:
            return {
                'valid': False,
                'error': '⚠️ DOKUMENT ZOSTAŁ ZMODYFIKOWANY! Zawartość nie zgadza się z podpisem.'
            }
        
        # 6. Konwertuj JWK na klucz publiczny RSA
        def base64url_to_int(data: str) -> int:
            padding_needed = 4 - (len(data) % 4)
            if padding_needed and padding_needed != 4:
                data += '=' * padding_needed
            data = data.replace('-', '+').replace('_', '/')
            return int.from_bytes(base64.b64decode(data), byteorder='big')
        
        n = base64url_to_int(public_key_jwk['n'])
        e = base64url_to_int(public_key_jwk['e'])
        
        public_numbers = rsa.RSAPublicNumbers(e, n)
        public_key = public_numbers.public_key(default_backend())
        
        # 7. Weryfikuj podpis kryptograficzny
        try:
            public_key.verify(
                signature_bytes,
                original_hash_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=32
                ),
                hashes.SHA256()
            )
            
            return {
                'valid': True,
                'message': '✅ Podpis jest prawidłowy! Dokument jest autentyczny i nie został zmodyfikowany.',
                'metadata': metadata
            }
            
        except Exception as verify_error:
            print(f"❌ Błąd weryfikacji podpisu RSA: {verify_error}")
            return {
                'valid': False,
                'error': f'❌ Podpis kryptograficzny nieprawidłowy - dokument mógł zostać zmodyfikowany'
            }
            
    except KeyError as e:
        return {
            'valid': False, 
            'error': f'Nieprawidłowa struktura podpisu: brak klucza {str(e)}'
        }
    except json.JSONDecodeError:
        return {
            'valid': False, 
            'error': 'Nieprawidłowy format metadanych podpisu'
        }
    except Exception as e:
        print(f"❌ Błąd weryfikacji: {e}")
        return {
            'valid': False, 
            'error': f'Błąd weryfikacji: {str(e)}'
        }
