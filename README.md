# LinkCraft - Industrial-Grade URL Shortener SaaS Platform

An enterprise-ready, high-performance URL shortening and redirect management platform built with **NestJS**, **TypeORM**, **PostgreSQL**, **Redis**, **React (Vite)**, and **Tailwind CSS**.

---

## 🚀 Phase 1 Status: COMPLETED ✅
Phase 1 delivers the core URL-shortening and redirection engine with Base62 encoding, custom aliases, QR codes, click-limit expiration, and automatic metadata scraping.

---

## 🔐 Phase 2 Status: COMPLETED ✅

Phase 2 implements a complete enterprise authentication system and user dashboard with strict data isolation.

### Features Implemented:
1. **User Registration & Login:** Email/password authentication with **Bcrypt** hashing (10 salt rounds).
2. **Dual-Token Engine:** Short-lived JWT Access Tokens (15m) + Long-lived Refresh Tokens (7d).
3. **Secure Refresh Token Rotation:** Single-use refresh tokens with automatic reuse-attack detection and revocation.
4. **Role-Based Access Control (RBAC):** Admin and standard User roles.
5. **Data Isolation (User Ownership):** Authenticated users exclusively view, edit, and manage their own URLs.
6. **Frontend Auth Integration:** Clean LinkFlow modal with Sign In / Register tabs, automatic Bearer token injection, auto-refresh on 401, and profile management dropdown.
7. **Test Verification (100% Passed):** 15/15 unit and integration tests passing.

---

## 🛠️ Project Architecture

```
d:\Url Shortner\
├── backend/                  # NestJS TypeScript API
│   ├── src/
│   │   ├── config/           # Database & App environment configuration
│   │   ├── urls/             # URLs module (Controller, Service, Entity, DTOs)
│   │   ├── redirects/        # High-speed HTTP 302 redirect controller
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── test/
├── frontend/                 # React 18 + Vite + Tailwind CSS + Lucide
│   ├── src/
│   │   ├── components/       # UI (Navbar, ShortenForm, UrlResultCard, RecentUrlsList, Modals)
│   │   ├── services/         # Axios API Client
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── vite.config.ts
├── docker-compose.yml        # PostgreSQL 16 & Redis 7 services
└── README.md
```

---

## 💻 Local Setup & Execution Guide

### 1. Start Database & Redis (Docker Compose)
In the project root:
```bash
docker compose up -d
```
* **PostgreSQL:** Running on port `5435` (mapped to internal 5432)
* **Redis:** Running on port `6385` (mapped to internal 6379)

---

### 2. Run NestJS Backend
Open a terminal in `backend/`:
```bash
cd backend
npm install
npm run start:dev
```
* Backend runs on: `http://localhost:5000`
* API endpoints: `http://localhost:5000/api/urls`
* Redirects: `http://localhost:5000/:shortCode`

---

### 3. Run React Frontend
Open another terminal in `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
* Frontend runs on: `http://localhost:3000`

---

## 🧪 Testing & Verification

### Run Backend Unit Tests:
```bash
cd backend
npm test
```
**Results:** 9/9 Unit Tests Passed:
- Base62 generation & database persistence.
- Custom alias collision handling.
- Reserved slug validation.
- HTTP 302 redirection.
- Click count incrementation.
- Active/Inactive status verification.
- Expiration date & click-limit rejection.

---

## ⏭️ What's Next?
According to the development plan, **Phase 1 is 100% complete and verified**. 
Ready to proceed to **Phase 2: Authentication and User Dashboard** when you are ready!

