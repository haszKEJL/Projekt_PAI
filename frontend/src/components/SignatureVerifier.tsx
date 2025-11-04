import React, { useState, useRef } from 'react';
import apiService from '../services/apiService';

// Komponent: Weryfikacja podpisu
// - Użytkownik dostarcza podpisany PDF i plik z kluczem publicznym (.json)
// - Backend odnajduje podpis po hash-u pliku i weryfikuje podpis z dostarczonym kluczem

const SignatureVerifier: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ✅ DODANE: Referencje do inputów
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Zapamiętuje wybrany PDF i czyści poprzedni wynik
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setResult(null); // Wyczyść poprzedni wynik
    }
  };

  // Zapamiętuje wybrany klucz publiczny (.json)
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKeyFile(file);
      setResult(null); // Wyczyść poprzedni wynik
    }
  };

  // Wysyła pliki do weryfikacji, wyświetla wynik
  const handleVerify = async () => {
    if (!pdfFile || !keyFile) {
      alert('❌ Wgraj oba pliki!');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf_file', pdfFile);
      formData.append('public_key_file', keyFile);

      const response = await apiService.verifySignatureManual(formData);
      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        valid: false,
        message: `Błąd weryfikacji: ${error.response?.data?.detail || error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Czyści formularz i resetuje inputy plików (również wizualnie)
  const handleReset = () => {
    // ✅ Wyczyść pliki
    setPdfFile(null);
    setKeyFile(null);
    setResult(null);

    // ✅ KLUCZOWE: Resetuj wartości inputów
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
    if (keyInputRef.current) {
      keyInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h2>🔍 Weryfikacja Podpisu Cyfrowego</h2>

      <div className="info-box">
        <h3>📋 Instrukcja Weryfikacji</h3>
        <ol>
          <li>Wgraj podpisany dokument PDF</li>
          <li>Wgraj plik z kluczem publicznym osoby która podpisała (.json)</li>
          <li>Kliknij "Weryfikuj Podpis"</li>
        </ol>
        <p className="text-muted mt-2">
          💡 Klucz publiczny otrzymasz od osoby która podpisała dokument
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">📄 Podpisany Dokument PDF</label>
        <div className="file-upload-wrapper">
          <label className={`file-upload-label ${pdfFile ? 'has-file' : ''}`}>
            <input
              ref={pdfInputRef} // ✅ DODANE
              type="file"
              accept=".pdf"
              onChange={handlePdfChange}
            />
            <span>{pdfFile ? `✅ ${pdfFile.name}` : '📁 Wybierz plik PDF'}</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">🔑 Klucz Publiczny (.json)</label>
        <div className="file-upload-wrapper">
          <label className={`file-upload-label ${keyFile ? 'has-file' : ''}`}>
            <input
              ref={keyInputRef} // ✅ DODANE
              type="file"
              accept=".json"
              onChange={handleKeyChange}
            />
            <span>{keyFile ? `✅ ${keyFile.name}` : '🔐 Wybierz plik klucza'}</span>
          </label>
        </div>
      </div>

      <div className="btn-group">
        <button 
          onClick={handleVerify} 
          disabled={loading || !pdfFile || !keyFile} 
          className="btn btn--primary"
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Weryfikuję...
            </>
          ) : (
            <>🔍 Weryfikuj Podpis</>
          )}
        </button>
        
        <button 
          onClick={handleReset} 
          disabled={loading}
          className="btn btn--secondary"
        >
          🔄 Resetuj
        </button>
      </div>

      {result && (
        <div className={`result-card ${result.valid ? 'result-card--success' : 'result-card--error'}`}>
          <h3>{result.message}</h3>

          {result.valid && result.signature_info && (
            <div className="signature-details">
              <h4 style={{ marginBottom: '16px' }}>📋 Szczegóły Podpisu</h4>
              <p>
                <strong>👤 Podpisane przez:</strong>
                <span>{result.signature_info.signer_name}</span>
              </p>
              <p>
                <strong>📅 Data podpisu:</strong>
                <span>{new Date(result.signature_info.signed_at).toLocaleString('pl-PL')}</span>
              </p>
              <p>
                <strong>📍 Lokalizacja:</strong>
                <span>{result.signature_info.signer_location || 'Brak'}</span>
              </p>
              {result.signature_info.signer_contact && (
                <p>
                  <strong>📧 Kontakt:</strong>
                  <span>{result.signature_info.signer_contact}</span>
                </p>
              )}
              {result.signature_info.signer_reason && (
                <p>
                  <strong>💬 Powód:</strong>
                  <span>{result.signature_info.signer_reason}</span>
                </p>
              )}
              <p>
                <strong>🔐 Metoda:</strong>
                <span style={{ 
                  background: 'var(--color-success)', 
                  color: 'white', 
                  padding: '4px 12px', 
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}>
                  {result.signature_info.verification_method}
                </span>
              </p>
            </div>
          )}

          {!result.valid && result.details && (
            <div className="alert alert--error mt-2">
              <strong>⚠️ Szczegóły:</strong> {result.details}
            </div>
          )}

          {/* Przycisk do weryfikacji kolejnego pliku */}
          <button 
            onClick={handleReset} 
            className="btn btn--secondary mt-2"
            style={{ width: '100%' }}
          >
            🔄 Zweryfikuj Kolejny Dokument
          </button>
        </div>
      )}
    </div>
  );
};

export default SignatureVerifier;
