import React, { useState } from 'react';
import CryptoService from '../services/cryptoService';
import apiService from '../services/apiService';

// Komponent: Podpisywanie pliku PDF
// Przepływ:
// 1) Backend przygotowuje plik i zwraca ścieżkę tymczasową (+hash pliku)
// 2) Front liczy hash lokalnie i podpisuje go kluczem prywatnym (Web Crypto)
// 3) Backend zapisuje podpis i metadane, zwraca PDF (taki sam plik) do pobrania

const PdfUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    name: '',
    location: '',
    reason: '',
    contact: '',
  });
  const [loading, setLoading] = useState(false);

  // Waliduje typ pliku i zapamiętuje wybrany PDF
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('❌ Proszę wybrać plik PDF');
    }
  };

  // Główna akcja podpisywania dokumentu
  const handleSign = async () => {
    if (!file) {
      alert('❌ Wybierz plik PDF!');
      return;
    }

    const keys = CryptoService.loadKeys();
    if (!keys) {
      alert('❌ Najpierw wygeneruj klucze w zakładce "Zarządzanie Kluczami"!');
      return;
    }

    if (!metadata.name.trim()) {
      alert('❌ Podaj swoje imię i nazwisko!');
      return;
    }

    setLoading(true);

    try {
      // 1) Przygotuj plik do podpisu w backendzie (zapisz tymczasowo)
      const formData = new FormData();
      formData.append('file', file);
      const prepareResponse = await apiService.prepareSignature(formData);

      // 2) Oblicz hash pliku i podpisz go kluczem prywatnym
      const fileHash = await CryptoService.calculateFileHash(file);
      const privateKeyObj = await window.crypto.subtle.importKey(
        'jwk',
        keys.privateKey,
        { name: 'RSA-PSS', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await CryptoService.signHash(fileHash, privateKeyObj);

      // 3) Doślij podpis, klucz publiczny i metadane do backendu
      const embedData = new FormData();
      embedData.append('temp_file_path', prepareResponse.temp_file_path);
      embedData.append('signature', CryptoService.arrayBufferToBase64(signature));
      embedData.append('public_key', JSON.stringify(keys.publicKey));
      embedData.append('metadata', JSON.stringify({
        ...metadata,
        filename: file.name,
      }));

      const signedBlob = await apiService.embedSignature(embedData);

      // 4) Pobierz plik (nazwa_zmieniona_na _signed.pdf)
      const url = URL.createObjectURL(signedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '_signed.pdf');
      a.click();
      URL.revokeObjectURL(url);

      alert('✅ Dokument został pomyślnie podpisany!');
      
      // Reset
      setFile(null);
      setMetadata({ name: '', location: '', reason: '', contact: '' });
    } catch (error: any) {
      alert(`❌ Błąd: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>✍️ Podpisywanie Dokumentu PDF</h2>

      <div className="info-box">
        <h3>📝 Instrukcja</h3>
        <ol>
          <li>Wgraj dokument PDF który chcesz podpisać</li>
          <li>Wypełnij metadane (kto, gdzie, dlaczego)</li>
          <li>Kliknij "Podpisz PDF" - podpisany plik zostanie pobrany automatycznie</li>
        </ol>
      </div>

      <div className="form-group">
        <label className="form-label">📄 Wybierz Dokument PDF</label>
        <div className={`file-upload-wrapper`}>
          <label className={`file-upload-label ${file ? 'has-file' : ''}`}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
            />
            <span>{file ? `✅ ${file.name}` : '📁 Kliknij aby wybrać plik PDF'}</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">👤 Imię i Nazwisko *</label>
        <input
          type="text"
          placeholder="Jan Kowalski"
          value={metadata.name}
          onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label className="form-label">📍 Lokalizacja</label>
        <input
          type="text"
          placeholder="Warszawa, Polska"
          value={metadata.location}
          onChange={(e) => setMetadata({ ...metadata, location: e.target.value })}
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label className="form-label">💬 Powód Podpisania</label>
        <input
          type="text"
          placeholder="Akceptacja dokumentu"
          value={metadata.reason}
          onChange={(e) => setMetadata({ ...metadata, reason: e.target.value })}
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label className="form-label">📧 Kontakt (email/telefon)</label>
        <input
          type="text"
          placeholder="jan.kowalski@example.com"
          value={metadata.contact}
          onChange={(e) => setMetadata({ ...metadata, contact: e.target.value })}
          className="form-control"
        />
      </div>

      <button 
        onClick={handleSign} 
        disabled={loading || !file} 
        className="btn btn--primary"
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Podpisuję dokument...
          </>
        ) : (
          <>✍️ Podpisz PDF</>
        )}
      </button>
    </div>
  );
};

export default PdfUploader;
