import { Component } from '@angular/core';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { ProjectPortfolioComponent } from '../../../components/projects';
@Component({
  selector: 'app-user-projects-page',
  standalone: true,
  imports: [WorkspaceUserLayoutComponent, ProjectPortfolioComponent],
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.css'
})
export class UserProjectsPage {}
