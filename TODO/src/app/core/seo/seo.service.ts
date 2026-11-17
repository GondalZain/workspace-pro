import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
  structuredData?: Record<string, any> | Array<Record<string, any>>;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /**
   * Dynamically gets the production origin or fallback.
   */
  getBaseUrl(): string {
    if (typeof window !== 'undefined' && window.__env?.BASE_DOMAIN) {
      const baseDomain = window.__env.BASE_DOMAIN.trim().replace(/^https?:\/\//, '');
      return `https://${baseDomain}`;
    }
    if (typeof window !== 'undefined' && window.location) {
      // If served under a sub-path like http://localhost/todo/ or Apache subfolder, respect baseURI / pathname base
      const baseEl = this.document.querySelector('base');
      const baseHref = baseEl?.getAttribute('href') || '/';
      const origin = window.location.origin;
      if (baseHref !== '/' && !baseHref.startsWith('http')) {
        const cleanBase = baseHref.replace(/^\/|\/$/g, '');
        return cleanBase ? `${origin}/${cleanBase}` : origin;
      }
      // Also check if current path starts with a known directory prefix in localhost (e.g. /todo)
      const pathname = window.location.pathname;
      const match = pathname.match(/^(\/[^/]+)\//);
      if (match && (pathname.startsWith('/todo') || pathname.startsWith('/TODO'))) {
        return `${origin}${match[1]}`;
      }
      return origin;
    }
    return 'https://workspacepro.com';
  }

  /**
   * Applies SEO title, standard meta, OpenGraph, Twitter cards, canonical link, and JSON-LD structured data.
   */
  setPageSeo(config: SeoConfig): void {
    const origin = this.getBaseUrl();
    const cleanPath = config.canonicalPath ? (config.canonicalPath.startsWith('/') ? config.canonicalPath : `/${config.canonicalPath}`) : '';
    const canonicalUrl = `${origin}${cleanPath}`;
    const ogImage = config.ogImage || `${origin}/favicon.ico`;

    // 1. Page Title
    this.titleService.setTitle(config.title);

    // 2. Standard Meta Tags
    this.metaService.updateTag({ name: 'description', content: config.description });
    this.metaService.updateTag({
      name: 'robots',
      content: config.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    });

    // 3. Open Graph (Facebook, LinkedIn, Slack, etc.)
    this.metaService.updateTag({ property: 'og:site_name', content: 'Workspace Pro' });
    this.metaService.updateTag({ property: 'og:title', content: config.title });
    this.metaService.updateTag({ property: 'og:description', content: config.description });
    this.metaService.updateTag({ property: 'og:type', content: config.ogType || 'website' });
    this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
    this.metaService.updateTag({ property: 'og:image', content: ogImage });

    // 4. Twitter / X Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: config.title });
    this.metaService.updateTag({ name: 'twitter:description', content: config.description });
    this.metaService.updateTag({ name: 'twitter:image', content: ogImage });

    // 5. Canonical Link tag
    this.setCanonicalUrl(canonicalUrl);

    // 6. JSON-LD Structured Data
    if (config.structuredData) {
      this.setStructuredData(config.structuredData);
    }
  }

  /**
   * Updates or creates the <link rel="canonical"> tag in <head>.
   */
  private setCanonicalUrl(url: string): void {
    if (!this.document) return;
    let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Injects or updates script[type="application/ld+json"] in <head>.
   */
  private setStructuredData(data: Record<string, any> | Array<Record<string, any>>): void {
    if (!this.document) return;
    const scriptId = 'workspace-pro-jsonld';
    let script: HTMLScriptElement | null = this.document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = this.document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.text = JSON.stringify(data);
  }
}
