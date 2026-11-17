import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { API_BASE_URL, STRIPE_PUBLISHABLE_KEY } from './api.config';

export interface PaymentIntentResponse {
  clientSecret: string | null;
  paymentIntentId?: string;
  amount: number;
  currency?: string;
  planId: string;
  planName: string;
  freeTrial?: boolean;
  isDemo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private readonly http = inject(HttpClient);
  private stripePromise: Promise<any> | null = null;

  /**
   * Lazy loads Stripe.js only when a user selects a paid plan.
   * If free trial is chosen, Stripe.js is never loaded!
   */
  async loadStripe(): Promise<any> {
    if ((window as any).Stripe) {
      return (window as any).Stripe(STRIPE_PUBLISHABLE_KEY);
    }

    if (!this.stripePromise) {
      this.stripePromise = new Promise((resolve, reject) => {
        // If demo key or mock key, don't necessarily need live Stripe script
        if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_51MockDemoKey')) {
          console.info('Stripe is operating in Demo / Test Mode.');
          resolve(null);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => {
          if ((window as any).Stripe) {
            resolve((window as any).Stripe(STRIPE_PUBLISHABLE_KEY));
          } else {
            resolve(null);
          }
        };
        script.onerror = (err) => {
          console.warn('Failed to load Stripe.js from CDN:', err);
          resolve(null);
        };
        document.head.appendChild(script);
      });
    }

    return this.stripePromise;
  }

  /**
   * Request payment intent from backend for paid plans.
   */
  createPublicPaymentIntent(planId: string, email: string, companyName?: string): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${API_BASE_URL}/auth/public-payment-intent`, {
      planId,
      email,
      companyName
    });
  }

  /**
   * Request payment intent for logged in workspace upgrade.
   */
  createWorkspacePaymentIntent(planId: string, companyName?: string): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${API_BASE_URL}/subscriptions/create-payment-intent`, {
      planId,
      companyName
    });
  }
}
