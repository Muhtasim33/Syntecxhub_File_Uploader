const API_BASE = '/api';

export const apiCall = async (endpoint, method = 'GET', data = null) => {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (data) {
    // Automatically detect if the payload is FormData
    if (data instanceof FormData) {
      options.body = data; // Lets the browser set multipart/form-data boundary automatically
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
  }

  // Debug log to verify outgoing request headers in browser console
  console.log(`[API Call] ${method} ${endpoint}`, { headers, hasToken: !!token });

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Something went wrong');
    }
    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};