This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

## Email notifications and AI chat

Configure `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL`, and a strong `EMAIL_CRON_SECRET` in the server environment. Verify the sender domain in Resend before enabling production delivery. Keep all values except the application URL server-only, and do not commit local environment files.

The durable email outbox is processed by `GET` or `POST /api/cron/email-notifications`. Configure the deployment scheduler to call this endpoint every five minutes with `Authorization: Bearer <EMAIL_CRON_SECRET>`. The repository does not identify a deployed scheduler, so this trigger must be configured in the hosting provider or an external cron service. One-hour reminders are skipped for bookings made within the final hour; confirmation messages are still queued. Delayed reminders are skipped once the scheduled start time has passed.

Apply the new database migration with the normal reviewed Prisma deployment process before deploying the notification outbox and AI chat conversation storage. Do not run it directly against production without the usual backup and migration review.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
