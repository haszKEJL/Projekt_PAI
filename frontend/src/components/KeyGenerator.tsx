import React, { useState, useEffect } from 'react';
import CryptoService from '../services/cryptoService';

interface KeyPairData {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  keySize: number;
  createdAt: string;
}

const KeyGenerator: React.FC = () => {
  const [keys, setKeys] = useState<KeyPairData | null>(null);
  const [keySize, setKeySize] = useState<number>(2048);
  const [loading, setLoading] = useState(false);

  // Sprawdź czy są zapisane klucze przy montowaniu
  useEffect(() => {
    const savedKeys = CryptoService.loadKeys();
    if (savedKeys) {
      setKeys(savedKeys);
      console.log('✅ Załadowano klucze z localStorage');
    }
  }, []);

  const handleGenerateKeys = async () => {
    setLoading(true);
    try {
      console.log(`🔑 Generuję parę kluczy RSA-PSS ${keySize} bit...`);
      
      // 1. Wygeneruj parę kluczy
      const keyPair = await CryptoService.generateKeyPair(keySize);
      
      // 2. Eksportuj do formatu JWK
      const exportedPublic = await CryptoService.exportKey(keyPair.publicKey);
      const exportedPrivate = await CryptoService.exportKey(keyPair.privateKey);
      
      const newKeys: KeyPairData = {
        publicKey: exportedPublic,
        privateKey: exportedPrivate,
        keySize: keySize,
        createdAt: new Date().toISOString(),
      };
      
      // 3. Zapisz w localStorage
      CryptoService.saveKeys(
        { publicKey: exportedPublic, privateKey: exportedPrivate },
        keySize
      );
      
      // 4. Sprawdź czy zapisało się
      const check = localStorage.getItem('pdf-signature-keys');
      console.log('🔍 localStorage po zapisie:', check ? '✅ Zapisane' : '❌ Nie zapisane');
      
      setKeys(newKeys);
      alert('✅ Klucze wygenerowane i zapisane w localStorage!');
    } catch (error: any) {
      console.error('❌ Błąd generowania kluczy:', error);
      alert(`❌ Błąd: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKeys = () => {
    if (window.confirm('⚠️ Czy na pewno chcesz usunąć klucze?\n\nJeśli usuniesz klucze, nie będziesz mógł podpisywać dokumentów tym kluczem prywatnym!')) {
      CryptoService.deleteKeys();
      setKeys(null);
      alert('🗑️ Klucze usunięte!');
    }
  };

  const handleDownloadPublicKey = () => {
    if (!keys) return;
    
    const dataStr = JSON.stringify(keys.publicKey, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `public-key-${keySize}bit.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    alert('📥 Klucz publiczny pobrany!\n\nMożesz go udostępnić innym osobom do weryfikacji Twoich podpisów.');
  };

  const handleDownloadPrivateKey = () => {
    if (!keys) return;
    
    if (!window.confirm('⚠️ UWAGA!\n\nKlucz prywatny pozwala podpisywać dokumenty w Twoim imieniu!\n\nNIGDY nie udostępniaj go nikomu!\n\nCzy na pewno chcesz go pobrać?')) {
      return;
    }
    
    const dataStr = JSON.stringify(keys.privateKey, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `private-key-${keySize}bit-PRIVATE.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPublicKey = () => {
    if (!keys) return;
    
    navigator.clipboard.writeText(JSON.stringify(keys.publicKey, null, 2));
    alert('📋 Klucz publiczny skopiowany do schowka!');
  };

  return (
    <div className="key-generator">
      <h2>🔐 Generator Kluczy Cyfrowych</h2>

      <div className="info-box">
        <h3>ℹ️ Informacje o kluczach</h3>
        <ul>
          <li><strong>Klucz prywatny</strong> - używany do podpisywania (NIGDY nie udostępniaj!)</li>
          <li><strong>Klucz publiczny</strong> - używany do weryfikacji (można udostępnić)</li>
          <li>Klucze są przechowywane lokalnie w przeglądarce (localStorage)</li>
          <li>Rozmiar klucza 2048 bit to minimum dla bezpieczeństwa</li>
        </ul>
      </div>

      {!keys ? (
        <div className="key-generation-section">
          <h3>📝 Wygeneruj nową parę kluczy</h3>
          
          <div className="form-group">
            <label>Rozmiar klucza</label>
            <select 
              value={keySize} 
              onChange={(e) => setKeySize(Number(e.target.value))}
              disabled={loading}
            >
              <option value={2048}>2048 bit (Zalecane)</option>
              <option value={3072}>3072 bit (Bardziej bezpieczne)</option>
              <option value={4096}>4096 bit (Maksymalne bezpieczeństwo)</option>
            </select>
            <p className="hint">Większy klucz = większe bezpieczeństwo, ale wolniejsze generowanie</p>
          </div>

          <button
            onClick={handleGenerateKeys}
            disabled={loading}
            className="btn btn--primary btn--large"
          >
            {loading ? '🔄 Generuję klucze...' : '🔑 Wygeneruj Klucze'}
          </button>
        </div>
      ) : (
        <div className="keys-display">
          <div className="success-message">
            <h3>✅ Klucze wygenerowane!</h3>
            <p><strong>Rozmiar:</strong> {keys.keySize} bit</p>
            <p><strong>Data utworzenia:</strong> {new Date(keys.createdAt).toLocaleString('pl-PL')}</p>
          </div>

          <div className="key-section">
            <h4>🔓 Klucz Publiczny</h4>
            <p className="key-description">
              Możesz go udostępnić innym osobom do weryfikacji Twoich podpisów
            </p>
            <pre className="key-display">
              {JSON.stringify(keys.publicKey, null, 2).substring(0, 200)}...
            </pre>
            <div className="button-group">
              <button onClick={handleCopyPublicKey} className="btn btn--secondary">
                📋 Kopiuj
              </button>
              <button onClick={handleDownloadPublicKey} className="btn btn--secondary">
                📥 Pobierz
              </button>
            </div>
          </div>

          <div className="key-section">
            <h4>🔒 Klucz Prywatny</h4>
            <p className="key-description warning">
              ⚠️ NIGDY nie udostępniaj tego klucza! Jest używany do podpisywania dokumentów.
            </p>
            <pre className="key-display">
              {JSON.stringify(keys.privateKey, null, 2).substring(0, 100)}... [UKRYTY]
            </pre>
            <button onClick={handleDownloadPrivateKey} className="btn btn--warning">
              ⚠️ Pobierz klucz prywatny
            </button>
          </div>

          <div className="danger-zone">
            <h4>⚠️ Strefa niebezpieczna</h4>
            <button onClick={handleDeleteKeys} className="btn btn--danger">
              🗑️ Usuń klucze
            </button>
            <p className="hint">Usunięcie kluczy jest nieodwracalne!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyGenerator;
