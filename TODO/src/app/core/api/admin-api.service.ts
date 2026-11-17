import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { API_ROUTES } from './api.routes';
import { User } from '../auth/auth.service';

export interface Permission { id: number; name: string; description: string; }
export interface Role { id: number; name: string; description: string; permissions: string[]; }

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${API_BASE_URL}${API_ROUTES.auth.users}`;

  listUsers() {
    return this.http.get<User[]>(this.usersUrl);
  }

  createUser(data: { username: string; email: string; password: string; roleId?: number; profileImage?: File | null }) {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (data.roleId) formData.append('roleId', String(data.roleId));
    if (data.profileImage) formData.append('profileImage', data.profileImage);
    return this.http.post<User>(this.usersUrl, formData);
  }

  getUserById(userId: number) {
    return this.http.get<User>(`${API_BASE_URL}${API_ROUTES.auth.userById(userId)}`);
  }

  setRole(userId: number, roleId: number) {
    return this.http.patch<User>(`${API_BASE_URL}${API_ROUTES.auth.role(userId)}`, { roleId });
  }

  updateUser(userId: number, username: string, email: string, password?: string, profileImage?: File | null) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (profileImage) formData.append('profileImage', profileImage);
    return this.http.put<User>(`${API_BASE_URL}${API_ROUTES.auth.userById(userId)}`, formData);
  }

  listRoles() {
    return this.http.get<Role[]>(`${API_BASE_URL}${API_ROUTES.auth.roles}`);
  }

  listPermissions() {
    return this.http.get<Permission[]>(`${API_BASE_URL}${API_ROUTES.auth.permissions}`);
  }

  createRole(name: string, description: string, permissions: string[]) {
    return this.http.post<Role>(`${API_BASE_URL}${API_ROUTES.auth.roles}`, { name, description, permissions });
  }

  updateRole(roleId: number, name: string, description: string, permissions: string[]) {
    return this.http.put<Role>(`${API_BASE_URL}${API_ROUTES.auth.roleById(roleId)}`, { name, description, permissions });
  }

  deleteRole(roleId: number) {
    return this.http.delete<void>(`${API_BASE_URL}${API_ROUTES.auth.roleById(roleId)}`);
  }
}
