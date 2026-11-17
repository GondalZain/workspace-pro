import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.css'
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() badgeText?: string;
  @Input() variant: 'teal' | 'emerald' | 'indigo' | 'sapphire' | 'purple' | 'amber' = 'teal';
  @Input() iconType: 'company' | 'active' | 'admins' | 'users' | 'default' = 'default';
}
