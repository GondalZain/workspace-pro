import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ROUTE_URL } from '../../core/routing/route-paths';

@Component({
  selector: 'app-workspace-nav',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './workspace-nav.html',
  styleUrl: './workspace-nav.css'
})
export class WorkspaceNavComponent {
  readonly taskCount = input(0);
  protected readonly url = ROUTE_URL;
}
