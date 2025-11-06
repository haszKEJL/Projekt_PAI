import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiService = {
  // Przygotowuje plik do podpisania (z metadanymi)
  prepareSignatureWithMetadata: async (formData: FormData) => {
    const response = await axios.post(
      `${API_BASE_URL}/signature/prepare-signature-with-metadata`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Osadza podpis w PDF
  embedSignature: async (formData: FormData) => {
    const response = await axios.post(
      `${API_BASE_URL}/signature/embed-signature`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      }
    );
    return response.data;
  },

  // Weryfikuje podpis - DODANE!
  verifySignature: async (formData: FormData) => {
    const response = await axios.post(
      `${API_BASE_URL}/signature/verify-signature`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};

export default apiService;
