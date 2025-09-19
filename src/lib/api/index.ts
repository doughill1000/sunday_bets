// A generic base function to handle all API calls
async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'content-type': 'application/json'
    }
  };

  const res = await fetch(path, { ...defaultOptions, ...options });

  if (!res.ok) {
    // Try to parse the error body, but have a fallback
    const errorBody = await res.json().catch(() => ({ reason: res.statusText }));
    // Create a custom error object to preserve status
    const error = new Error(errorBody.reason ?? 'API request failed');
    (error as any).status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}

export function post<T>(path: string, body: object = {}): Promise<T> {
  return apiCall<T>(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

// New helper for DELETE requests
export function del<T>(path: string): Promise<T> {
  return apiCall<T>(path, {
    method: 'DELETE'
  });
}
