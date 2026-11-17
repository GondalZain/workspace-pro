import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { ProjectPortfolioComponent } from '../../../components/projects';

@Component({
  selector: 'app-admin-projects-page',
  standalone: true,
  imports: [CommonModule, AdminPageHeaderComponent, ProjectPortfolioComponent],
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.css'
})
export class AdminProjectsPage {}
