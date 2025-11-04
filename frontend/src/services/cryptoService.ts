// Serwis kryptograficzny oparty na Web Crypto API (działa w przeglądarce)
// Uwaga: Klucze generowane lokalnie nie są wysyłane do backendu.
class CryptoService {
  /**
   * Generuje parę kluczy RSA-PSS 2048/SHA-256 do podpisywania i weryfikacji
   */
  async generateKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );
  }

  /** Eksportuje klucz (publiczny/prywatny) do formatu JWK (JSON) */
  async exportKey(key: CryptoKey): Promise<JsonWebKey> {
    return await window.crypto.subtle.exportKey("jwk", key);
  }

  /** Oblicza hash SHA-256 dla zawartości pliku */
  async calculateFileHash(file: File): Promise<ArrayBuffer> {
    const buffer = await file.arrayBuffer();
    return await window.crypto.subtle.digest("SHA-256", buffer);
  }

  /** Podpisuje podany hash przy użyciu klucza prywatnego RSA-PSS */
  async signHash(hash: ArrayBuffer, privateKey: CryptoKey): Promise<ArrayBuffer> {
    return await window.crypto.subtle.sign(
      {
        name: "RSA-PSS",
        saltLength: 32,
      },
      privateKey,
      hash
    );
  }

  /** Zamienia ArrayBuffer na Base64 (do wysyłki jako tekst) */
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /** Zapisuje parę kluczy w localStorage (z prostymi metadanymi) */
  saveKeys(keyPair: { publicKey: JsonWebKey; privateKey: JsonWebKey }, keyName: string = 'default'): void {
    const keysData = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`pdf_signature_keys_${keyName}`, JSON.stringify(keysData));
  }

  /** Odczytuje parę kluczy z localStorage (lub null, jeśli brak) */
  loadKeys(keyName: string = 'default'): { publicKey: JsonWebKey; privateKey: JsonWebKey; createdAt: string } | null {
    const data = localStorage.getItem(`pdf_signature_keys_${keyName}`);
    return data ? JSON.parse(data) : null;
  }
}

export default new CryptoService();
