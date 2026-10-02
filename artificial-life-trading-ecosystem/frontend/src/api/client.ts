const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export function getPopulation() {
  return request('/api/population');
}

export function getGenerationMetrics() {
  return request('/api/population/generations');
}

export function getForecasts() {
  return request('/api/forecasts');
}

export function getSingleAgent() {
  return request('/api/single-agent');
}

export function getSummary() {
  return request('/api/summary');
}