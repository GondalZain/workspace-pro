import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StripeService } from '../../core/api/stripe.service';

@Component({
  selector: 'app-stripe-card-element',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stripe-card-element.component.html',
  styleUrl: './stripe-card-element.component.scss'
})
export class StripeCardElementComponent implements OnInit {
  @Input() mode: 'checkout' | 'add_card' = 'checkout';
  @Input() variant: 'default' | 'liquid-glass' = 'default';
  @Input() showSummary: boolean = true;
  @Input() planName: string = '';
  @Input() price: string = '';
  @Input() cadence: string = '/ month';
  @Input() clientSecret: string | null = null;
  @Input() isDemo: boolean = false;

  @Output() cardValidated = new EventEmitter<{ valid: boolean; paymentMethodId?: string }>();
  @Output() cardDetailsChange = new EventEmitter<{
    cardholderName: string;
    cardNumber: string;
    expDate: string;
    cvc: string;
    valid: boolean;
  }>();

  private readonly fb = inject(FormBuilder);
  private readonly stripeService = inject(StripeService);

  protected readonly isLiveStripe = signal(false);
  protected readonly stripeLoaded = signal(false);

  // Fallback / standard card form for demo/test credentials and custom checkout
  protected readonly cardForm: FormGroup = this.fb.group({
    cardholderName: ['', [Validators.required, Validators.minLength(3)]],
    cardNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s]{15,19}$/)]],
    expDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)]],
    cvc: ['', [Validators.required, Validators.pattern(/^[0-9]{3,4}$/)]]
  });

  async ngOnInit(): Promise<void> {
    const stripe = await this.stripeService.loadStripe();
    if (stripe) {
      this.isLiveStripe.set(true);
      this.stripeLoaded.set(true);
      // Real Stripe Elements can mount here if live key is active
    } else {
      this.isLiveStripe.set(false);
      this.stripeLoaded.set(true);
    }

    this.cardForm.valueChanges.subscribe(() => {
      this.emitValidation();
    });
  }

  protected formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    if (formatted.length > 19) formatted = formatted.substring(0, 19);
    this.cardForm.get('cardNumber')?.setValue(formatted, { emitEvent: false });
    this.emitValidation();
  }

  protected formatExpDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    this.cardForm.get('expDate')?.setValue(value, { emitEvent: false });
    this.emitValidation();
  }

  private emitValidation(): void {
    const valid = this.cardForm.valid;
    const rawVal = this.cardForm.value;
    this.cardValidated.emit({
      valid,
      paymentMethodId: valid ? `pm_mock_${Date.now()}` : undefined
    });
    this.cardDetailsChange.emit({
      cardholderName: rawVal.cardholderName || '',
      cardNumber: rawVal.cardNumber || '',
      expDate: rawVal.expDate || '',
      cvc: rawVal.cvc || '',
      valid
    });
  }

  public isValid(): boolean {
    return this.cardForm.valid;
  }
}
