"""Funkcje kryptograficzne po stronie backendu.

Weryfikacja podpisu RSA-PSS z wykorzystaniem klucza publicznego w formacie JWK.
Uwaga: Backend w tym rozwiązaniu nie modyfikuje zawartości PDF – przechowuje tylko
metadane i podpis skojarzony z hashem pliku.
"""

import hashlib
import base64
import json
from typing import Tuple
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization


class CryptoVerificationService:
    
    @staticmethod
    def calculate_sha256_hash(data: bytes) -> str:
        """Oblicza SHA-256 hash z danych i zwraca go w Base64 (nie URL-safe)."""
        hash_digest = hashlib.sha256(data).digest()
        return base64.b64encode(hash_digest).decode()
    
    @staticmethod
    def verify_signature(
        signature_b64: str,
        public_key_jwk: str,
        file_hash_b64: str
    ) -> Tuple[bool, str]:
        """
        Weryfikuje podpis cyfrowy RSA-PSS
        
        Args:
            signature_b64: Podpis w Base64
            public_key_jwk: Klucz publiczny w formacie JWK (JSON)
            file_hash_b64: Hash pliku w Base64
            
        Returns:
            Tuple[bool, str]: (czy_poprawny, wiadomość)
        """
        try:
            # 1. Dekoduj klucz publiczny z JWK
            public_key_dict = json.loads(public_key_jwk)
            
            # Sprawdź czy to RSA
            if public_key_dict.get('kty') != 'RSA':
                return (False, "Nieprawidłowy typ klucza (oczekiwano RSA)")
            
            # 2. Konwertuj n i e z Base64URL do liczb
            #    (pamiętaj o odpowiednim paddingu dla Base64URL)
            n = int.from_bytes(
                base64.urlsafe_b64decode(public_key_dict['n'] + '=='),
                byteorder='big'
            )
            e = int.from_bytes(
                base64.urlsafe_b64decode(public_key_dict['e'] + '=='),
                byteorder='big'
            )
            
            # 3. Utwórz obiekt klucza publicznego
            public_numbers = rsa.RSAPublicNumbers(e, n)
            public_key = public_numbers.public_key(default_backend())
            
            # 4. Dekoduj podpis i hash z Base64
            signature_bytes = base64.b64decode(signature_b64)
            file_hash_bytes = base64.b64decode(file_hash_b64)
            
            # 5. Weryfikuj podpis RSA-PSS
            try:
                public_key.verify(
                    signature_bytes,
                    file_hash_bytes,
                    padding.PSS(
                        mgf=padding.MGF1(hashes.SHA256()),
                        salt_length=padding.PSS.MAX_LENGTH
                    ),
                    hashes.SHA256()
                )
                return (True, "Podpis jest prawidłowy")
            except Exception as verify_error:
                return (False, f"Podpis jest nieprawidłowy: {str(verify_error)}")
                
        except KeyError as e:
            return (False, f"Brak wymaganego pola w kluczu publicznym: {str(e)}")
        except Exception as e:
            return (False, f"Błąd weryfikacji: {str(e)}")
