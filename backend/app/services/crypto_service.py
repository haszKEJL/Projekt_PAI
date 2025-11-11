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
            public_key_jwk: Klucz publiczny w formacie JWK (JSON string)
            file_hash_b64: Hash pliku w Base64

        Returns:
            Tuple[bool, str]: (czy_poprawny, wiadomość)
        """
        try:
            # 1. Dekoduj podpis z Base64
            signature_bytes = base64.b64decode(signature_b64)

            # 2. Dekoduj hash z Base64
            hash_bytes = base64.b64decode(file_hash_b64)

            # 3. Parsuj JWK i zbuduj klucz publiczny
            jwk = json.loads(public_key_jwk)
            
            # Konwertuj n i e z Base64URL do int
            def b64url_to_int(b64_string: str) -> int:
                # Dodaj padding jeśli potrzebny
                padding_needed = len(b64_string) % 4
                if padding_needed:
                    b64_string += '=' * (4 - padding_needed)
                # Zamień Base64URL na Base64
                b64_string = b64_string.replace('-', '+').replace('_', '/')
                return int.from_bytes(base64.b64decode(b64_string), byteorder='big')

            n = b64url_to_int(jwk['n'])
            e = b64url_to_int(jwk['e'])

            # Zbuduj klucz publiczny RSA
            public_key = rsa.RSAPublicNumbers(e, n).public_key(default_backend())

            # 4. Weryfikuj podpis
            public_key.verify(
                signature_bytes,
                hash_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=32
                ),
                hashes.SHA256()
            )

            return True, "✅ Podpis jest prawidłowy"

        except Exception as e:
            return False, f"❌ Podpis nieprawidłowy: {str(e)}"