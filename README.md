# 🏢 Company OS

AI-Powered Company Operating System — automate and manage entire business operations through intelligent AI agents.

A fully-featured web application with real-time notifications, task management, AI agent execution, knowledge base, email, workflow automation, analytics, file uploads, and an admin system panel.

## What's New

### v0.4.0 — PostgreSQL, Logging, CI/CD

- **PostgreSQL support** — Dual-mode DB adapter: SQLite by default, PostgreSQL when `DATABASE_URL` is set. Auto-converts queries (placeholders, RETURNING id). Full PG migration schema with SERIAL, TIMESTAMPTZ, JSONB, BOOLEAN types. Docker Compose now uses PostgreSQL 16.
- **Structured logging** — Pino logger with pretty-print in dev, JSON in production. Auto-redacts sensitive fields (tokens, passwords). Configurable via `LOG_LEVEL`.
- **CI/CD pipeline** — GitHub Actions: SQLite tests on Node 18/20/22, PostgreSQL tests with PG 16 service container, lint & security audit. Runs on push to main and all PRs.
- **58 tests passing** across 5 test suites.

### v0.3.0 — Production Hardening

- **Testing** — 58 Jest + Supertest tests across 5 test suites
- **Database Migrations** — Versioned migration system with 30+ performance indexes
- **Error Recovery** — Retry with exponential backoff, dead letter queue, execution timeouts
- **Graceful Shutdown** — SIGTERM/SIGINT handlers for clean server stop
- **Real Email** — Nodemailer SMTP + ImapFlow IMAP, falls back to SQLite-only
- **Persistent Scheduler** — DB-persisted cron schedules (survive restarts)
- **DB Hardening** — WAL mode + busy_timeout + 64MB cache + mmap

## Architecture

```
company-os/
├── .github/workflows/ci.yml         # GitHub Actions CI (SQLite + PG + lint)
├── server/
│   ├── __tests__/                   # Jest test suite (58 tests)
│   │   ├── helpers/test-helper.js
│   │   ├── auth.test.js             # 14 tests
│   │   ├── tasks.test.js            # 13 tests
│   │   ├── workflows.test.js        #  8 tests
│   │   ├── ai.test.js               # 11 tests
│   │   └── departments.test.js      # 12 tests
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                # Dual-mode: SQLite + PostgreSQL adapter
│   │   │   ├── logger.js            # Pino structured logger
│   │   │   └── migrate.js           # Versioned migration runner (SQLite + PG)
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT auth + role-based access
│   │   │   ├── rateLimit.js         # Auth endpoint rate limiting
│   │   │   └── validate.js          # Input validation & sanitization
│   │   ├── routes/                  # 12 route modules
│   │   ├── services/
│   │   │   ├── ai-engine.js         # LLM integration (OpenAI-compatible)
│   │   │   ├── email-real.js        # Email (SMTP + IMAP + SQLite)
│   │   │   ├── execution-loop.js    # Auto execution (retry + backoff + DLQ)
│   │   │   ├── scheduler.js         # Cron scheduler (DB-persisted)
│   │   │   ├── workflows.js         # Workflow engine
│   │   │   └── notifications.js     # Socket.IO broadcast
│   │   └── index.js                 # Entry + Socket.IO + graceful shutdown
│   ├── jest.config.js
│   ├── Dockerfile
│   └── package.json
├── web/                             # Next.js 14 frontend
│   ├── app/                         # 12 pages
│   ├── components/                  # 5 shared components
│   ├── lib/                         # API client + auth
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml               # PostgreSQL 16 + server + web
├── .env.example
└── README.md
```

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
# JWT_SECRET is required
openssl rand -base64 32  # generate one
```

### 2. Development (SQLite — no Docker)

```bash
cd server && npm install
npm run migrate   # creates DB + tables + indexes
JWT_SECRET=your-secret npm run dev

# In another terminal:
cd web && npm install && npm run dev
```

### 3. Production (Docker — PostgreSQL)

```bash
# .env — set these:
# JWT_SECRET=your-secret
# POSTGRES_PASSWORD=changeme

docker-compose up --build
```

### 4. Development (PostgreSQL — local)

```bash
# .env — set DATABASE_URL:
# DATABASE_URL=postgres://user:pass@localhost:5432/companyos

cd server && npm run migrate
JWT_SECRET=your-secret npm run dev
```

### Access
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **Health check:** http://localhost:3001/api/health

## Testing

```bash
cd server && npm test          # 58 tests
cd server && npm run test:coverage
cd server && npm run test:watch
```

| Suite | Tests | Coverage |
|-------|-------|----------|
| `auth.test.js` | 14 | Register, login, profile, password, tokens |
| `tasks.test.js` | 13 | CRUD, filters, comments, completion |
| `workflows.test.js` | 8 | CRUD, toggle, triggers, validation |
| `ai.test.js` | 11 | Chat, execution, delegation, agents |
| `departments.test.js` | 12 | Departments, knowledge, email |

## CI/CD (GitHub Actions)

Runs on every push to `main` and every PR:

- **SQLite tests** — Node 18, 20, 22
- **PostgreSQL tests** — Node 20 with PG 16 service container
- **Lint & security audit**

## Database

### Dual-Mode Adapter

The `db.js` module supports both databases with the same API:

| Mode | Trigger | Notes |
|------|---------|-------|
| SQLite | Default | File-based, zero config, good for dev/small teams |
| PostgreSQL | Set `DATABASE_URL` | Production-grade, connection pooling, JSONB |

```javascript
// Same API — works for both:
const result = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const rows = await db.prepare('SELECT * FROM tasks WHERE status = ?').all('pending');
const insert = await db.prepare('INSERT INTO users (...) VALUES (...)').run(...);
// insert.lastInsertRowid works on both SQLite and PG
```

### Migrations

```bash
cd server && npm run migrate   # runs on startup too
```

| Migration | Description |
|-----------|-------------|
| v1 | Initial schema (13 tables) — SQLite + PostgreSQL variants |
| v2 | Performance indexes (22 indexes on common queries) |

### Schema (14 Tables)

| Table | Description |
|-------|-------------|
| `users` | Authentication, roles, profiles |
| `departments` | Organizational units |
| `agents` | AI agent configurations |
| `tasks` | Task management + retry tracking |
| `task_comments` | Task activity and agent responses |
| `messages` | Chat message history |
| `knowledge_base` | Articles and documentation |
| `workflows` | Automation rules |
| `workflow_logs` | Execution history |
| `emails` | Email storage + IMAP fields |
| `notifications` | User notifications |
| `uploads` | File attachment metadata |
| `scheduled_tasks` | DB-persisted cron schedules |
| `schema_migrations` | Migration version tracking |

## Error Recovery

- **Retry with exponential backoff** — 10s → 20s → 40s (max 3 retries)
- **Dead letter queue** — permanently failed tasks with error details
- **Execution timeout** — configurable, default 2 minutes
- **Notifications** — creators notified on retry, failure, and dead-letter

## Real Email (SMTP + IMAP)

```bash
# Outbound (SMTP) — real sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Inbound (IMAP) — polling for new emails
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-app-password
```

Without SMTP/IMAP config, email stores in SQLite only.

## Features

### 🔐 Security
- JWT authentication (secret required, no fallback)
- bcrypt password hashing (10 rounds)
- Role-based access (admin, manager, member)
- Auth rate limiting (20 attempts / 15 min)
- Helmet, CORS, input validation, file type blocking

### 🏢 Departments
- CRUD with icon, color, description
- Detail view: members, agents, tasks
- Admin-only create/delete

### 📋 Tasks
- Priority (urgent/high/medium/low) + status (pending/in_progress/review/completed/blocked)
- Assign to users or AI agents, due dates, retry tracking
- Comments, file attachments, notifications

### 🤖 AI Agents
- Per-department config, system prompt, model selection
- Auto-execution loop with retry + backoff + dead letter queue
- Agent-to-agent delegation
- Simulated fallback when no LLM API key

### ⚡ Auto-Execution Loop
- Polls every 30s, max 3 concurrent, priority-ordered
- Exponential backoff retry, dead letter after max retries
- Execution timeouts, admin toggle + manual trigger

### ⏰ Cron Scheduler
- DB-persisted (survives restarts)
- Daily, weekly, interval schedules
- Per-schedule agent + priority

### 💬 Real-Time Chat
- Socket.IO with typing indicators
- Channel-based, direct agent chat
- Message history persistence

### 📚 Knowledge Base
- CRUD, full-text search, tags, category filtering

### 📧 Email
- Inbox/Sent/Drafts/Starred, compose, reply
- AI draft replies (LLM when configured)
- IMAP inbound polling

### ⚡ Workflow Engine
- Triggers: task_created, task_completed, schedule_daily, user_registered
- Conditions: equals, contains, greater_than, past_due, exists
- Actions: notify, update_task, send_message, create_task

### 📈 Analytics, 🔔 Notifications, 🔍 Command Palette, 📎 File Uploads, ⚙️ Admin Panel

## Environment Variables

```bash
# Required
JWT_SECRET=your-secret-here

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database (SQLite default, PostgreSQL optional)
DB_PATH=./data/company-os.db
# DATABASE_URL=postgres://user:pass@localhost:5432/companyos

# LLM
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=sk-...
DEFAULT_MODEL=gpt-4

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# IMAP
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-app-password

# Logging
LOG_LEVEL=info   # trace, debug, info, warn, error, fatal

# PostgreSQL (Docker)
POSTGRES_USER=companyos
POSTGRES_PASSWORD=changeme
POSTGRES_DB=companyos
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Frontend | Next.js 14 (App Router), React 18 |
| Database | SQLite (default) / PostgreSQL 16 (production) |
| Migrations | Custom versioned runner (SQLite + PG) |
| Real-time | Socket.IO |
| Auth | JWT + bcrypt |
| Logging | Pino (structured JSON) |
| AI | OpenAI-compatible API (pluggable) |
| Email | Nodemailer (SMTP) + ImapFlow (IMAP) |
| Uploads | Multer |
| Testing | Jest + Supertest |
| CI/CD | GitHub Actions |
| Deploy | Docker, docker-compose |

## License

MIT
