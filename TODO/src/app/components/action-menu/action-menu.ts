import { Component, input, output } from '@angular/core';

export interface ActionMenuItem {
  id: string;
  label: string;
  destructive?: boolean;
  options?: { id: string; label: string }[];
}

@Component({
  selector: 'app-action-menu',
  standalone: true,
  templateUrl: './action-menu.html',
  styleUrl: './action-menu.css'
})
export class ActionMenuComponent {
  readonly label = input('More actions');
  readonly items = input.required<ActionMenuItem[]>();
  readonly actionSelected = output<string>();

  protected selectAction(action: string, menu: HTMLDetailsElement): void {
    menu.open = false;
    this.actionSelected.emit(action);
  }

  protected onSelectChange(event: Event, menu: HTMLDetailsElement): void {
    const target = event.target as HTMLSelectElement;
    if (target.value) {
      menu.open = false;
      this.actionSelected.emit(target.value);
      target.selectedIndex = 0;
    }
  }
}