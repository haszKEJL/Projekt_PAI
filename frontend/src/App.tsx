import { useState } from 'react';
import KeyGenerator from './components/KeyGenerator';
import PdfUploader from './components/PdfUploader';
import SignatureVerifier from './components/SignatureVerifier';
import './App.css';

function App() {
  const [tab, setTab] = useState('keys');

  return (
    <div className="App">
      <header className="app-header">
        <h1>📄 PDF Digital Signature</h1>
        <p>Bezpieczne podpisywanie i weryfikacja dokumentów</p>
      </header>

      <div className="tabs">
        <button 
          onClick={() => setTab('keys')} 
          className={`tab-button ${tab === 'keys' ? 'active' : ''}`}
        >
          🔑 Zarządzanie Kluczami
        </button>
        <button 
          onClick={() => setTab('sign')} 
          className={`tab-button ${tab === 'sign' ? 'active' : ''}`}
        >
          ✍️ Podpisywanie PDF
        </button>
        <button 
          onClick={() => setTab('verify')} 
          className={`tab-button ${tab === 'verify' ? 'active' : ''}`}
        >
          🔍 Weryfikacja Podpisu
        </button>
      </div>

      <div className="content-card">
        {tab === 'keys' && <KeyGenerator />}
        {tab === 'sign' && <PdfUploader />}
        {tab === 'verify' && <SignatureVerifier />}
      </div>

      <footer className="app-footer mt-3 text-center">
        <small className="text-muted">© 2025 Projekt PAI • Grupa 5</small>
      </footer>
    </div>
  );
}

export default App;
