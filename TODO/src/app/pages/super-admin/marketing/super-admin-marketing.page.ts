import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../core/api/api.config';
import { ROUTE_URL } from '../../../core/routing/route-paths';

export interface MarketingInvitation {
  id: number;
  recipientEmail: string;
  customMessage: string | null;
  status: 'sent' | 'registered' | 'failed';
  replyContent: string | null;
  registeredCompanyId: number | null;
  registeredCompanyName: string | null;
  sentAt: string;
  repliedAt: string | null;
}

export interface MarketingInvitation {
  id: number;
  recipientEmail: string;
  customMessage: string | null;
  status: 'sent' | 'registered' | 'failed';
  registeredCompanyId: number | null;
  registeredCompanyName: string | null;
  sentAt: string;
  repliedAt: string | null;
}

@Component({
  selector: 'app-super-admin-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './super-admin-marketing.page.html',
  styleUrl: './super-admin-marketing.page.css'
})
export class SuperAdminMarketingPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  protected readonly routes = ROUTE_URL;

  protected recipientEmail = '';
  protected customMessage = '';

  protected isSubmitting = signal(false);
  protected isLoadingList = signal(true);
  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);

  protected invitations = signal<MarketingInvitation[]>([]);

  ngOnInit(): void {
    this.fetchInvitations();
  }

  protected fetchInvitations(): void {
    this.isLoadingList.set(true);
    this.http.get<MarketingInvitation[]>(
      `${API_BASE_URL}/super-admin/companies/marketing-invitations`
    ).subscribe({
      next: (data) => {
        this.invitations.set(data || []);
        this.isLoadingList.set(false);
      },
      error: () => {
        this.isLoadingList.set(false);
      }
    });
  }

  protected sendInvitation(): void {
    const email = (this.recipientEmail || '').trim();
    if (!email || !email.includes('@')) {
      this.errorMessage.set('Please enter a valid recipient email address.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.http.post<{ success: boolean; message: string }>(
      `${API_BASE_URL}/super-admin/companies/send-marketing-invitation`,
      {
        recipientEmail: email,
        customMessage: (this.customMessage || '').trim()
      }
    ).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(res.message || 'Invitation sent successfully! When the user replies, their workspace will auto-register.');
        this.recipientEmail = '';
        this.customMessage = '';
        this.fetchInvitations();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to dispatch marketing invitation.');
      }
    });
  }

  protected activeReplyModal = signal<MarketingInvitation | null>(null);

  protected openReplyModal(invite: MarketingInvitation): void {
    this.activeReplyModal.set(invite);
  }

  protected closeReplyModal(): void {
    this.activeReplyModal.set(null);
  }

  protected formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }
}
