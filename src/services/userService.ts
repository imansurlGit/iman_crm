import { api, setTokens } from './api';

export interface CurrentUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string | null;
  role_display: string;
  division: number | null;
  division_name: string | null;
  profile_picture: string | null;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export async function login(email: string, password: string): Promise<void> {
  const response = await api.post<{ access: string; refresh: string }>('/auth/token/', {
    email,
    password,
  });
  setTokens(response.data);
}

export function logout(): void {
  setTokens(null);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>('/users/me/');
  return response.data;
}

export async function updateCurrentUser(data: Partial<CurrentUser> | FormData): Promise<CurrentUser> {
  const response = await api.patch<CurrentUser>('/users/me/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/users/change-password/', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function listUsers(): Promise<CurrentUser[]> {
  const response = await api.get<CurrentUser[]>('/users/');
  return response.data;
}

export async function createUser(data: FormData): Promise<CurrentUser> {
  const response = await api.post<CurrentUser>('/users/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateUser(id: number, data: FormData): Promise<CurrentUser> {
  const response = await api.patch<CurrentUser>(`/users/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}/`);
}

export interface RoleOption {
  value: string;
  label: string;
}

export async function listRoles(): Promise<RoleOption[]> {
  const response = await api.get<RoleOption[]>('/users/roles/');
  return response.data;
}

export async function listCommercials(): Promise<CurrentUser[]> {
  const response = await api.get<CurrentUser[]>('/users/commercials/');
  return response.data;
}

export async function listDivisionMembers(divisionId: number): Promise<CurrentUser[]> {
  const response = await api.get<CurrentUser[]>('/users/by-division/', { params: { division: divisionId } });
  return response.data;
}

/** Annuaire des collègues actifs — ouvert à tout utilisateur authentifié,
 * contrairement à `listUsers()` (réservé à la gestion des comptes). */
export async function listDirectory(): Promise<CurrentUser[]> {
  const response = await api.get<CurrentUser[]>('/users/directory/');
  return response.data;
}
