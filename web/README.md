# MAY5 Web

## Local development

Install dependencies and start the web app and Google auth server together:

```sh
npm install
npm run dev
```

## Google sign-in

Copy `.env.example` to `.env` and set `VITE_GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` from your Google OAuth web
client. The client ID is used by the browser; the client secret is used only
by the local auth server and must not be prefixed with `VITE_` or committed.
Set `MONGODB_URI` to your MongoDB connection string. Google-authenticated
profiles, refreshable server-side sessions, and customer bookings are stored in
the `may5.users`, `may5.sessions`, and `may5.bookings` collections. Profile role
and editable details are saved to MongoDB. Google-account salon favorites are
also persisted on the user profile. Session cookies are HTTP-only, and the auth
health endpoint checks live database connectivity.

In Google Cloud Console, configure the OAuth consent screen and add the local
web origin (typically `http://localhost:5173`) to the OAuth client's authorized
JavaScript origins. If Vite chooses another port because 5173 is occupied, add
that exact origin as well. The Vite development server proxies `/api` requests
to the auth server on port 3001.

For production, configure these environment variables in the hosting
environment and deploy the auth server behind the same `/api` origin as the
web app. Never expose `GOOGLE_CLIENT_SECRET` to client-side code.

### Deploying to Render

The `render.yaml` Blueprint creates a Node web service that builds and serves
the frontend and API from one origin. Connect the repository containing this
project in Render, create a Blueprint from `render.yaml`, and provide
`VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
`MONGODB_URI` as environment variables when prompted. After the service is
created, add its `onrender.com` origin to the Google OAuth client's authorized
JavaScript origins. The `/api/health` endpoint is used for Render health checks.

## Demo and business services

The interface uses Indian rupees (INR), Indian number grouping, and Indian
date/time formatting.
The phone sign-in screen accepts valid Indian mobile numbers (10-digit numbers
starting with 6–9, with an optional +91 prefix). Use demo OTP `123456`; this is
for local demo only and does not send SMS. Business accounts add services from
the vendor Services page; every new service requires a JPEG, PNG, or WebP image
up to 5 MB.
Business accounts can manage team members from the vendor Staff page: add,
edit, activate or deactivate, and remove staff records. Staff names, roles,
salon assignments, and optional Indian mobile numbers and email addresses are
stored in the `may5.vendorStaff` collection.
