import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SignatureRecord {
  id: string;
  file_hash: string;
  signature_preview: string;
  signer_name: string;
  signer_location: string;
  signer_reason: string;
  signer_contact: string;
  original_filename: string;
  created_at: string;
  created_at_formatted: string;
}

interface DatabaseInfo {
  database: string;
  table_name: string;
  total_records: number;
  latest_signature_date: string | null;
  columns: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

const DatabaseViewer: React.FC = () => {
  const [records, setRecords] = useState<SignatureRecord[]>([]);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    fetchData();
    fetchDatabaseInfo();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/signatures`);
      setRecords(response.data.records);
    } catch (error) {
      console.error('Error fetching signatures:', error);
      alert('❌ Błąd podczas pobierania danych z bazy');
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/database/info`);
      setDbInfo(response.data);
    } catch (error) {
      console.error('Error fetching database info:', error);
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/admin/signatures/${id}`);
      setSelectedRecord(response.data);
      setShowDetails(true);
    } catch (error) {
      alert('❌ Błąd podczas pobierania szczegółów');
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten rekord?')) return;

    try {
      await axios.delete(`${API_URL}/admin/signatures/${id}`);
      alert('✅ Rekord usunięty');
      fetchData();
    } catch (error) {
      alert('❌ Błąd podczas usuwania rekordu');
    }
  };

  return (
    <div className="database-viewer">
      <h2>🗄️ Panel Administracyjny Bazy Danych</h2>

      {/* Database Info */}
      {dbInfo && (
        <div className="db-info-section">
          <h3>📊 Informacje o bazie danych</h3>
          <div className="db-stats">
            <div className="stat-card">
              <span className="stat-icon">💾</span>
              <div>
                <div className="stat-value">{dbInfo.database}</div>
                <div className="stat-label">Typ bazy</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📋</span>
              <div>
                <div className="stat-value">{dbInfo.table_name}</div>
                <div className="stat-label">Nazwa tabeli</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📝</span>
              <div>
                <div className="stat-value">{dbInfo.total_records}</div>
                <div className="stat-label">Liczba rekordów</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🕒</span>
              <div>
                <div className="stat-value">
                  {dbInfo.latest_signature_date
                    ? new Date(dbInfo.latest_signature_date).toLocaleDateString('pl-PL')
                    : 'Brak'}
                </div>
                <div className="stat-label">Ostatni podpis</div>
              </div>
            </div>
          </div>

          <div className="columns-info">
            <h4>🏛️ Struktura tabeli ({dbInfo.columns.length} kolumn)</h4>
            <div className="columns-grid">
              {dbInfo.columns.map((col) => (
                <div key={col.name} className="column-card">
                  <div className="column-name">{col.name}</div>
                  <div className="column-type">{col.type}</div>
                  <div className="column-desc">{col.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="records-section">
        <div className="section-header">
          <h3>📄 Rekordy w bazie danych ({records.length})</h3>
          <button onClick={fetchData} className="btn btn--secondary" disabled={loading}>
            {loading ? '🔄 Odświeżanie...' : '🔄 Odśwież'}
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p>Ładowanie danych...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h4>Brak podpisów w bazie danych</h4>
            <p>Podpisane dokumenty pojawią się tutaj</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="records-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nazwa pliku</th>
                  <th>Osoba podpisująca</th>
                  <th>Lokalizacja</th>
                  <th>Powód</th>
                  <th>Data utworzenia</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <code className="id-cell">{record.id.substring(0, 8)}...</code>
                    </td>
                    <td>{record.original_filename}</td>
                    <td>{record.signer_name}</td>
                    <td>{record.signer_location}</td>
                    <td>{record.signer_reason}</td>
                    <td>{record.created_at_formatted}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => viewDetails(record.id)}
                          className="btn-icon"
                          title="Pokaż szczegóły"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="btn-icon btn-icon--danger"
                          title="Usuń rekord"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Szczegóły rekordu</h3>
              <button onClick={() => setShowDetails(false)} className="modal-close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <label>ID:</label>
                <code>{selectedRecord.id}</code>
              </div>
              <div className="detail-group">
                <label>Hash pliku:</label>
                <code className="hash-display">{selectedRecord.file_hash}</code>
              </div>
              <div className="detail-group">
                <label>Podpis cyfrowy:</label>
                <code className="hash-display">{selectedRecord.signature_data}</code>
              </div>
              <div className="detail-group">
                <label>Klucz publiczny (JWK):</label>
                <pre className="json-display">
                  {JSON.stringify(JSON.parse(selectedRecord.public_key_jwk), null, 2)}
                </pre>
              </div>
              <div className="detail-group">
                <label>Osoba podpisująca:</label>
                <span>{selectedRecord.signer_name || 'Brak'}</span>
              </div>
              <div className="detail-group">
                <label>Lokalizacja:</label>
                <span>{selectedRecord.signer_location || 'Brak'}</span>
              </div>
              <div className="detail-group">
                <label>Powód:</label>
                <span>{selectedRecord.signer_reason || 'Brak'}</span>
              </div>
              <div className="detail-group">
                <label>Kontakt:</label>
                <span>{selectedRecord.signer_contact || 'Brak'}</span>
              </div>
              <div className="detail-group">
                <label>Nazwa pliku:</label>
                <span>{selectedRecord.original_filename || 'Brak'}</span>
              </div>
              <div className="detail-group">
                <label>Data utworzenia:</label>
                <span>{new Date(selectedRecord.created_at).toLocaleString('pl-PL')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseViewer;
