import React, { useState } from 'react';
import apiService from '../services/apiService';

interface VerificationResult {
  valid: boolean;
  message: string;
  signature_info?: {
    signer_name: string;
    signer_location: string;
    signer_reason: string;
    signer_contact: string;
    signed_at: string;
    verification_method: string;
  };
}

const SignatureVerifier: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [publicKeyFile, setPublicKeyFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [dragActivePdf, setDragActivePdf] = useState(false);
  const [dragActiveKey, setDragActiveKey] = useState(false);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      alert('❌ Proszę wybrać plik PDF');
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/json') {
      setPublicKeyFile(file);
    } else {
      alert('❌ Proszę wybrać plik JSON z kluczem publicznym');
    }
  };

  // Drag & Drop dla PDF - poprawiona implementacja
  const handleDragPdf = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActivePdf(true);
    } else if (e.type === "dragleave") {
      setDragActivePdf(false);
    }
  };

  const handleDropPdf = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivePdf(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type === 'application/pdf') {
        setPdfFile(droppedFile);
      } else {
        alert('❌ Proszę wybrać plik PDF');
      }
    }
  };

  // Drag & Drop dla klucza publicznego - poprawiona implementacja
  const handleDragKey = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveKey(true);
    } else if (e.type === "dragleave") {
      setDragActiveKey(false);
    }
  };

  const handleDropKey = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveKey(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type === 'application/json') {
        setPublicKeyFile(droppedFile);
      } else {
        alert('❌ Proszę wybrać plik JSON');
      }
    }
  };

  const handleVerify = async () => {
    if (!pdfFile || !publicKeyFile) {
      alert('❌ Wybierz plik PDF i klucz publiczny!');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('public_key_file', publicKeyFile);

      const response = await apiService.verifySignature(formData);
      setResult(response);
    } catch (error: any) {
      setResult({
        valid: false,
        message: error.response?.data?.detail || 'Błąd podczas weryfikacji',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signature-verifier">
      <h2>✅ Weryfikacja Podpisu Cyfrowego</h2>

      <div className="info-box">
        <h3>ℹ️ Jak zweryfikować podpis?</h3>
        <ul>
          <li>Wybierz podpisany plik PDF</li>
          <li>Wybierz plik z kluczem publicznym osoby podpisującej (.json)</li>
          <li>Kliknij "Weryfikuj podpis"</li>
          <li>System sprawdzi autentyczność podpisu</li>
        </ul>
        <p>💡 Klucz publiczny otrzymasz od osoby, która podpisała dokument</p>
      </div>

      <div className="upload-section">
        <div 
          className={`upload-zone ${dragActivePdf ? 'drag-over' : ''}`}
          onDragEnter={handleDragPdf}
          onDragLeave={handleDragPdf}
          onDragOver={handleDragPdf}
          onDrop={handleDropPdf}
          onClick={(e) => {
            e.stopPropagation();
            document.getElementById('pdfInput')?.click();
          }}
        >
          <span className="upload-icon">📄</span>
          <p className="upload-text">
            {pdfFile ? `PDF: ${pdfFile.name}` : 'Kliknij lub przeciągnij plik PDF'}
          </p>
          <input
            id="pdfInput"
            type="file"
            accept=".pdf"
            onChange={handlePdfChange}
            className="file-input"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div 
          className={`upload-zone ${dragActiveKey ? 'drag-over' : ''}`}
          onDragEnter={handleDragKey}
          onDragLeave={handleDragKey}
          onDragOver={handleDragKey}
          onDrop={handleDropKey}
          onClick={(e) => {
            e.stopPropagation();
            document.getElementById('keyInput')?.click();
          }}
        >
          <span className="upload-icon">🔑</span>
          <p className="upload-text">
            {publicKeyFile ? `Klucz: ${publicKeyFile.name}` : 'Kliknij lub przeciągnij klucz (.json)'}
          </p>
          <input
            id="keyInput"
            type="file"
            accept=".json"
            onChange={handleKeyChange}
            className="file-input"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      <button
        onClick={handleVerify}
        disabled={loading || !pdfFile || !publicKeyFile}
        className="btn btn--primary btn--large"
      >
        {loading ? '🔄 Weryfikuję...' : '✅ Weryfikuj Podpis'}
      </button>

      {result && (
        <div className={`verification-result ${result.valid ? 'success' : 'error'}`}>
          <div className="result-header">
            <span className="result-icon">{result.valid ? '✅' : '❌'}</span>
            <div>
              <h3 className="result-title">
                {result.valid ? 'Podpis Prawidłowy' : 'Podpis Nieprawidłowy'}
              </h3>
              <p>{result.message}</p>
            </div>
          </div>

          {result.valid && result.signature_info && (
            <div className="result-details">
              <h4>📋 Szczegóły podpisu</h4>
              
              <div className="result-item">
                <span className="result-label">👤 Podpisane przez:</span>
                <span className="result-value">{result.signature_info.signer_name}</span>
              </div>

              <div className="result-item">
                <span className="result-label">📅 Data podpisu:</span>
                <span className="result-value">
                  {new Date(result.signature_info.signed_at).toLocaleString('pl-PL')}
                </span>
              </div>

              <div className="result-item">
                <span className="result-label">📍 Lokalizacja:</span>
                <span className="result-value">
                  {result.signature_info.signer_location || 'Brak'}
                </span>
              </div>

              <div className="result-item">
                <span className="result-label">📧 Kontakt:</span>
                <span className="result-value">
                  {result.signature_info.signer_contact || 'Brak'}
                </span>
              </div>

              <div className="result-item">
                <span className="result-label">💬 Powód:</span>
                <span className="result-value">
                  {result.signature_info.signer_reason || 'Brak'}
                </span>
              </div>

              <div className="result-item">
                <span className="result-label">🔐 Metoda:</span>
                <span className="result-value">{result.signature_info.verification_method}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SignatureVerifier;
