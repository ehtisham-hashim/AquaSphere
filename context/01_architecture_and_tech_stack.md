# AquaSphere & Wadaana - Architecture & Technology Stack

## 1. System Overview

**AquaSphere** and **Wadaana** form a unified multi-tenant industrial water manufacturing, inventory, sales, and financial management platform. The system supports multi-brand operations with shared administrative control, strict inventory accounting, exact production material consumption, bottle ledger tracking, vendor payables management, and daily financial close locking.

- **AquaSphere**: Primary brand managing 19L refillable bottles, 0.5L PET packs, and 1.5L PET packs.
- **Wadaana**: Sister brand managing specialized product lines (Pure 0.5L/1.5L bottles vs Mix 0.5L/1.5L bottles).

---

## 2. Multi-Tenancy Architecture

The system implements multi-tenancy at both the client application level and the database level using a dual-schema PostgreSQL model.

```
                   +--------------------------------+
                   |  React Frontend Client         |
                   |  (Port 5173 / Production Web)  |
                   +---------------+----------------+
                                   |
                       Cookie/LocalStorage Context:
                        - 'tenant' / 'company'
                                   |
                       Global Fetch Interceptor
                      (Injects 'x-tenant' Header)
                                   |
                                   v
                   +--------------------------------+
                   |  Express API Server            |
                   |  (Port 3000 / Production API)  |
                   +---------------+----------------+
                                   |
                           verifyJWT Middleware
                     (Resolves req.tenant & User)
                                   |
                    +--------------+--------------+
                    |                             |
                    v                             v
           +-----------------+           +-----------------+
           | 'aquasphere'    |           | 'wadaana'       |
           | PostgreSQL      |           | PostgreSQL      |
           | Schema          |           | Schema          |
           +-----------------+           +-----------------+
```

### Client-Side Tenant Switching
1. **Cookie & LocalStorage State**: `frontend/src/utils/companyCookie.js` manages active tenant selection (`aquasphere` or `wadaana`) across browser reloads via 1-year cookies (`company`, `tenant`) and `localStorage`.
2. **Global Request Interception**: `frontend/src/utils/apiInterceptor.js` wraps `window.fetch` to automatically append `'x-tenant': tenant` header to all outbound API requests.

### Backend Tenant Routing
1. **Authentication Middleware**: `backend/src/middlewares/auth.middleware.js` decodes the JWT token and extracts `x-tenant` or `x-company-context` header.
2. **Dynamic Schema Queries**: Queries invoke models dynamically via `prisma[\`${prefix}${Model}\`]`, where `prefix` is `aquasphere` or `wadaana`.
3. **Cross-Tenant Fallback**: Administrative users (`OWNER`, `ADMIN`) created under one schema can authenticate and operate smoothly across both tenant schemas without duplicate accounts.

---

## 3. Technology Stack

### Frontend Stack
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Core Framework** | React 18 | Declarative component UI library |
| **Build Tool & Server** | Vite | Ultra-fast development server & bundler |
| **Routing** | React Router DOM v6 | Client-side page navigation & layout routing |
| **State Management** | React Context API | Global authentication state (`AuthContext.jsx`) |
| **Iconography** | Lucide React | Modern SVG icons for dashboards & tables |
| **Styling** | Vanilla CSS + Tailwind CSS | Responsive, high-contrast dark/glass UI design |

### Backend Stack
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime Environment** | Node.js (ES Modules) | Server execution environment |
| **Web Server** | Express.js | REST API web application framework |
| **ORM & Database Client**| Prisma ORM (v5/v6) | Type-safe query engine & schema manager |
| **Database Driver** | `@prisma/adapter-pg` + `pg` | High-performance PostgreSQL connection pool |
| **Database System** | PostgreSQL | Multi-schema relational database (`aquasphere`, `wadaana`) |
| **Authentication** | `jsonwebtoken` + `cookie-parser` | HTTP-only cookie JWT session management |
| **Security & Utilities** | `helmet`, `express-rate-limit` | HTTP header security & API rate limiting (300 req/15min) |
| **Media & PDF** | `cloudinary`, `pdfkit` | Cloud receipt uploads & PDF invoice generation |
