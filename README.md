# 🍁 MapleLink — Smart Campus Operations Hub

> IT3030 Programming Applications and Frameworks — Group Assignment 2026  
> Sri Lanka Institute of Information Technology (SLIIT)

A full-stack, production-grade web platform for managing university facility bookings, maintenance requests, and incident ticketing — with role-based access, real-time notifications, and Google OAuth2 authentication.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [User Roles](#user-roles)
- [CI/CD Pipeline](#cicd-pipeline)
- [Project Structure](#project-structure)
- [Team Contributions](#team-contributions)

---

## Overview

MapleLink replaces fragmented paper-based and siloed campus processes with a single unified platform. It handles everything from room bookings and lab scheduling to fault reporting, technician dispatching, and SLA monitoring — all within a clean, role-aware interface.

---

## Features

### Module A — Resource Management
- Full CRUD for campus resources: lecture halls, labs, meeting rooms, equipment
- Image upload per resource (stored as BYTEA in PostgreSQL)
- Search and filtering by type, capacity, location, status, and keyword
- Dynamic JPA Criteria API (`ResourceSpecification`) with pagination

### Module B — Booking Management
- Booking workflow: `PENDING → APPROVED / REJECTED → CANCELLED`
- 8-step validation chain: capacity, resource status, maintenance mode, time rules, past date, overlap conflict, duplicate detection
- Competing requests model — multiple users can hold PENDING requests simultaneously; admin picks one and all others are auto-rejected with notifications
- Maintenance booking sub-flow for technicians with start/complete/extend lifecycle
- `ExpiredBookingService` — scheduled job runs every 15 minutes to auto-reject expired requests and auto-cancel unstarted maintenance bookings
- QR Code Booking Pass generation for approved bookings
- Admin views: day-view booking calendar, maintenance requests tab, month-grid resource calendar with CSV export

### Module C — Incident Ticketing
- Ticket workflow: `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`
- Smart auto-assignment: maps ticket category to technician specialization, load-balances by active ticket count
- SLA monitoring: CRITICAL=4h, HIGH=24h, MEDIUM=72h, LOW=168h with breach notifications
- Up to 3 image attachments per ticket (BYTEA BLOB, MIME-validated)
- Comment system with ownership rules (edit/delete own; admin can moderate any)
- Technician return flow — send ticket back to OPEN for reassignment

### Module D — Notifications
- Real-time in-app notification panel (polled every 30 seconds)
- Covers all system events: booking approvals/rejections, ticket updates, SLA breaches, maintenance events
- Unread count badge on the header bell icon
- Mark single or all notifications as read

### Module E — Authentication & Security
- Google OAuth2 SSO for STUDENT, STAFF, and TECHNICIAN roles
- Email + BCrypt password login for ADMIN
- JWT stateless authentication (access + refresh token pair)
- TOTP two-factor authentication (Google Authenticator compatible, optional per user)
- `@PreAuthorize` role-based method security on all sensitive endpoints
- HATEOAS Level 3 REST on user endpoints (`UserModelAssembler`)
- Bulk user import via Excel (Apache POI server-side + SheetJS client-side preview)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3 · Java 21 · Spring Security · Spring Data JPA |
| Frontend | React 18 · Vite · Tailwind CSS · Axios · React Router |
| Database | PostgreSQL via CockroachDB Cloud |
| Auth | JWT · Google OAuth2 · TOTP (GoogleAuthenticator library) |
| CI/CD | Jenkins · GitHub · Amazon ECR · AWS EC2 · Docker · Docker Compose |
| API Design | REST + HATEOAS (Richardson Maturity Level 3) |
| Libraries | Lombok · Apache POI · SheetJS · date-fns · react-toastify · lucide-react |

---

## System Architecture

```
┌──────────────────────────────────────────────────┐
│         PRESENTATION TIER — React 18 + Vite      │
│  pages/ │ components/ │ services/ │ context/      │
│  Tailwind CSS │ Axios (JWT interceptor)           │
└─────────────────────┬────────────────────────────┘
                      │  HTTPS (Bearer JWT)
┌─────────────────────▼────────────────────────────┐
│      APPLICATION TIER — Spring Boot 3             │
│                                                   │
│  Controllers → Service Interfaces → ServiceImpls  │
│            → Repositories → Entities              │
│                                                   │
│  Security : JwtAuthFilter → @PreAuthorize         │
│  OAuth2   : OAuth2LoginSuccessHandler → JWT       │
│  Scheduler: ExpiredBookingService (15 min cron)   │
└─────────────────────┬────────────────────────────┘
                      │  JPA / JDBC
┌─────────────────────▼────────────────────────────┐
│       DATA TIER — CockroachDB (PostgreSQL)        │
│  users │ bookings │ resources │ incident_tickets  │
│  maintenance_requests │ notifications │ comments  │
└──────────────────────────────────────────────────┘

External Services:
  • Google OAuth2 — SSO for non-admin users
  • Google Authenticator — TOTP 2FA
  • qrserver.com — QR booking pass image generation
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Java JDK | 21+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL-compatible DB | CockroachDB Cloud (or local PostgreSQL 14+) |

---

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/it3030-paf-2026-smart-campus-groupXX.git
cd it3030-paf-2026-smart-campus-groupXX/backend

# 2. Configure environment variables (see section below)
cp src/main/resources/application.properties.example src/main/resources/application.properties
# Edit application.properties with your DB URL, JWT secret, and OAuth2 credentials

# 3. Build and run
mvn clean install
mvn spring-boot:run

# Backend starts at http://localhost:8080
```

To run tests only:
```bash
mvn test
# Test reports generated in target/surefire-reports/
```

---

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your backend URL and Google OAuth2 client ID

# 3. Start development server
npm run dev

# Frontend starts at http://localhost:5173
```

To build for production:
```bash
npm run build
# Output in dist/
```

---

### Environment Variables

**Backend — `application.properties`**

```properties
# Database
spring.datasource.url=jdbc:postgresql://<your-cockroachdb-host>:26257/<dbname>?sslmode=verify-full
spring.datasource.username=your_db_user
spring.datasource.password=your_db_password

# JWT
jwt.secret=your_jwt_secret_key_min_32_chars
jwt.expiration=86400000
jwt.refresh-expiration=604800000

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=your_google_client_id
spring.security.oauth2.client.registration.google.client-secret=your_google_client_secret

# Frontend URL (for OAuth2 redirect)
app.frontend.url=http://localhost:5173

# Admin account (created on first startup if not exists)
app.admin.email=admin@smartcampus.edu
app.admin.password=your_admin_password
```

**Frontend — `.env`**

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## API Endpoints

### Booking Module

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Any | Create booking or maintenance request → 201 |
| `GET` | `/api/bookings/my` | Any | Own paginated bookings with filters → 200 |
| `GET` | `/api/bookings/{id}` | Any | Get single booking → 200 / 404 |
| `PUT` | `/api/bookings/{id}` | Any | Edit PENDING booking purpose/attendees → 200 |
| `DELETE` | `/api/bookings/{id}/cancel` | Any | Cancel booking → 200 |
| `GET` | `/api/bookings` | ADMIN | All bookings with filters → 200 |
| `PATCH` | `/api/bookings/{id}/status` | ADMIN | Approve or reject → 200 |
| `GET` | `/api/bookings/available-slots` | Any | Slot availability for resource + date → 200 |
| `GET` | `/api/bookings/stats` | ADMIN | Dashboard counts → 200 |

### Maintenance Module

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/maintenance/{bookingId}/start` | TECHNICIAN | Start maintenance, sets resource into maintenance mode |
| `POST` | `/api/maintenance/{bookingId}/complete` | TECHNICIAN | Complete maintenance, releases resource |
| `POST` | `/api/maintenance/{bookingId}/extend` | TECHNICIAN | Request extension (days param) |
| `GET` | `/api/maintenance/my-requests` | TECHNICIAN | Own maintenance requests |
| `PATCH` | `/api/maintenance/admin/{id}` | ADMIN | Approve/reject extension |
| `GET` | `/api/maintenance/admin/all` | ADMIN | All maintenance records |

### Ticket Module

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/tickets` | Any | Create ticket with up to 3 image attachments |
| `GET` | `/api/tickets` | Any | Role-filtered ticket list |
| `GET` | `/api/tickets/{id}` | Any | Full ticket details |
| `DELETE` | `/api/tickets/{id}` | Owner | Delete own OPEN ticket |
| `PATCH` | `/api/tickets/{id}/status` | ADMIN | Update status with reason |
| `POST` | `/api/tickets/{id}/assign` | ADMIN | Assign/reassign technician |
| `POST` | `/api/tickets/{id}/start` | TECHNICIAN | Start work → IN_PROGRESS |
| `POST` | `/api/tickets/{id}/resolve` | TECHNICIAN | Add resolution notes → RESOLVED |
| `POST` | `/api/tickets/{id}/return` | TECHNICIAN | Return to OPEN for reassignment |
| `POST` | `/api/tickets/{id}/comments` | Any | Add comment |
| `PUT` | `/api/tickets/{id}/comments/{cid}` | Owner | Edit own comment |
| `DELETE` | `/api/tickets/{id}/comments/{cid}` | Owner/ADMIN | Delete comment |

### Auth & User Module

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Admin email + password → JWT |
| `POST` | `/api/auth/oauth-login` | — | Google OAuth2 token → JWT |
| `POST` | `/api/auth/verify-otp` | — | Submit TOTP code → JWT |
| `POST` | `/api/auth/refresh` | — | Refresh access token |
| `GET` | `/api/users/me` | Any | Own profile (HATEOAS) |
| `PUT` | `/api/users/me/profile` | Any | Update profile |
| `PUT` | `/api/users/me/password` | Any | Change password |
| `POST` | `/api/users/me/mfa/toggle` | Any | Enable/disable 2FA |
| `GET` | `/api/admin/users` | ADMIN | All users (HATEOAS) |
| `POST` | `/api/admin/users` | ADMIN | Create single user |
| `DELETE` | `/api/admin/users/{id}` | ADMIN | Delete user |
| `POST` | `/api/admin/users/bulk-upload` | ADMIN | Import users from Excel |
| `GET` | `/api/admin/users/bulk-upload/template` | ADMIN | Download Excel template |
| `GET` | `/api/notifications` | Any | Paginated notifications |
| `GET` | `/api/notifications/unread/count` | Any | Unread count for badge |
| `PATCH` | `/api/notifications/{id}/read` | Any | Mark one as read |
| `PATCH` | `/api/notifications/read-all` | Any | Mark all as read |

### HTTP Status Codes

| Code | When Returned |
|---|---|
| `200 OK` | All successful GET, PATCH, PUT, DELETE |
| `201 Created` | POST `/api/bookings`, `/api/tickets`, `/api/admin/users` |
| `400 Bad Request` | Validation failures, business rule violations, invalid state transitions |
| `401 Unauthorized` | Missing or expired JWT token |
| `403 Forbidden` | Authenticated but wrong role |
| `404 Not Found` | Entity does not exist |
| `500 Internal Server Error` | Unexpected runtime exception |

---

## User Roles

| Role | Login Method | Key Access |
|---|---|---|
| `ADMIN` | Email + Password + optional 2FA | Full system — users, resources, all bookings, all tickets, dashboards |
| `STUDENT` | Google OAuth2 + optional 2FA | Browse resources, create bookings, submit tickets, own data |
| `STAFF` | Google OAuth2 + optional 2FA | Same as STUDENT |
| `TECHNICIAN` | Google OAuth2 + optional 2FA | STUDENT capabilities + maintenance bookings + assigned incident tickets |

---

## CI/CD Pipeline

MapleLink uses a fully automated Jenkins pipeline that takes every merge into `main` from source code all the way to a running production deployment on AWS EC2, with health checking and automatic rollback.

### Infrastructure

| Component | Technology |
|---|---|
| Automation server | Jenkins |
| Compute | AWS EC2 |
| Container registry | Amazon ECR |
| Networking | AWS VPC + Security Groups |
| Public endpoint | Elastic IP + DuckDNS |
| Container runtime | Docker + Docker Compose |
| Frontend web server | Nginx (Alpine) |
| Secret management | AWS Secrets Manager |

### Pipeline Stages

```
Push / merge to main
        │
        ▼
1. Checkout          — pull latest source from GitHub
2. Backend Test      — fetch secrets from AWS Secrets Manager → ./mvnw clean test
3. Frontend Build    — npm ci → npm run build (production bundle verified)
4. ECR Login         — docker login to Amazon ECR
5. Build Images      — multi-stage Docker build for backend (JDK 21) and frontend (Node 22 → Nginx)
6. Tag & Push        — images tagged as <BUILD_NUMBER> and latest → pushed to ECR
7. Deploy            — SSH into EC2 → write .env.deploy → docker compose pull → docker compose up -d
8. Health Check      — HTTP check against public DuckDNS URL
9. Mark Release      — copy current .env.deploy → previous_success.env
        │
        ▼ (on failure)
10. Rollback         — redeploy using previous_success.env image tags
```

### Docker Image Strategy

**Frontend image** (multi-stage):
- Builder: `node:22-alpine` — runs `npm ci` + `npm run build`
- Runtime: `nginx:stable-alpine` — serves the `dist/` folder with a custom `nginx.conf`

**Backend image** (multi-stage):
- Builder: `eclipse-temurin:21-jdk` — resolves Maven deps + packages the JAR
- Runtime: `eclipse-temurin:21-jre` — runs `java -jar app.jar`

Every build produces images tagged with `$BUILD_NUMBER` for traceability. The deployment environment file records the exact tags in use, making the deployed version always identifiable.

### Secret Management

Sensitive values are never stored in the repository. Jenkins pulls them from **AWS Secrets Manager** at both test time and deployment time and writes a `.env.backend` file on the production server for Docker Compose injection. Managed values include database credentials, JWT secret, token expiry, Google OAuth client credentials, and Spring Boot production settings.

### Deployment Files on the Server

```
~/smart-campus-deploy/
├── docker-compose.yml       # service definitions, ports, networks, env refs
├── .env.deploy              # current backend + frontend image tags
├── .env.backend             # runtime env vars from AWS Secrets Manager
└── previous_success.env     # last known good tags (used for rollback)
```

### Rollback Strategy

Before every deployment Jenkins preserves the last successful `.env.deploy` as `previous_success.env`. If the new deployment fails — including cases where containers start but the public health check fails — Jenkins automatically SSH's back into the server and re-runs Docker Compose with the previous image tags.

### Branching Strategy

```
main          ← production-ready, protected branch (requires PR)
develop       ← integration branch
feature/module-a-resources   ← Member 1
feature/module-b-bookings    ← Member 2
feature/module-c-tickets     ← Member 3
feature/module-d-auth        ← Member 4
```

---

## Project Structure

```
it3030-paf-2026-smart-campus-groupXX/
├── backend/
│   └── src/
│       ├── main/java/com/smartcampus/operations/
│       │   ├── controller/        # HTTP layer — request/response handling
│       │   ├── service/           # Service interfaces (Dependency Inversion)
│       │   │   └── impl/          # Business logic implementations
│       │   ├── repository/        # Spring Data JPA repositories
│       │   ├── entity/            # JPA domain entities
│       │   ├── dto/               # Request/Response DTOs with @Valid
│       │   ├── mapper/            # Entity ↔ DTO converters
│       │   ├── security/          # JWT filter, OAuth2 handler, SecurityConfig
│       │   ├── exception/         # GlobalExceptionHandler + custom exceptions
│       │   └── scheduler/         # ExpiredBookingService, SLA checker
│       └── test/                  # Unit tests (Mockito) + Integration tests (MockMvc)
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── admin/             # AdminBookingManagement, AdminResourceCalendar, UserManagement
        │   ├── booking/           # BookingCalendar, MyBookings
        │   ├── tickets/           # TicketList, CreateTicket, TicketDetail
        │   └── auth/              # Login, OTPVerification, ProfileSettings
        ├── components/            # Header (notifications bell), shared UI components
        ├── services/              # Axios API service modules (bookingService, etc.)
        ├── context/               # AuthContext (user state, JWT storage)
        └── routes/                # Protected route wrappers per role
```

---

## Team Contributions

| Member | Module | Key Deliverables |
|---|---|---|
| Member 1 | Module A — Resource Management | `ResourceController`, `ResourceServiceImpl`, `ResourceSpecification`, image upload, resource admin UI |
| Member 2 | Module B — Booking Management | `BookingController`, `BookingServiceImpl`, `MaintenanceServiceImpl`, `ExpiredBookingService`, `BookingCalendar.jsx`, `AdminBookingManagement.jsx` |
| Member 3 | Module C — Incident Ticketing | `IncidentTicketController`, `TicketServiceImpl`, SLA scheduler, attachment storage, comment system, `TicketList.jsx`, `TechnicianDashboard.jsx` |
| Member 4 | Module D & E — Auth, Users & Notifications | JWT pipeline, OAuth2 handler, TOTP 2FA, `AdminUserController`, bulk import (Apache POI + SheetJS), `NotificationService`, `UserManagement.jsx`, `Header.jsx` |

---

## References

- [Spring Boot 3 Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Security — OAuth2 & JWT](https://docs.spring.io/spring-security/reference/)
- [React 18 Docs](https://react.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs/)
- [CockroachDB Docs](https://www.cockroachlabs.com/docs/)
- [JWT — RFC 7519](https://jwt.io/)
- [Google OAuth2](https://developers.google.com/identity/protocols/oauth2)
- [TOTP — RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238)
- [Apache POI](https://poi.apache.org/)
- [SheetJS](https://sheetjs.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Richardson Maturity Model (HATEOAS)](https://martinfowler.com/articles/richardsonMaturityModel.html)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Amazon ECR](https://docs.aws.amazon.com/ecr/)
- [Docker Documentation](https://docs.docker.com/)
- [DuckDNS](https://www.duckdns.org/)
