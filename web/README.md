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

For production sign-in, add the exact deployed website origin (for example
`https://may5.onrender.com`) under the OAuth web client's Authorized JavaScript
origins. Origins include the scheme and hostname and, for local sites, the port;
they do not include a path or trailing route. A Google `origin_mismatch` error
is fixed in this Google Cloud credential configuration and cannot be bypassed
by application code. MAY5 displays the active origin when this happens.

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
The server starts even when MongoDB is temporarily unreachable and retries the
connection every 30 seconds; database-backed API requests return `503` until
the database is available. A healthy Render deployment still requires a valid
Atlas connection string and an Atlas network access rule that permits Render.

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

### Business operations

New business accounts complete their profile during setup, including at least
one selected opening day and opening and closing times. Business profiles also
support storefront photos, full address and map coordinates, amenities, and
customer audience settings. Booking and customer-management preferences are
saved with the vendor profile. When booking approval is required, new
appointments are created as pending and can be approved or declined from the
vendor Calendar. Service owners can pause or edit their listings; paused
services are omitted from the public catalog. Customer discovery shows only
businesses with at least one active service, and every listed service uses the
vendor's saved price for checkout.

Appointments and their customer/service details power the business dashboard
and analytics. Customer history can be disabled from Customer management.
Packages, portfolio entries, and promotions are stored in
`may5.vendorContent`; active packages and portfolio photos appear on the public
business profile, while active, in-date promotions are shown on business
listings. Promotional messages are not sent by the application, and should
only be sent to customers who have opted in. Business help submissions are
stored as support reports.

## Customer profile and discovery

Customer addresses, notification preferences, booking preferences, and grooming
preferences are stored on the authenticated user profile through
`/api/customer/settings`. Customer problem reports are stored in
`may5.supportReports`. Account deletion removes the customer profile, sessions,
bookings, and support reports. The customer Explore page supports service
categories, open-now, rating, offer, and audience filters; business opening
hours, customer audience, and optional map coordinates are supplied through the
business profile. Store owners can save coordinates manually or capture the
device location.

Explore uses Leaflet with OpenStreetMap tiles and attribution. Customers can
center the map on their device location; businesses without coordinates do not
appear as map markers until their owner adds a pin. Browser push notifications
use VAPID keys generated once and stored server-side in the
`may5.systemConfiguration` collection. Customers must opt in from Profile >
Notifications. Booking confirmations are immediate and reminders are sent by a
server-side 15-minute scheduler while the service is running. `PUSH_CONTACT_EMAIL`
is optional and should be set to a monitored contact email for production.
Customers can send a test notification from the same settings page to verify
browser permission and delivery.

### Online payments

Online service bookings use Razorpay Checkout. Set `RAZORPAY_KEY_ID` and
`RAZORPAY_KEY_SECRET` as server-only environment variables in the local
environment and production host; never use a `VITE_` prefix or commit actual
credentials. Set `RAZORPAY_WEBHOOK_SECRET` separately, configure Razorpay to
send the `payment.captured` event to `/api/payments/razorpay/webhook`, and
configure automatic capture for successful Checkout payments. The server
creates orders from its stored service price, verifies checkout signatures,
confirms capture, and creates a booking only after payment. The signed webhook
also handles cases where the customer closes Checkout before returning to MAY5.
Online payments are stored in `may5.paymentOrders`, with payment and booking
references recorded for reconciliation.

Sample salon and service listings are clearly marked as demos. Demo checkout is
restricted to `RAZORPAY_TEST_KEY_ID` and `RAZORPAY_TEST_KEY_SECRET`; it never
falls back to the live credentials. Add Razorpay test-mode credentials in the
hosting environment to try demo payments. For test payment webhooks, also set
`RAZORPAY_TEST_WEBHOOK_SECRET` and configure the test webhook to send
`payment.captured` events to `/api/payments/razorpay/webhook`. Demo appointments
are marked as such and do not represent a real booking with a business.
