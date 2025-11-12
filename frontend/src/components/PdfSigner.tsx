import React, { useState } from 'react';
import CryptoService from '../services/cryptoService';
import apiService from '../services/apiService';

const PdfSigner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    name: '',
    location: '',
    reason: '',
    contact: '',
  });
  const [keySize, setKeySize] = useState<number>(2048);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setMessage('');
    } else {
      alert('❌ Proszę wybrać plik PDF');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setMessage('');
      } else {
        alert('❌ Proszę wybrać plik PDF');
      }
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSignAndGenerate = async () => {
    if (!file) {
      alert('❌ Wybierz plik PDF');
      return;
    }

    if (!metadata.name || !metadata.location || !metadata.reason) {
      alert('❌ Wypełnij wszystkie wymagane pola metadanych');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // ===== SPRAWDŹ CZY KLUCZE JUŻ ISTNIEJĄ W LOCALSTORAGE =====
      console.log('🔑 Sprawdzam klucze w localStorage...');
      let existingKeys = CryptoService.loadKeys();
      let publicKeyJwk, privateKeyJwk;

      if (existingKeys) {
        console.log('✅ Użyto istniejących kluczy z localStorage');
        setMessage('🔑 Użyto istniejących kluczy z localStorage');
        publicKeyJwk = existingKeys.publicKey;
        privateKeyJwk = existingKeys.privateKey;
      } else {
        // 1. GENERUJ NOWE KLUCZE
        console.log('🔑 Brak kluczy - generuję automatycznie...');
        setMessage('🔑 Generowanie kluczy RSA-PSS...');
        const keyPair = await CryptoService.generateKeyPair(keySize);
        publicKeyJwk = await CryptoService.exportKey(keyPair.publicKey);
        privateKeyJwk = await CryptoService.exportKey(keyPair.privateKey);
        
        // ZAPISZ KLUCZE W LOCALSTORAGE
        CryptoService.saveKeys(
          { publicKey: publicKeyJwk, privateKey: privateKeyJwk },
          keySize
        );
        console.log('✅ Nowe klucze wygenerowane i zapisane w localStorage');
        setMessage('✅ Nowe klucze wygenerowane i zapisane');
      }

      // 2. PRZYGOTUJ FORMULARZ
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        ...metadata,
        filename: file.name,
        keySize: keySize,
      }));

      // 3. WYŚLIJ DO BACKENDU - DOSTANIESZ HASH
      setMessage('📄 Przygotowywanie dokumentu...');
      const prepareResponse = await apiService.prepareSignatureWithMetadata(formData);
      const fileHashBase64 = prepareResponse.file_hash;
      const tempFilePath = prepareResponse.temp_file_path;

      // 4. KONWERTUJ BASE64 → ARRAYBUFFER
      const hashBytes = Uint8Array.from(atob(fileHashBase64), c => c.charCodeAt(0));

      // 5. ZAŁADUJ KLUCZ PRYWATNY
      setMessage('🔐 Podpisywanie dokumentu...');
      const privateKeyObj = await window.crypto.subtle.importKey(
        'jwk',
        privateKeyJwk,
        { name: 'RSA-PSS', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // 6. PODPISZ HASH
      const signature = await CryptoService.signHash(hashBytes.buffer, privateKeyObj);
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

      // 7. WYŚLIJ PODPIS DO BACKENDU
      setMessage('💾 Zapisywanie podpisu w systemie...');
      const embedFormData = new FormData();
      embedFormData.append('temp_file_path', tempFilePath);
      embedFormData.append('signature', signatureBase64);
      embedFormData.append('public_key', JSON.stringify(publicKeyJwk));
      embedFormData.append('metadata', JSON.stringify({
        ...metadata,
        filename: file.name,
        keySize: keySize,
      }));

      const embedResponse = await apiService.embedSignatureToDb(embedFormData);

      // 8. POBIERZ KLUCZ PUBLICZNY
      setMessage('⬇️ Pobieranie klucza publicznego...');
      const publicKeyData = JSON.stringify(
        {
          version: '1.0',
          publicKey: publicKeyJwk,
          keySize: keySize,
          createdAt: new Date().toISOString(),
          description: 'Klucz publiczny do weryfikacji podpisu',
          filename: file.name,
        },
        null,
        2
      );
      downloadFile(publicKeyData, `public_key_${file.name.replace('.pdf', '')}.json`);

      // 9. SUKCES!
      setMessage(`✅ Dokument podpisany! Klucz publiczny pobrany. Podpisany PDF zapisany w systemie jako: ${embedResponse.filename}\n\nKlucze zapisane w localStorage przeglądarki.`);
      setFile(null);
      setMetadata({ name: '', location: '', reason: '', contact: '' });
    } catch (error: any) {
      console.error('❌ Błąd podpisywania:', error);
      setMessage(`❌ Błąd: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Drag & Drop Area */}
      <div
        onClick={() => document.getElementById('fileInput')?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '3px dashed #667eea' : '2px dashed #ccc',
          borderRadius: '10px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? '#f0f4ff' : '#fafafa',
          marginBottom: '20px',
        }}
      >
        <input
          id="fileInput"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
          {file ? `✅ ${file.name}` : 'Przeciągnij plik PDF lub kliknij aby wybrać'}
        </p>
        <p style={{ color: '#999', fontSize: '14px' }}>Obsługiwane formaty: PDF</p>
      </div>

      {/* Metadane */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Imię i Nazwisko *
        </label>
        <input
          type="text"
          value={metadata.name}
          onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
          placeholder="Jan Kowalski"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Lokalizacja *
        </label>
        <input
          type="text"
          value={metadata.location}
          onChange={(e) => setMetadata({ ...metadata, location: e.target.value })}
          placeholder="Warszawa, Polska"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Powód podpisania *
        </label>
        <input
          type="text"
          value={metadata.reason}
          onChange={(e) => setMetadata({ ...metadata, reason: e.target.value })}
          placeholder="Akceptacja dokumentu"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Kontakt (opcjonalnie)
        </label>
        <input
          type="text"
          value={metadata.contact}
          onChange={(e) => setMetadata({ ...metadata, contact: e.target.value })}
          placeholder="email@example.com"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
          }}
        />
      </div>

      {/* Rozmiar klucza */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Rozmiar klucza RSA
        </label>
        <select
          value={keySize}
          onChange={(e) => setKeySize(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
          }}
        >
          <option value={2048}>2048 bitów (standardowy)</option>
          <option value={3072}>3072 bitów (wysoki)</option>
          <option value={4096}>4096 bitów (bardzo wysoki)</option>
        </select>
      </div>

      {/* Przycisk podpisz */}
      <button
        onClick={handleSignAndGenerate}
        disabled={loading || !file}
        style={{
          width: '100%',
          padding: '15px',
          background: loading ? '#ccc' : '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Podpisywanie...' : '✍️ Podpisz dokument (pobierze się klucz publiczny)'}
      </button>

      {/* Status */}
      {message && (
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            background: message.includes('✅') ? '#d4edda' : message.includes('❌') ? '#f8d7da' : '#d1ecf1',
            border: `1px solid ${message.includes('✅') ? '#c3e6cb' : message.includes('❌') ? '#f5c6cb' : '#bee5eb'}`,
            borderRadius: '5px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default PdfSigner;
