// Real public GitHub repo used to test GitPet against actual git history
// instead of the hardcoded acme-corp/ecommerce-store mock scenarios.
// See TESTING.md in that repo for how its branches map to each mock scenario.
export const LIVE_REPO = {
  owner: 'farisnour',
  repo: 'gitpet-acme-corp-ecommerce-store',
  defaultBranch: 'main',
};

export const LIVE_REPO_BRANCHES = [
  'main',
  'feature/cart',
  'fix/checkout-tax',
  'refactor/auth-v2',
  'feature/oauth-login',
];
