class CryptoService {
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

  async exportKey(key: CryptoKey): Promise<JsonWebKey> {
    return await window.crypto.subtle.exportKey("jwk", key);
  }

  async calculateFileHash(file: File): Promise<ArrayBuffer> {
    const buffer = await file.arrayBuffer();
    return await window.crypto.subtle.digest("SHA-256", buffer);
  }

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

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  saveKeys(keyPair: { publicKey: JsonWebKey; privateKey: JsonWebKey }, keyName: string = 'default'): void {
    const keysData = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`pdf_signature_keys_${keyName}`, JSON.stringify(keysData));
  }

  loadKeys(keyName: string = 'default'): { publicKey: JsonWebKey; privateKey: JsonWebKey; createdAt: string } | null {
    const data = localStorage.getItem(`pdf_signature_keys_${keyName}`);
    return data ? JSON.parse(data) : null;
  }
}

export default new CryptoService();
