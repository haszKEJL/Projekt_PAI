import axios from 'axios';

// ✅ ZMIEŃ URL NA RENDER
const API_BASE_URL = 'https://projekt-pai-gr5.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

class ApiService {
  async prepareSignature(formData: FormData): Promise<any> {
    const response = await apiClient.post('/signature/prepare-signature', formData, {
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
