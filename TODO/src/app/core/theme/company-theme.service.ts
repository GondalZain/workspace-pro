import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CompanyThemeService {

  applyCompanyTheme(primaryColor: string = '#0f766e', secondaryColor: string = '#ffffff'): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const prim = primaryColor?.trim() || '#0f766e';
    const sec = secondaryColor?.trim() || '#ffffff';

    // Core Brand Tokens
    root.style.setProperty('--color-role-accent-10', prim);
    root.style.setProperty('--primary-color', prim);
    root.style.setProperty('--brand-primary', prim);
    root.style.setProperty('--accent', prim);

    root.style.setProperty('--color-role-accent-secondary', sec);
    root.style.setProperty('--secondary-color', sec);
    root.style.setProperty('--brand-secondary', sec);

    // Hover and Darker Shades
    const hoverColor = `color-mix(in srgb, ${prim} 85%, #000000)`;
    const darkColor = `color-mix(in srgb, ${prim} 75%, #000000)`;
    root.style.setProperty('--accent-color-hover', hoverColor);
    root.style.setProperty('--brand-primary-hover', hoverColor);
    root.style.setProperty('--brand-primary-dark', darkColor);

    // Soft Tints and Borders
    const softColor = `color-mix(in srgb, ${prim} 12%, #ffffff)`;
    const borderColor = `color-mix(in srgb, ${prim} 25%, #ffffff)`;
    const glowColor = `color-mix(in srgb, ${prim} 35%, transparent)`;

    root.style.setProperty('--accent-color-soft', softColor);
    root.style.setProperty('--brand-primary-soft', softColor);
    root.style.setProperty('--soft', softColor);
    root.style.setProperty('--color-role-accent-tint-soft', `color-mix(in srgb, ${prim} 10%, transparent)`);

    root.style.setProperty('--accent-color-border', borderColor);
    root.style.setProperty('--brand-primary-border', borderColor);
    root.style.setProperty('--border-focus', prim);
    root.style.setProperty('--brand-primary-glow', glowColor);
  }

  resetDefaultTheme(): void {
    this.applyCompanyTheme('#0f766e', '#ffffff');
  }
}
