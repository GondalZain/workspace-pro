/**
 * Central Subscription Plans Registry
 * Any feature NOT listed in a plan's feature map is considered ALLOWED FOR EVERYONE by default.
 */
const SUBSCRIPTION_PLANS = {
  trial: {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    trialDays: 30,
    features: {
      'tasks.dynamic_statuses': false,
      'tasks.mentions_comments': false,
      'timesheet.logging': false,
      'workspace.custom_branding': false,
      'timesheet.export': false,
      'tasks.dependencies': false,
      'kanban.drag_drop': false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    price: 19,
    features: {
      'tasks.dynamic_statuses': true,
      'tasks.mentions_comments': false,
      'timesheet.logging': true,
      'workspace.custom_branding': false,
      'timesheet.export': false,
      'tasks.dependencies': false,
      'kanban.drag_drop': false
    }
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra Plan',
    price: 29,
    features: {
      'tasks.dynamic_statuses': true,
      'tasks.mentions_comments': true,
      'timesheet.logging': true,
      'workspace.custom_branding': true,
      'timesheet.export': true,
      'tasks.dependencies': true,
      'kanban.drag_drop': true
    }
  }
};

// Aliases for full backward compatibility
SUBSCRIPTION_PLANS.monthly = SUBSCRIPTION_PLANS.pro;

function getPlan(planId) {
  if (planId === 'monthly') return SUBSCRIPTION_PLANS.pro;
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.trial;
}

function hasPlanFeature(planId, featureKey) {
  const plan = getPlan(planId);
  // Rule: If feature key is not explicitly restricted (false), it is open to everyone
  if (plan.features && plan.features[featureKey] === false) {
    return false;
  }
  return true;
}

module.exports = {
  SUBSCRIPTION_PLANS,
  getPlan,
  hasPlanFeature
};
