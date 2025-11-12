import React, { useState } from 'react';
import CryptoService from '../services/cryptoService';
import apiService from '../services/apiService';

const PdfUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    name: '',
    location: '',
    reason: '',
    contact: '',
  });
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [keySize] = useState<number>(2048);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('❌ Proszę wybrać plik PDF');
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        alert('❌ Proszę wybrać plik PDF');
      }
    }
  };

  const handleSign = async () => {
    if (!file) {
      alert('❌ Wybierz plik PDF!');
      return;
    }

    if (!metadata.name.trim()) {
      alert('❌ Podaj swoje imię i nazwisko!');
      return;
    }

    setLoading(true);
    
    // DEBUG: Sprawdź localStorage przed rozpoczęciem
    const storageTest = localStorage.getItem('pdf-signature-keys');
    alert(`🔍 DEBUG START\nKlucze w localStorage: ${storageTest ? 'TAK' : 'NIE'}`);
    
    try {
      // 1. SPRAWDŹ CZY KLUCZE ISTNIEJĄ, JEŚLI NIE - WYGENERUJ
      let keys = CryptoService.loadKeys();
      
      if (!keys) {
        alert('🔑 Generuję nowe klucze RSA-PSS 2048 bit...');
        
        const keyPair = await CryptoService.generateKeyPair(keySize);
        const exportedPublic = await CryptoService.exportKey(keyPair.publicKey);
        const exportedPrivate = await CryptoService.exportKey(keyPair.privateKey);
        
        CryptoService.saveKeys(
          { publicKey: exportedPublic, privateKey: exportedPrivate },
          keySize
        );
        
        // Sprawdź czy zapisało się
        const checkAfterSave = localStorage.getItem('pdf-signature-keys');
        alert(`✅ Klucze wygenerowane!\nZapisane: ${checkAfterSave ? 'TAK' : 'NIE (BŁĄD!)'}`);
        
        keys = CryptoService.loadKeys();
        
        if (!keys) {
          throw new Error('❌ Błąd zapisywania kluczy do localStorage!\n\nCzy localStorage jest włączony w przeglądarce?');
        }
      } else {
        alert('✅ Użyto istniejących kluczy z localStorage');
      }

      // 2. Przygotuj dokument do podpisu
      alert('📤 Wysyłam PDF do backendu...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        ...metadata,
        filename: file.name,
        keySize: keys.keySize,
      }));

      const prepareResponse = await apiService.prepareSignatureWithMetadata(formData);

      // 3. Podpisz hash kluczem prywatnym
      alert('🔐 Podpisuję hash kluczem prywatnym...');
      const fileHashBase64 = prepareResponse.file_hash;
      const hashBytes = Uint8Array.from(atob(fileHashBase64), c => c.charCodeAt(0));

      const privateKeyObj = await window.crypto.subtle.importKey(
        'jwk',
        keys.privateKey,
        { name: 'RSA-PSS', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await CryptoService.signHash(hashBytes.buffer, privateKeyObj);

      // 4. Osadź podpis w PDF i zapisz w bazie
      alert('💾 Zapisuję podpisany PDF w bazie danych...');
      const embedData = new FormData();
      embedData.append('temp_file_path', prepareResponse.temp_file_path);
      embedData.append('signature', CryptoService.arrayBufferToBase64(signature));
      embedData.append('public_key', JSON.stringify(keys.publicKey));
      embedData.append('metadata', JSON.stringify({
        ...metadata,
        filename: file.name,
        keySize: keys.keySize,
      }));

      const embedResult = await apiService.embedSignatureToDb(embedData);

      alert(`✅ SUKCES!\n\n${embedResult.message || 'Dokument został pomyślnie podpisany!'}\n\nKlucze zapisane w localStorage przeglądarki.`);
      
      setFile(null);
      setMetadata({ name: '', location: '', reason: '', contact: '' });
    } catch (error: any) {
      alert(`❌ BŁĄD PODPISYWANIA:\n\n${error.message || 'Nieznany błąd'}\n\n${error.stack || ''}`);
    } finally {
      setLoading(false);
      
      // DEBUG: Sprawdź localStorage po zakończeniu
      const finalCheck = localStorage.getItem('pdf-signature-keys');
      alert(`🔍 DEBUG END\nKlucze w localStorage: ${finalCheck ? 'TAK ✅' : 'NIE ❌'}`);
    }
  };

  return (
    <div className="pdf-uploader">
      <h2>✍️ Podpisywanie Dokumentu PDF</h2>

      <div className="info-box">
        <h3>ℹ️ Jak podpisać dokument?</h3>
        <ul>
          <li>Wybierz plik PDF do podpisania</li>
          <li>Wypełnij dane osoby podpisującej</li>
          <li>Kliknij "Podpisz dokument"</li>
          <li>Klucze zostaną wygenerowane automatycznie przy pierwszym podpisie</li>
          <li>Pobierz podpisany plik w panelu administratora</li>
        </ul>
      </div>

      <div 
        className={`upload-zone ${dragActive ? 'drag-over' : ''}`}
        onClick={() => document.getElementById('fileInput')?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <span className="upload-icon">📄</span>
        <p className="upload-text">
          {file ? `Wybrano: ${file.name}` : 'Kliknij lub przeciągnij plik PDF'}
        </p>
        <p className="upload-hint">Obsługiwane formaty: PDF</p>
        <input
          id="fileInput"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="file-input"
        />
      </div>

      {file && (
        <div className="file-info">
          <h4>📋 Informacje o pliku</h4>
          <p><strong>Nazwa:</strong> {file.name}</p>
          <p><strong>Rozmiar:</strong> {(file.size / 1024).toFixed(2)} KB</p>
        </div>
      )}

      <div className="metadata-form">
        <h3>👤 Dane osoby podpisującej</h3>
        
        <div className="form-group">
          <label>Imię i nazwisko *</label>
          <input
            type="text"
            value={metadata.name}
            onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
            placeholder="Jan Kowalski"
          />
        </div>

        <div className="form-group">
          <label>Lokalizacja</label>
          <input
            type="text"
            value={metadata.location}
            onChange={(e) => setMetadata({ ...metadata, location: e.target.value })}
            placeholder="Warszawa, Polska"
          />
        </div>

        <div className="form-group">
          <label>Powód podpisu</label>
          <input
            type="text"
            value={metadata.reason}
            onChange={(e) => setMetadata({ ...metadata, reason: e.target.value })}
            placeholder="Zatwierdzenie dokumentu"
          />
        </div>

        <div className="form-group">
          <label>Kontakt</label>
          <input
            type="text"
            value={metadata.contact}
            onChange={(e) => setMetadata({ ...metadata, contact: e.target.value })}
            placeholder="jan.kowalski@example.com"
          />
        </div>
      </div>

      <button
        onClick={handleSign}
        disabled={loading || !file}
        className="btn btn--success btn--large"
      >
        {loading ? '🔄 Podpisuję...' : '✍️ Podpisz Dokument'}
      </button>
    </div>
  );
};

export default PdfUploader;
