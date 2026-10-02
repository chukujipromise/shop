# Form / Field

A responsive shop built with Next.js, React, Supabase, and Mailgun.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.example` to `.env.local` and fill in the values below.

## Supabase database and orders

1. Create a Supabase project.
2. Open the SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql). This creates and seeds the product catalog, orders, order lines, and the restricted order-creation function.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the project API settings. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the server route. Never expose the service-role key in a `NEXT_PUBLIC_` variable.

Guest cart contents and placed orders are stored in Supabase. Checkout validates product IDs and quantities, reloads current prices from Postgres, calculates shipping and totals on the server, then saves the order and its lines transactionally. Complimentary shipping starts at $120. This starter records orders but does not process payment. The browser keeps a recoverable cart copy if Supabase is not configured or temporarily unavailable.

## Google sign-in

1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client ID for a Web application.
2. Add `http://localhost:3000` to Authorized JavaScript origins.
3. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` to Authorized redirect URIs.
4. In Supabase, open Authentication → Sign In / Providers → Google, enable the provider, and paste the Google client ID and client secret.
5. In Supabase Authentication URL Configuration, set the site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback`. Add your production origin and callback when deploying.

The sign-in button uses Supabase Auth with the PKCE flow. The same callback path must be allowed for your deployed site.

## Confirmation email

Verify a sending domain in Mailgun, then set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM`. These are server-only values. Orders are still stored if Mailgun is not configured or delivery fails; the checkout reports that email delivery was unavailable.

## Deployment

Deploy as a Next.js application and configure the same environment variables in the hosting provider. Update Supabase Auth URL settings and Google Cloud authorized origins/redirect URIs to the deployed domain.
