import { API_BASE_URL } from '../../../core/api/api.config';

const UPLOAD_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

export function resolveProjectImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${UPLOAD_BASE_URL}${path}`;
}
