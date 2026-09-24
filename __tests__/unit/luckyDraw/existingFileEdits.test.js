import fs from 'fs';
import path from 'path';
import SubscriptionPlan from '@/models/subscriptionPlanModel';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('subscription plan flag', () => {
  it('has a canUseLuckyDraw feature that defaults to off', () => {
    const schemaPath = SubscriptionPlan.schema.path('features.canUseLuckyDraw');
    expect(schemaPath).toBeDefined();
    expect(schemaPath.options.default).toBe(false);
  });

  it('is enabled on Smart and off on Core in the seed script', () => {
    const seed = read('scripts/seed-subscription-plans.js');
    expect(seed.match(/canUseLuckyDraw: true,/g)).toHaveLength(1);
    expect(seed.match(/canUseLuckyDraw: false,/g)).toHaveLength(1);
    expect(seed.indexOf('canUseLuckyDraw: false')).toBeLessThan(seed.indexOf("name: 'Smart'"));
    expect(seed.indexOf('canUseLuckyDraw: true')).toBeGreaterThan(seed.indexOf("name: 'Smart'"));
  });
});

describe('middleware', () => {
  const source = read('middleware.js');
  const matcher = source.slice(source.indexOf('export const config'));

  it('protects the merchant pages and API', () => {
    expect(source).toContain("pathname.startsWith('/lucky-draws')");
    expect(source).toContain("pathname.startsWith('/api/lucky-draws')");
    expect(matcher).toContain("'/lucky-draws'");
    expect(matcher).toContain("'/lucky-draws/:path*'");
    expect(matcher).toContain("'/api/lucky-draws/:path*'");
  });

  it('applies the store and subscription gates to the merchant pages', () => {
    const gates = source.slice(source.indexOf('SUBSCRIPTION_REQUIRED_ROUTES'), source.indexOf('ONBOARDING_BYPASS'));
    expect(gates.match(/'\/lucky-draws'/g)).toHaveLength(2);
  });

  it('leaves the public customer page, customer API and cron out of the matcher', () => {
    expect(matcher).not.toMatch(/'\/lucky-draw'/);
    expect(matcher).not.toMatch(/'\/lucky-draw\//);
    expect(matcher).not.toContain('/api/customer');
    expect(matcher).not.toContain('/api/cron');
  });
});

describe('dashboard navigation', () => {
  const source = read('components/dashboards/DashboardLayout.js');

  it('shows the Lucky Draw items only behind the feature flag', () => {
    expect(source).toMatch(/import \{[^}]*LUCKY_DRAW_ENABLED[^}]*\} from "@\/lib\/featureFlags"/);
    expect(source).toContain('label: "Lucky Draw", href: "/lucky-draws"');
    expect(source).toContain('label: "Lucky Draw Prizes", href: "/lucky-draws/redeem"');
    expect(source.match(/LUCKY_DRAW_ENABLED\s*\?/g)).toHaveLength(2);
  });
});
