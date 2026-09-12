import { auth } from '../lib/firebase';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User is not authenticated');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.message || 'Something went wrong',
    );
  }

  return response.json();
}

export async function getCurrentUser() {
  return apiRequest('/users/me');
}