This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## ScratchX Subscription System

The ScratchX subscription system provides a **one-time lifetime purchase model** for merchants to access campaign management features.

### Plans

- **Core Plan**: ₹2,099 (₹2,477 with GST)
  - 1 store maximum
  - Unlimited campaigns
  - 90 days unlimited scratches
  - Basic analytics & automation

- **Smart Plan**: ₹2,999 (₹3,539 with GST)
  - 5 stores maximum (1 main + 4 additional)
  - Unlimited campaigns per store
  - 90 days unlimited scratches
  - Advanced analytics, WhatsApp integration, fraud protection

### Key Features

- **Platform Access**: Lifetime (never expires after one-time purchase)
- **Unlimited Scratches**: 90-day quarterly benefit included with each purchase
- **Scratch Packs**: Purchase additional scratches after 90-day period expires
- **Main Store Protection**: First store created is protected and can never be deleted
- **Store Limits**: Enforced by plan (Core: 1 store, Smart: 5 stores)

### Documentation

- **Implementation Guide**: See [`docs/SUBSCRIPTION_IMPLEMENTATION.md`](docs/SUBSCRIPTION_IMPLEMENTATION.md) for complete architecture, API contract, and design decisions
- **Testing Guide**: See [`docs/SUBSCRIPTION_TESTING.md`](docs/SUBSCRIPTION_TESTING.md) for comprehensive testing checklist

### Quick Setup

```bash
# Seed subscription plans
npm run seed:plans

# Create test accounts with subscriptions
npm run seed:accounts
```

### API Endpoints

- `GET /api/subscription/status` - Get current subscription and entitlement status
- `GET /api/subscription/eligibility` - Check campaign creation eligibility
- `GET /api/subscription/plans` - List available plans (public endpoint)
- `POST /api/subscription/activate` - Activate a subscription plan
- `GET /api/subscription/current` - Get detailed subscription info
- `POST /api/subscription/purchase` - Purchase scratch packs
- `POST /api/subscription/upgrade` - Upgrade or downgrade plan

For full API documentation, see [`docs/SUBSCRIPTION_IMPLEMENTATION.md`](docs/SUBSCRIPTION_IMPLEMENTATION.md#api-contract).

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
