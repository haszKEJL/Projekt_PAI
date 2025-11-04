import axios from 'axios';

//const API_BASE_URL = 'http://localhost:8000/api';
const API_BASE_URL = 'https://projekt-pai-gr5.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

class ApiService {
  async prepareSignatureWithMetadata(formData: FormData): Promise<any> {
    const response = await apiClient.post('/signature/prepare-signature-with-metadata', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async embedSignature(data: any): Promise<Blob> {
    const response = await apiClient.post('/signature/embed-signature', data, {
      responseType: 'blob',
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async verifySignatureManual(formData: FormData): Promise<any> {
    const response = await apiClient.post('/signature/verify-signature-manual', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

export default new ApiService();
