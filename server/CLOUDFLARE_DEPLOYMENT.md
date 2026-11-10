# Cloudflare Workers deployment

The Express API is deployed as a Cloudflare Worker and connects to Neon PostgreSQL through the Cloudflare Hyperdrive binding.

## Cloudflare Workers build settings

Configure the GitHub-connected Worker with:

- Root directory: `server`
- Build command: `npm install && npm run build:worker`
- Deploy command: `npx wrangler deploy`
- Configuration file: `wrangler.jsonc`

Use `npm install`, not `npm ci`, until the lockfile has been regenerated after the dependency changes in this deployment branch.

## Worker secrets

Set these under Worker > Settings > Variables and Secrets:

- `JWT_SECRET`: a cryptographically random value of at least 32 characters
- `CLIENT_URL`: the exact deployed Cloudflare Pages frontend origin, including `https://`
- `MESS_INITIAL_PASSWORD`: a new strong password for the seeded mess account
- `MESS_EMAIL`: optional; defaults to `mess@iiit-bh.ac.in`
- `RAZORPAY_KEY_ID`: optional Razorpay key ID
- `RAZORPAY_KEY_SECRET`: optional Razorpay key secret
- `RAZORPAY_WEBHOOK_SECRET`: optional Razorpay webhook signing secret

Do not add database credentials, JWT secrets, or Razorpay secrets to Git.

The Worker uses the `HYPERDRIVE` binding configured in `wrangler.jsonc`; the database connection string is not stored in application source.

## Database migrations

Before using the application, apply the checked-in Prisma migrations to the Neon database:

```bash
cd server
npm install
```

Set `DATABASE_URL` in your local shell to the Neon **direct, non-pooled** connection string, then run:

```bash
npm run prisma:deploy
```

Do not run `prisma migrate dev` against the production database. The seed command creates a default mess account and demo menus; only run it after reviewing the configured `MESS_EMAIL` and `MESS_INITIAL_PASSWORD` values.

## Health check

After deployment, verify:

```
https://<your-worker-subdomain>.workers.dev/api/health
```

A successful response contains `success: true` and `status: "ok"`.
