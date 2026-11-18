export interface CompanyAdmin {
  id: number;
  username: string;
  email: string;
  originalEmail?: string | null;
  profileImagePath?: string | null;
  roleId?: number;
  roleName?: string;
  roleDescription?: string;
  permissions?: string[];
  createdAt?: string;
}

export interface Company {
  id: number;
  name: string;
  title: string;
  description: string;
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  emailDomain?: string | null;
  domain?: string | null;
  status: 'active' | 'suspended' | 'pending' | 'rejected';
  planId?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  totalUsers: number;
  totalAdmins: number;
  admins: CompanyAdmin[];
  adminUsername: string;
  adminEmail: string;
  adminOriginalEmail?: string | null;
  createdAt: string;
}

export interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  pendingCompanies?: number;
  totalAdmins: number;
  totalUsers: number;
}

export interface CompanyListResponse {
  companies: Company[];
  stats: CompanyStats;
}
