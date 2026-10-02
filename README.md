# Form / Field

A responsive shop built with Next.js, React, Netlify Database, Netlify Identity, and Mailgun.

## Run locally

```bash
npm install
netlify dev
```

`netlify dev` provides local Netlify Database and Identity emulation.

## Database and orders

Guest carts and placed orders are stored in Netlify Database (managed Postgres) using Drizzle ORM. The schema lives in `db/schema.ts`; after changing it, run `npx drizzle-kit generate --name <change>` to create a migration in `netlify/database/migrations/`. Netlify applies migrations automatically on deploy.

Checkout validates product IDs and quantities, takes prices from the server-side catalog in `src/lib/products.ts`, calculates shipping and totals on the server, then saves the order and its lines in one transaction. Complimentary shipping starts at $120. This starter records orders but does not process payment. The browser keeps a recoverable cart copy if the database is temporarily unavailable.

## Sign in

Accounts use Netlify Identity (email/password). New sign-ups get a confirmation email by default; this can be changed under **Project configuration → Identity**. To enable "Continue with Google", turn on Google under **Project configuration → Identity → External providers**.

## Confirmation email

Verify a sending domain in Mailgun, then set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM`. These are server-only values. Orders are still stored if Mailgun is not configured or delivery fails; the checkout reports that email delivery was unavailable.

## Deployment

Deploy to Netlify. The database and Identity need no extra environment variables; only the optional Mailgun values above need to be set.
