import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkspaceShellComponent } from '../../components/workspace-shell/workspace-shell';
import { AdminSidebarComponent } from '../../components/admin-sidebar/admin-sidebar';
import { ROUTE_URL } from '../../core/routing/route-paths';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/api/api.config';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, RouterModule, WorkspaceShellComponent, AdminSidebarComponent],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.css'
})
export class AdminPage {
  private readonly auth = inject(AuthService);
  private readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');

  protected readonly url = ROUTE_URL;
  protected readonly user = signal(this.auth.getUser());

  protected readonly companyName = computed(() => this.user()?.company?.name || 'Company Admin');
  protected readonly companyTitle = computed(() => this.user()?.company?.title || 'Management');
  protected readonly companyDescription = computed(() => this.user()?.company?.description || '');
  protected readonly companyLogo = computed(() => this.user()?.company?.logoPath ? (this.apiOrigin + this.user()?.company?.logoPath) : null);
}
