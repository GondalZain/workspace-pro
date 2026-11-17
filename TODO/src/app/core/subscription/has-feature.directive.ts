import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { SubscriptionService } from './subscription.service';

/**
 * Structural Directive: *appHasFeature="'tasks.mentions_comments'"
 * Conditionally renders template content only if the current workspace subscription includes the feature.
 */
@Directive({
  selector: '[appHasFeature]',
  standalone: true
})
export class HasFeatureDirective {
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly subscription = inject(SubscriptionService);

  private hasView = false;

  @Input() set appHasFeature(featureKey: string) {
    const isAllowed = this.subscription.hasFeature(featureKey);

    if (isAllowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isAllowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
