import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../../models/project.model';
import { API_BASE_URL } from '../../../core/api/api.config';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-card.html',
  styleUrl: './project-card.css'
})
export class ProjectCardComponent {
  readonly project = input.required<Project>();
  readonly showActions = input(true);
  readonly clickable = input(true);

  readonly open = output<Project>();
  readonly edit = output<Project>();
  readonly delete = output<Project>();

  private readonly apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

  protected get imageUrl(): string | null {
    const path = this.project()?.imagePath;
    if (!path) return null;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiOrigin}${clean}`;
  }

  protected onOpen(): void {
    if (!this.clickable()) return;
    this.open.emit(this.project());
  }

  protected onEdit(event?: Event): void {
    if (event) event.stopPropagation();
    this.edit.emit(this.project());
  }

  protected onDelete(event?: Event): void {
    if (event) event.stopPropagation();
    this.delete.emit(this.project());
  }
}
