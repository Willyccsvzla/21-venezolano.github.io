# Environment variables

## Google OAuth (production)

Set these server-side variables in Vercel for Production (and Preview if needed):

- `GOOGLE_CLIENT_ID`: OAuth 2.0 client ID from Google Cloud Console.
- `GOOGLE_CLIENT_SECRET`: OAuth 2.0 client secret. Keep it secret; never prefix it with `VITE_`.
- `BETTER_AUTH_URL`: `https://21-venezolano-io.vercel.app`.
- `BETTER_AUTH_SECRET`: a long, random secret used to sign sessions.
- `DATABASE_URL`: PostgreSQL connection string.
- `VITE_AUTH_ENABLED`: set to `true` to enable real authentication.

In Google Cloud Console, configure the OAuth consent screen and add this Authorized JavaScript origin:

```
https://21-venezolano-io.vercel.app
```

Add this Authorized redirect URI exactly:

```
https://21-venezolano-io.vercel.app/api/auth/callback/google
```

Google OAuth is handled directly by Better Auth. No `GROK_AUTH_*` variables or Grok auth broker are needed for production sign-in.
