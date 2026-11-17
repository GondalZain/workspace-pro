import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CompanyThemeService } from '../../core/theme/company-theme.service';

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatarText: string;
  avatarBg: string;
  tags: string[];
}

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './team.component.html',
  styleUrl: './team.component.scss'
})
export class TeamComponent implements OnInit {
  private readonly companyTheme = inject(CompanyThemeService);

  ngOnInit(): void {
    this.companyTheme.resetDefaultTheme();
  }
  readonly teamMembers: TeamMember[] = [
    {
      name: 'Alex Morgan',
      role: 'Head of Product & Workspaces',
      bio: 'Leading product architecture and agile sprint workflows for enterprise team collaboration.',
      avatarText: 'AM',
      avatarBg: '#8b5cf6',
      tags: ['Product', 'Kanban', 'Strategy']
    },
    {
      name: 'Sarah Chen',
      role: 'Lead Systems Architect',
      bio: 'Architecting scalable multi-tenant infrastructure, custom company domains, and high-performance databases.',
      avatarText: 'SC',
      avatarBg: '#06b6d4',
      tags: ['Architecture', 'MySQL', 'Cloud']
    },
    {
      name: 'David Miller',
      role: 'Head of Design & UX',
      bio: 'Crafting intuitive dark-mode glassmorphic interfaces that teams love to use every working day.',
      avatarText: 'DM',
      avatarBg: '#ec4899',
      tags: ['UI/UX', 'Design System', 'Accessibility']
    },
    {
      name: 'Elena Rostova',
      role: 'Security & Compliance Lead',
      bio: 'Directing SOC2 compliance, 256-bit data encryption, and role-based permissions governance.',
      avatarText: 'ER',
      avatarBg: '#10b981',
      tags: ['Security', 'RBAC', 'Governance']
    },
    {
      name: 'Marcus Vance',
      role: 'Engineering Director',
      bio: 'Driving real-time collaboration engines, automated task pipelines, and webhook integrations.',
      avatarText: 'MV',
      avatarBg: '#f59e0b',
      tags: ['Engineering', 'Real-time', 'Integrations']
    },
    {
      name: 'Priya Patel',
      role: 'Head of Customer Success',
      bio: 'Empowering over 2,400+ companies to migrate their teams and hit every delivery deadline.',
      avatarText: 'PP',
      avatarBg: '#6366f1',
      tags: ['Onboarding', 'Customer Success', 'Support']
    }
  ];
}
