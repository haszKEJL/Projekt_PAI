import { useState } from 'react';
import './App.css';
import KeyGenerator from './components/KeyGenerator';
import PdfUploader from './components/PdfUploader';
import SignatureVerifier from './components/SignatureVerifier';
import DatabaseViewer from './components/DatabaseViewer';

type TabType = 'keys' | 'sign' | 'verify' | 'database';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('keys');

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <span className="logo-icon">🔐</span>
            <div>
              <h1>System Podpisów Cyfrowych PDF</h1>
              <p className="subtitle">Bezpieczne podpisywanie i weryfikacja dokumentów</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tab-navigation">
        <div className="tab-container">
          <button
            className={`tab-button ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('keys')}
          >
            <span className="tab-icon">🔑</span>
            <span className="tab-label">Klucze</span>
          </button>

          <button
            className={`tab-button ${activeTab === 'sign' ? 'active' : ''}`}
            onClick={() => setActiveTab('sign')}
          >
            <span className="tab-icon">✍️</span>
            <span className="tab-label">Podpisz</span>
          </button>

          <button
            className={`tab-button ${activeTab === 'verify' ? 'active' : ''}`}
            onClick={() => setActiveTab('verify')}
          >
            <span className="tab-icon">✅</span>
            <span className="tab-label">Weryfikuj</span>
          </button>

          <button
            className={`tab-button ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
          >
            <span className="tab-icon">🗄️</span>
            <span className="tab-label">Baza Danych</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        <div className="content-wrapper">
          {/* Tab Content - Keys */}
          {activeTab === 'keys' && (
            <div className="tab-content fade-in">
              <KeyGenerator />
            </div>
          )}

          {/* Tab Content - Sign */}
          {activeTab === 'sign' && (
            <div className="tab-content fade-in">
              <PdfUploader />
            </div>
          )}

          {/* Tab Content - Verify */}
          {activeTab === 'verify' && (
            <div className="tab-content fade-in">
              <SignatureVerifier />
            </div>
          )}

          {/* Tab Content - Database */}
          {activeTab === 'database' && (
            <div className="tab-content fade-in">
              <DatabaseViewer />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>ℹ️ O Systemie</h4>
            <p>
              System wykorzystuje kryptografię RSA-PSS do tworzenia i weryfikacji
              podpisów cyfrowych dokumentów PDF.
            </p>
          </div>

          <div className="footer-section">
            <h4>🔒 Bezpieczeństwo</h4>
            <ul>
              <li>Klucze generowane lokalnie w przeglądarce</li>
              <li>Klucz prywatny nigdy nie opuszcza urządzenia</li>
              <li>Podpisy weryfikowane przez backend</li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>📚 Jak używać</h4>
            <ol>
              <li>Wygeneruj parę kluczy (zakładka Klucze)</li>
              <li>Podpisz dokument PDF (zakładka Podpisz)</li>
              <li>Zweryfikuj podpis (zakładka Weryfikuj)</li>
              <li>Sprawdź bazę danych (zakładka Baza Danych)</li>
            </ol>
          </div>

          <div className="footer-section">
            <h4>⚙️ Technologie</h4>
            <div className="tech-stack">
              <span className="tech-badge">React</span>
              <span className="tech-badge">TypeScript</span>
              <span className="tech-badge">FastAPI</span>
              <span className="tech-badge">SQLite</span>
              <span className="tech-badge">Web Crypto API</span>
              <span className="tech-badge">RSA-PSS</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 System Podpisów Cyfrowych PDF | Projekt PAI</p>
          <p className="footer-note">
            🛡️ Wszystkie operacje kryptograficzne wykonywane lokalnie w przeglądarce
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
