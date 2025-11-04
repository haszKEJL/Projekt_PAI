import axios from 'axios';

// Klient HTTP do komunikacji z backendem FastAPI
// W razie potrzeby możesz zmienić URL na lokalny (np. http://localhost:8000/api)
const API_BASE_URL = 'https://projekt-pai-gr5.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

class ApiService {
  /**
   * Wysyła plik PDF do tymczasowego zapisu i wyliczenia hash-u
   * Zwraca: { temp_file_path, file_hash, original_filename }
   */
  async prepareSignature(formData: FormData): Promise<any> {
    const response = await apiClient.post('/signature/prepare-signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /** Przesyła podpis + klucz publiczny + metadane i zwraca plik PDF */
  async embedSignature(data: any): Promise<Blob> {
    const response = await apiClient.post('/signature/embed-signature', data, {
      responseType: 'blob',
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /** Weryfikuje podpis z wykorzystaniem dostarczonego klucza publicznego */
  async verifySignatureManual(formData: FormData): Promise<any> {
    const response = await apiClient.post('/signature/verify-signature-manual', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

export default new ApiService();
