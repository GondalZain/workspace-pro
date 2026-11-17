import { Component, input, output } from '@angular/core';
import { ActionMenuComponent, ActionMenuItem } from '../action-menu/action-menu';

export interface MetricCard {
  id: string;
  label: string;
  value: number;
  note: string;
  alert?: boolean;
}

@Component({
  selector: 'app-metric-cards',
  standalone: true,
  templateUrl: './metric-cards.html',
  styleUrl: './metric-cards.css'
})
export class MetricCardsComponent {
  readonly cards = input.required<MetricCard[]>();
  readonly cardAction = output<string>();
  protected readonly cardActions: ActionMenuItem[] = [{ id: 'open', label: 'Open tasks' }];

  protected selectCard(card: MetricCard, action: string): void {
    this.cardAction.emit(`${card.id}:${action}`);
  }
}
