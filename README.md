# My Canteen – College Canteen Ordering System

A production-grade, authoritative, real-time college canteen ordering system built with React, Node.js, Express, MongoDB, and Socket.IO.

---

## 1. Target Production Architecture

The system is architected as three distinct deployment artifacts sharing one authoritative backend:

```
[ Student Storefront ]  →  https://YOUR_DOMAIN          (Static React SPA)
[ Admin Kitchen Panel]  →  https://admin.YOUR_DOMAIN    (Static React SPA)
[ Backend API Server ]  →  https://api.YOUR_DOMAIN      (Node.js / Express / Socket.IO)
[ Database Engine    ]  →  MongoDB Atlas Replica Set   (ACID Multi-Doc Transactions)
```

- **Single Authoritative Backend**: One shared API serving both the student storefront and the admin dashboard.
- **Separate Frontend Deployments**: The student application and admin panel are decoupled applications with independent builds, assets, and authentication domains.
- **Strict Server Authority**: The frontend is treated as untrusted. All prices, stock inventory, order state transitions, store hours, cancellation countdowns, and payment verification are strictly calculated and enforced on the server.

---

## 2. Directory Structure

```
canteen/
├── client/              # Student-facing storefront (React + Vite + Tailwind CSS)
│   ├── public/          # Static assets + _redirects (SPA routing)
│   ├── src/             # Pages, Contexts, Hooks, Services
│   └── vercel.json      # Vercel SPA routing rewrites
├── admin/               # Kitchen management & admin panel (React + Vite)
│   ├── public/          # Static assets + _redirects (SPA routing)
│   ├── src/             # Kitchen board, Products, Combos, Schedule, Store Settings
│   └── vercel.json      # Vercel SPA routing rewrites
├── server/              # Backend API & WebSocket Server (Node.js + Express)
│   ├── src/
│   │   ├── config/      # DB & Environment configuration
│   │   ├── controllers/ # Request controllers
│   │   ├── middleware/  # Auth, Admin RBAC, Rate Limits, NoSQL Sanitizer, Errors
│   │   ├── models/      # Mongoose schemas & compound unique indexes
│   │   ├── routes/      # REST API route definitions
│   │   ├── services/    # Business logic (Order, Payment, Store, Sockets)
│   │   └── sockets/     # Realtime order rooms & kitchen board subscriptions
│   └── server.js        # HTTP & Socket.IO server entry point
└── deploy/              # Production deployment configurations (Nginx, Docker)
    └── nginx/canteen.conf
```

---

## 3. Local Development

### Prerequisites
- Node.js 18+ (tested on Node 20+)
- MongoDB 6.0+ running locally (or MongoDB Atlas connection string)
- npm 9+

### Setup & Installation
```bash
# Clone the repository
cd "d:/SaaS/My Canteen/canteen"

# Install all subproject dependencies
npm run install:all
```

### Environment Setup
Create local `.env` files in each subproject directory:

1. `server/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://127.0.0.1:27017/my-canteen
   CLIENT_URL=http://localhost:5173
   ADMIN_URL=http://localhost:5174
   JWT_SECRET=dev_jwt_secret_change_in_production
   JWT_EXPIRES_IN=7d
   RAZORPAY_KEY_ID=rzp_test_placeholder
   RAZORPAY_KEY_SECRET=rzp_secret_placeholder
   RAZORPAY_WEBHOOK_SECRET=rzp_webhook_placeholder
   ```

2. `client/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

3. `admin/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

### Running Locally
Open separate terminal windows or run:
```bash
# Terminal 1: Backend Server (runs on http://localhost:5000)
npm run server

# Terminal 2: Student Storefront (runs on http://localhost:5173)
npm run client

# Terminal 3: Admin Kitchen Panel (runs on http://localhost:5174)
npm run admin
```

---

## 4. Production Environment Variables

### Client (`client/.env`)
| Variable | Description | Example Value |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend REST API | `https://api.YOUR_DOMAIN/api` |
| `VITE_SOCKET_URL` | Base URL for Socket.IO realtime connection | `https://api.YOUR_DOMAIN` |

### Admin (`admin/.env`)
| Variable | Description | Example Value |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend REST API | `https://api.YOUR_DOMAIN/api` |
| `VITE_SOCKET_URL` | Base URL for Socket.IO realtime connection | `https://api.YOUR_DOMAIN` |

### Server (`server/.env`)
| Variable | Description | Example Value |
|---|---|---|
| `NODE_ENV` | Application runtime environment | `production` |
| `PORT` | Local port for server process | `5000` |
| `MONGO_URI` / `MONGODB_URI` | MongoDB Atlas replica set URI with auth | `mongodb+srv://user:pass@cluster.mongodb.net/my-canteen?retryWrites=true&w=majority` |
| `CLIENT_URL` | Production student domain | `https://YOUR_DOMAIN` |
| `ADMIN_URL` | Production admin domain | `https://admin.YOUR_DOMAIN` |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist | `https://YOUR_DOMAIN,https://admin.YOUR_DOMAIN` |
| `JWT_SECRET` | High-entropy string for signing user JWTs | 32+ random characters |
| `JWT_EXPIRES_IN` | JWT token validity window | `7d` |
| `RAZORPAY_KEY_ID` | Live Razorpay Key ID | `rzp_live_xxxxxxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Live Razorpay Key Secret | Secure secret key |
| `RAZORPAY_WEBHOOK_SECRET`| Live Razorpay Webhook Signing Secret | Secure webhook secret |

> [!CAUTION]
> Never commit actual `.env` files to git. Use `.env.example` as a template. Inject production secrets via your hosting provider's environment settings.

---

## 5. Deployment Instructions

### A. Backend API Server (`https://api.YOUR_DOMAIN`)
Can be deployed to any Node.js hosting platform (DigitalOcean, AWS EC2, Render, Railway, Fly.io):

1. **Build & Start Commands**:
   - Install: `npm install --omit=dev`
   - Start: `node server.js`
2. **Reverse Proxy (Nginx)**:
   Use the provided configuration in [`deploy/nginx/canteen.conf`](file:///d:/SaaS/My%20Canteen/canteen/deploy/nginx/canteen.conf) which includes:
   - SSL termination (Let's Encrypt / Certbot)
   - Proxy pass to `http://127.0.0.1:5000`
   - WebSocket headers for `/socket.io/`:
     ```nginx
     location /socket.io/ {
         proxy_pass http://127.0.0.1:5000/socket.io/;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection "upgrade";
         proxy_read_timeout 86400s;
     }
     ```

### B. Student Storefront (`https://YOUR_DOMAIN`)
Can be deployed to Vercel, Netlify, Cloudflare Pages, or static Nginx:
1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **SPA Rewrite Rules**:
   - Vercel: Configured via [`client/vercel.json`](file:///d:/SaaS/My%20Canteen/canteen/client/vercel.json)
   - Netlify / Cloudflare Pages: Configured via [`client/public/_redirects`](file:///d:/SaaS/My%20Canteen/canteen/client/public/_redirects)
   - Nginx: `try_files $uri $uri/ /index.html;`

### C. Admin Kitchen Panel (`https://admin.YOUR_DOMAIN`)
Deploy as a completely independent project pointing to `https://admin.YOUR_DOMAIN`:
1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **SPA Rewrite Rules**:
   - Vercel: Configured via [`admin/vercel.json`](file:///d:/SaaS/My%20Canteen/canteen/admin/vercel.json)
   - Netlify / Cloudflare Pages: Configured via [`admin/public/_redirects`](file:///d:/SaaS/My%20Canteen/canteen/admin/public/_redirects)
   - Nginx: `try_files $uri $uri/ /index.html;`

---

## 6. Database Configuration (MongoDB Atlas)

- **Replica Set**: Required for native multi-document ACID transactions across orders, order items, and stock updates.
- **Indexes**:
  - `Order`: `{ user: 1, idempotencyKey: 1 }` (unique, partial index on strings)
  - `Order`: `{ user: 1, createdAt: -1 }`, `{ orderStatus: 1, createdAt: -1 }`
  - `User`: `{ email: 1 }` (unique), `{ role: 1 }`
  - `Product`: `{ slug: 1 }` (unique), `{ category: 1 }`, `{ isAvailable: 1 }`
- **Network Security**: Whitelist only backend server IPs in Atlas Network Access. Never allow `0.0.0.0/0` in production without IP access controls.

---

## 7. Online Payment & Webhook Configuration (Razorpay)

1. **Dashboard Setup**:
   - Log into the [Razorpay Dashboard](https://dashboard.razorpay.com/).
   - Generate Live API Keys (`Key ID` and `Key Secret`).
2. **Webhook Endpoint**:
   - URL: `https://api.YOUR_DOMAIN/api/payments/webhook`
   - Active Events:
     - `order.paid`
     - `payment.captured`
     - `payment.failed`
   - Webhook Secret: Generate a secret and assign it to `RAZORPAY_WEBHOOK_SECRET`.
3. **Automatic Inventory Release Strategy**:
   - Failed client-side transactions call `POST /api/payments/fail`, auto-cancelling the order (`cancelledBy: "SYSTEM"`) and immediately restoring stock.
   - Gateway `payment.failed` webhooks trigger system cancellation and restore stock.
   - Abandoned online checkouts (student leaves modal open without paying) are periodically scanned and released after 15 minutes by the background cleaner.

---

## 8. Production Verification Test Suites

Run the automated test suites from the `server/` directory:

```bash
# Part 22: Admin Kitchen Board & Socket.IO Realtime Operations
node test_part22.js

# Part 23: Security, RBAC, Validation & Concurrency Hardening
node test_part23.js

# Part 24: Complete 38-Step Production Smoke Test
node test_part24.js
```

---

## 9. Production Pre-Flight Checklist

- [x] All subprojects build successfully with zero errors (`npm run build`).
- [x] `.env` files are excluded from Git via `.gitignore`.
- [x] `helmet` HTTP security headers enabled.
- [x] NoSQL operator injection sanitizer active.
- [x] Rate limiting active for authentication, payments, and general API endpoints.
- [x] Production error handler active (stack traces suppressed in production).
- [x] CORS restricted to `CLIENT_URL` and `ADMIN_URL` (no wildcards).
- [x] Socket.IO proxying configured with WebSocket upgrade headers.
- [x] SPA routing fallbacks configured (`_redirects` and `vercel.json`) to prevent 404 on page refresh.
- [x] Authoritative stock release strategy active for abandoned online checkouts.
