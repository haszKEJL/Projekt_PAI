import React, { useState, useEffect } from 'react';
import CryptoService from '../services/cryptoService';

type StoredKeys = {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  keySize?: number;
  createdAt: string;
} | null;

const KeyGenerator: React.FC = () => {
  const [keyStatus, setKeyStatus] = useState<StoredKeys>(null);
  const [loading, setLoading] = useState(false);
  const [selectedKeySize, setSelectedKeySize] = useState<number>(2048);

  // Dostępne rozmiary kluczy z opisami
  const keySizeOptions = [
    {
      value: 1024,
      label: '1024 bitów',
      security: 'Niski',
      usage: 'Przestarzały - tylko testy',
      icon: '⚠️',
      color: '#ef4444',
      speed: 'Bardzo szybki',
      recommended: false
    },
    {
      value: 2048,
      label: '2048 bitów',
      security: 'Dobry',
      usage: 'Standard do 2030',
      icon: '✅',
      color: '#10b981',
      speed: 'Szybki',
      recommended: true
    },
    {
      value: 3072,
      label: '3072 bity',
      security: 'Bardzo dobry',
      usage: 'Zalecany dla długoterminowych podpisów',
      icon: '🔒',
      color: '#3b82f6',
      speed: 'Średni',
      recommended: false
    },
    {
      value: 4096,
      label: '4096 bitów',
      security: 'Wysoki',
      usage: 'Maksymalne bezpieczeństwo',
      icon: '🛡️',
      color: '#8b5cf6',
      speed: 'Wolniejszy',
      recommended: false
    },
    {
      value: 8192,
      label: '8192 bity',
      security: 'Ekstremalny',
      usage: 'Dla zastosowań specjalnych',
      icon: '🔐',
      color: '#ec4899',
      speed: 'Bardzo wolny',
      recommended: false
    }
  ];

  useEffect(() => {
    checkKeys();
  }, []);

  const checkKeys = () => {
    const keys = CryptoService.loadKeys();
    setKeyStatus(keys);
  };

  const handleGenerateKeys = async () => {
    setLoading(true);
    try {
      const keyPair = await CryptoService.generateKeyPair(selectedKeySize);
      const publicKey = await CryptoService.exportKey(keyPair.publicKey);
      const privateKey = await CryptoService.exportKey(keyPair.privateKey);

      CryptoService.saveKeys({ publicKey, privateKey }, 'default', selectedKeySize);
      alert(`✅ Klucze ${selectedKeySize}-bitowe zostały wygenerowane pomyślnie!`);
      checkKeys();
    } catch (error) {
      alert(`❌ Błąd: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPublicKey = () => {
    const keys = CryptoService.loadKeys();
    if (!keys) {
      alert('❌ Najpierw wygeneruj klucze!');
      return;
    }

    const publicKeyData = {
      version: "1.0",
      publicKey: keys.publicKey,
      keySize: keys.keySize || 2048,
      createdAt: keys.createdAt,
      description: "Klucz publiczny do weryfikacji podpisów",
    };

    const blob = new Blob([JSON.stringify(publicKeyData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `public_key_${keys.keySize || 2048}bit_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert('✅ Klucz publiczny wyeksportowany!');
  };

  const getSelectedOption = () => {
    return keySizeOptions.find(opt => opt.value === selectedKeySize);
  };

  return (
    <div className="key-generator">
      <h2>🔑 Zarządzanie Kluczami Kryptograficznymi</h2>
      
      <div className="info-box">
        <h3>ℹ️ Jak to działa?</h3>
        <p>Klucze RSA są generowane lokalnie w Twojej przeglądarce i zapisywane w localStorage.</p>
        <ul>
          <li><strong>Klucz prywatny</strong> - pozostaje na Twoim urządzeniu, służy do podpisywania dokumentów</li>
          <li><strong>Klucz publiczny</strong> - możesz wysłać innym osobom, służy do weryfikacji Twoich podpisów</li>
          <li><strong>Bezpieczeństwo</strong> - większy rozmiar klucza = wyższe bezpieczeństwo, ale wolniejsza generacja</li>
        </ul>
      </div>

      <div className="key-size-selector">
        <h3>🔧 Wybierz rozmiar klucza RSA</h3>
        <p className="text-muted mb-2">
          Wybierz odpowiedni rozmiar klucza w zależności od potrzeb bezpieczeństwa i wydajności
        </p>

        <div className="key-size-grid">
          {keySizeOptions.map((option) => (
            <div
              key={option.value}
              className={`key-size-card ${selectedKeySize === option.value ? 'selected' : ''} ${option.recommended ? 'recommended' : ''}`}
              onClick={() => setSelectedKeySize(option.value)}
              style={{ borderColor: selectedKeySize === option.value ? option.color : undefined }}
            >
              {option.recommended && <div className="recommended-badge">⭐ Zalecane</div>}
              
              <div className="key-size-header">
                <span className="key-size-icon">{option.icon}</span>
                <input
                  type="radio"
                  value={option.value}
                  checked={selectedKeySize === option.value}
                  onChange={(e) => setSelectedKeySize(Number(e.target.value))}
                  className="key-size-radio"
                />
              </div>

              <h4>{option.label}</h4>
              
              <div className="key-size-details">
                <div className="detail-row">
                  <span className="detail-label">Bezpieczeństwo:</span>
                  <span className="detail-value" style={{ color: option.color }}>
                    <strong>{option.security}</strong>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Wydajność:</span>
                  <span className="detail-value">{option.speed}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Zastosowanie:</span>
                  <span className="detail-value small">{option.usage}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {getSelectedOption() && (
          <div className="selection-summary">
            <h4>📋 Wybrano: {getSelectedOption()?.label}</h4>
            <p>{getSelectedOption()?.icon} {getSelectedOption()?.usage}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <p className="loading-text">Generuję klucze {selectedKeySize}-bitowe...</p>
          <p className="text-muted">To może zająć {selectedKeySize >= 4096 ? 'kilka sekund' : 'chwilę'}</p>
        </div>
      ) : (
        <button onClick={handleGenerateKeys} className="btn btn--primary btn--large">
          🔄 Wygeneruj Nowe Klucze ({selectedKeySize} bitów)
        </button>
      )}

      {keyStatus && (
        <div className="key-status">
          <h3>✅ Klucze Zostały Wygenerowane</h3>
          
          <div className="key-info-grid">
            <div className="key-info-item">
              <span className="key-info-label">Rozmiar klucza:</span>
              <span className="key-info-value">{keyStatus.keySize || 2048} bitów</span>
            </div>
            <div className="key-info-item">
              <span className="key-info-label">Poziom bezpieczeństwa:</span>
              <span className="key-info-value">
                {keySizeOptions.find(opt => opt.value === (keyStatus.keySize || 2048))?.security}
              </span>
            </div>
            <div className="key-info-item">
              <span className="key-info-label">Data utworzenia:</span>
              <span className="key-info-value">
                {new Date(keyStatus.createdAt).toLocaleString('pl-PL', {
                  dateStyle: 'long',
                  timeStyle: 'short'
                })}
              </span>
            </div>
          </div>
          
          <button onClick={handleExportPublicKey} className="btn btn--secondary mt-3">
            📤 Eksportuj Klucz Publiczny
          </button>
          
          <div className="info-tip">
            💡 <strong>Tip:</strong> Wyślij plik z kluczem publicznym osobom, które chcą zweryfikować Twoje podpisy
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyGenerator;
