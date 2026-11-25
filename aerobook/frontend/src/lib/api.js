/* ========================================
   API Configuration
======================================== */

export const API = (
  import.meta.env.VITE_API_URL ||
  (
    import.meta.env.PROD
      ? '/api'
      : 'http://localhost:5000/api'
  )
).replace(/\/+$/, '');

/* ========================================
   API Request Handler
======================================== */

export async function request(path, options = {}) {

  let res;

  try {

    res = await fetch(`${API}${path}`, {
      ...options,

      credentials: 'include',

      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

  } catch {

    throw new Error(
      'Cannot connect to AeroBook server. Please try again.'
    );

  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {

    throw new Error(
      data.message || 'Request failed'
    );

  }

  return data;
}