declare global {
	interface Window {
		__env?: {
			API_BASE_URL?: string;
			SUPERADMIN_SUBDOMAIN?: string;
			SUPERADMIN_DOMAIN?: string;
			BASE_DOMAIN?: string;
			STRIPE_PUBLISHABLE_KEY?: string;
		};
	}
}

export const API_BASE_URL = window.__env?.API_BASE_URL ?? 'http://localhost:5000/api';
export const STRIPE_PUBLISHABLE_KEY = window.__env?.STRIPE_PUBLISHABLE_KEY ?? '';
