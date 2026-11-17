import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SuperAdminSidebarComponent } from '../../components/super-admin-sidebar/super-admin-sidebar';
import { SuperAdminHeaderComponent } from '../../components/super-admin-header/super-admin-header';

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  imports: [RouterOutlet, SuperAdminSidebarComponent, SuperAdminHeaderComponent],
  templateUrl: './super-admin-layout.html',
  styleUrl: './super-admin-layout.css'
})
export class SuperAdminLayoutComponent {}
