import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header';

@Component({
  selector: 'app-workspace-shell',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './workspace-shell.html',
  styleUrl: './workspace-shell.css'
})
export class WorkspaceShellComponent {}
