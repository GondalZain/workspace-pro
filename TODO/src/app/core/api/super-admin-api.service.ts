import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Company, CompanyAdmin, CompanyListResponse } from '../../models/company.model';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class SuperAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/super-admin/companies`;

  listCompanies() {
    return this.http.get<CompanyListResponse>(this.baseUrl);
  }

  getCompanyById(id: number) {
    return this.http.get<Company>(`${this.baseUrl}/${id}`);
  }

  createCompany(formData: FormData) {
    return this.http.post<{ company: Company; adminUser: any }>(this.baseUrl, formData);
  }

  updateCompany(id: number, formData: FormData) {
    return this.http.put<Company>(`${this.baseUrl}/${id}`, formData);
  }

  updateCompanyStatus(id: number, status: 'active' | 'suspended' | 'pending' | 'rejected', config?: { domain?: string | null; emailDomain?: string | null; title?: string | null; description?: string | null; primaryColor?: string | null; secondaryColor?: string | null }) {
    return this.http.patch<Company>(`${this.baseUrl}/${id}/status`, { status, ...config });
  }

  deleteCompany(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addCompanyAdmin(companyId: number, adminData: { username: string; email: string; originalEmail?: string; password: string; roleId?: number }) {
    return this.http.post<{ admin: CompanyAdmin; admins: CompanyAdmin[] }>(`${this.baseUrl}/${companyId}/admins`, adminData);
  }

  updateCompanyAdmin(companyId: number, adminId: number, adminData: { username?: string; email?: string; originalEmail?: string; password?: string; roleId?: number }) {
    return this.http.put<{ admins: CompanyAdmin[] }>(`${this.baseUrl}/${companyId}/admins/${adminId}`, adminData);
  }

  updateCompanyAdminRole(companyId: number, adminId: number, roleId: number) {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/${companyId}/admins/${adminId}/role`, { roleId });
  }

  deleteCompanyAdmin(companyId: number, adminId: number) {
    return this.http.delete<{ admins: CompanyAdmin[] }>(`${this.baseUrl}/${companyId}/admins/${adminId}`);
  }

  getCompanyStatuses(companyId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/${companyId}/statuses`);
  }

  updateCompanyStatuses(companyId: number, statuses: any[]) {
    return this.http.put<any[]>(`${this.baseUrl}/${companyId}/statuses`, statuses);
  }

  checkCompanyStatusUsage(companyId: number, identifier: string | number) {
    const isNum = typeof identifier === 'number' || /^\d+$/.test(String(identifier));
    const params: Record<string, string> = isNum
      ? { statusId: String(identifier), id: String(identifier) }
      : { name: String(identifier) };
    return this.http.get<{ identifier?: string; slug?: string; taskCount: number; canDelete: boolean }>(
      `${this.baseUrl}/${companyId}/statuses/usage`,
      { params }
    );
  }
}

