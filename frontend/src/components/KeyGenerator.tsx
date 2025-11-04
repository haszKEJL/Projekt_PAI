import React, { useState, useEffect } from 'react';
import CryptoService from '../services/cryptoService';

// Komponent: Zarządzanie parą kluczy (generowanie, zapis, eksport klucza publicznego)
// - Klucze są generowane lokalnie w przeglądarce (Web Crypto API)
// - Przechowywane w localStorage – nie opuszczają urządzenia użytkownika
// - Eksportowany jest wyłącznie klucz publiczny (JSON), nigdy prywatny

type StoredKeys = {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  createdAt: string;
} | null;

const KeyGenerator: React.FC = () => {
  // Stan przechowujący informację, czy klucze istnieją i kiedy zostały utworzone
  const [keyStatus, setKeyStatus] = useState<StoredKeys>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkKeys();
  }, []);

  // Sprawdza, czy w localStorage istnieją już zapisane klucze
  const checkKeys = () => {
    const keys = CryptoService.loadKeys();
    setKeyStatus(keys);
  };

  // Generuje nową parę kluczy RSA-PSS (2048/SHA-256), zapisuje w localStorage
  const handleGenerateKeys = async () => {
    setLoading(true);
    try {
      const keyPair = await CryptoService.generateKeyPair();
      const publicKey = await CryptoService.exportKey(keyPair.publicKey);
      const privateKey = await CryptoService.exportKey(keyPair.privateKey);
      
      CryptoService.saveKeys({ publicKey, privateKey });
      alert('✅ Klucze zostały wygenerowane pomyślnie!');
      checkKeys();
    } catch (error) {
      alert(`❌ Błąd: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Eksportuje klucz publiczny do pliku .json (z prostymi metadanymi)
  const handleExportPublicKey = () => {
    const keys = CryptoService.loadKeys();
    if (!keys) {
      alert('❌ Najpierw wygeneruj klucze!');
      return;
    }

    const publicKeyData = {
      version: "1.0",
      publicKey: keys.publicKey,
      createdAt: keys.createdAt,
      description: "Klucz publiczny do weryfikacji podpisów",
    };

    const blob = new Blob([JSON.stringify(publicKeyData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `public_key_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert('✅ Klucz publiczny wyeksportowany!');
  };

  return (
    <div>
      <h2>🔑 Zarządzanie Kluczami</h2>

      <div className="info-box">
        <h3>ℹ️ Informacje</h3>
        <p>Klucze kryptograficzne są generowane lokalnie w przeglądarce i zapisywane w localStorage.</p>
        <ul>
          <li><strong>Klucz prywatny</strong> - służy do podpisywania (NIGDY nie udostępniaj!)</li>
          <li><strong>Klucz publiczny</strong> - służy do weryfikacji (możesz wysłać innym)</li>
        </ul>
      </div>

      <div className="form-group">
        <button 
          onClick={handleGenerateKeys} 
          disabled={loading} 
          className="btn btn--primary"
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Generuję klucze...
            </>
          ) : (
            <>🔄 Wygeneruj Nowe Klucze</>
          )}
        </button>
      </div>

      {keyStatus && (
        <div className="key-status">
          <h3>✅ Klucze Zostały Wygenerowane</h3>
          <p><strong>Data utworzenia:</strong> {new Date(keyStatus.createdAt).toLocaleString('pl-PL')}</p>
          <div className="btn-group mt-2">
            <button onClick={handleExportPublicKey} className="btn btn--secondary">
              📤 Eksportuj Klucz Publiczny
            </button>
          </div>
          <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
            💡 Wyślij plik z kluczem publicznym osobom które chcą zweryfikować Twoje podpisy
          </p>
        </div>
      )}
    </div>
  );
};

export default KeyGenerator;
