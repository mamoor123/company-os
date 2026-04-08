<div align="center">

# 🐝 HiveOps

### AI-Powered Company Operating System

*Automate your entire business through intelligent AI agents.*

[![CI](https://github.com/mamoor123/hiveops/actions/workflows/ci.yml/badge.svg)](https://github.com/mamoor123/hiveops/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-58%20passing-brightgreen)]()
[![Node](https://img.shields.io/badge/node-18%20|%2020%20|%2022-green)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [API](#-api) · [Contributing](#-contributing)

</div>

---

HiveOps is a fully-featured company OS with real-time notifications, task management, AI agent execution, knowledge base, email, workflow automation, and an admin panel — all running on a **dual-mode database** (SQLite for dev, PostgreSQL for production).

> Give each department an AI agent. Set up workflows. Watch it run.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 AI Agents
- Per-department config with system prompts
- Auto-execution loop with retry + dead letter queue
- Agent-to-agent delegation
- Simulated fallback when no LLM API key

### 📋 Task Management
- Priority levels (urgent → low) + status tracking
- Assign to users or AI agents
- Comments, file attachments, notifications
- Due dates with retry tracking

### ⚡ Workflow Engine
- **Triggers:** task_created, task_completed, schedule_daily, user_registered
- **Conditions:** equals, contains, greater_than, past_due, exists
- **Actions:** notify, update_task, send_message, create_task

</td>
<td width="50%">

### 💬 Real-Time Chat
- Socket.IO with typing indicators
- Channel-based + direct agent chat
- Persistent message history

### 📧 Email
- Inbox / Sent / Drafts / Starred
- AI-powered draft replies
- IMAP inbound polling
- SMTP outbound (Gmail, etc.)

### 📚 Knowledge Base
- Full-text search + tags
- Category filtering
- CRUD with rich content

</td>
</table>

### 🔐 Security

| Feature | Detail |
|---------|--------|
| Authentication | JWT (secret required, no fallback) |
| Passwords | bcrypt, 10 rounds |
| Access Control | Role-based: admin, manager, member |
| Rate Limiting | 20 attempts / 15 min on auth endpoints |
| HTTP Security | Helmet, CORS, input validation |
| Logging | Pino structured JSON, auto-redacts secrets |

---

## 🚀 Quick Start

### Option 1: SQLite (zero config)

```bash
git clone https://github.com/mamoor123/hiveops.git && cd hiveops

# Setup
cp .env.example .env
openssl rand -base64 32  # → paste into JWT_SECRET

# Server
cd server && npm install && npm run migrate
JWT_SECRET=your-secret npm run dev

# Frontend (new terminal)
cd web && npm install && npm run dev
```

### Option 2: Docker (PostgreSQL)

```bash
cp .env.example .env
# Set JWT_SECRET and POSTGRES_PASSWORD in .env

docker-compose up --build
```

### 📍 Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Health Check | http://localhost:3001/api/health |

---

## 🏗 Architecture

```
hiveops/
├── server/                          # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                # Dual-mode: SQLite + PostgreSQL
│   │   │   ├── logger.js            # Pino structured logging
│   │   │   └── migrate.js           # Versioned migration runner
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT + role-based access
│   │   │   ├── rateLimit.js         # Brute-force protection
│   │   │   └── validate.js          # Input sanitization
│   │   ├── routes/                  # 12 route modules
│   │   └── services/
│   │       ├── ai-engine.js         # OpenAI-compatible LLM
│   │       ├── email-real.js        # SMTP + IMAP
│   │       ├── execution-loop.js    # Retry + backoff + DLQ
│   │       ├── scheduler.js         # DB-persisted cron
│   │       ├── workflows.js         # Rule engine
│   │       └── notifications.js     # Socket.IO broadcast
│   └── __tests__/                   # 58 tests (Jest + Supertest)
│
├── web/                             # Next.js 14 (App Router)
│   ├── app/                         # 12 pages
│   ├── components/                  # Shared UI components
│   └── lib/                         # API client + auth
│
├── docker-compose.yml               # PostgreSQL 16 + server + web
└── .github/workflows/ci.yml         # CI (SQLite + PG + lint)
```

### Database

HiveOps uses a **dual-mode adapter** — same API, two backends:

```javascript
// Works identically on SQLite and PostgreSQL:
const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const tasks = await db.prepare('SELECT * FROM tasks WHERE status = ?').all('pending');
const result = await db.prepare('INSERT INTO users (...) VALUES (...)').run(...);
```

| Mode | Trigger | Best for |
|------|---------|----------|
| 📦 SQLite | Default | Dev, prototyping, small teams |
| 🐘 PostgreSQL | `DATABASE_URL` set | Production, scale, JSONB queries |

**14 tables:** users, departments, agents, tasks, task_comments, messages, knowledge_base, workflows, workflow_logs, emails, notifications, uploads, scheduled_tasks, schema_migrations

### Error Recovery

```
Task fails → retry (10s) → retry (20s) → retry (40s) → dead letter queue
                                                    ↓
                                            notify creator
```

- Exponential backoff (max 3 retries)
- Configurable execution timeout (default 2 min)
- Dead letter queue with error details
- Auto-notifications on failure

---

## 🧪 Testing

```bash
cd server && npm test             # 58 tests
cd server && npm run test:coverage
cd server && npm run test:watch
```

| Suite | Tests | What it covers |
|-------|-------|----------------|
| `auth.test.js` | 14 | Register, login, profile, password, tokens |
| `tasks.test.js` | 13 | CRUD, filters, comments, completion |
| `workflows.test.js` | 8 | CRUD, toggle, triggers, validation |
| `ai.test.js` | 11 | Chat, execution, delegation, agents |
| `departments.test.js` | 12 | Departments, knowledge, email |

---

## 🔌 API

<details>
<summary><b>Auth</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Current user profile |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/change-password` | Change password |

</details>

<details>
<summary><b>Tasks</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (filterable) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Task detail |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |

</details>

<details>
<summary><b>AI Agents</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| POST | `/api/ai/chat/:agentId` | Chat with agent |
| POST | `/api/ai/execute/:taskId` | Execute task via agent |

</details>

<details>
<summary><b>Workflows</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create workflow |
| PUT | `/api/workflows/:id` | Update workflow |
| POST | `/api/workflows/:id/toggle` | Enable/disable |

</details>

<details>
<summary><b>Email, Knowledge, Departments, Notifications</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/email/inbox` | List inbox |
| POST | `/api/email/send` | Send email |
| GET | `/api/knowledge` | List articles |
| POST | `/api/knowledge/search` | Search articles |
| GET | `/api/departments` | List departments |
| GET | `/api/notifications` | List notifications |

</details>

---

## ⚙️ Environment Variables

<details>
<summary><b>Full reference</b></summary>

```bash
# ── Required ──
JWT_SECRET=your-secret-here

# ── Server ──
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# ── Database ──
DB_PATH=./data/hiveops.db                        # SQLite (default)
# DATABASE_URL=postgres://user:pass@localhost:5432/hiveops  # PostgreSQL

# ── AI / LLM ──
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=sk-...
DEFAULT_MODEL=gpt-4

# ── SMTP (Outbound) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ── IMAP (Inbound) ──
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-app-password

# ── Logging ──
LOG_LEVEL=info   # trace | debug | info | warn | error | fatal

# ── PostgreSQL (Docker) ──
POSTGRES_USER=hiveops
POSTGRES_PASSWORD=changeme
POSTGRES_DB=hiveops
```

</details>

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express |
| **Frontend** | Next.js 14, React 18 |
| **Database** | SQLite / PostgreSQL 16 |
| **Real-time** | Socket.IO |
| **Auth** | JWT + bcrypt |
| **Logging** | Pino |
| **AI** | OpenAI-compatible API |
| **Email** | Nodemailer + ImapFlow |
| **Testing** | Jest + Supertest |
| **CI/CD** | GitHub Actions |
| **Deploy** | Docker, docker-compose |

---

## 🤝 Contributing

```bash
# Fork & clone
git clone https://github.com/mamoor123/hiveops.git

# Create feature branch
git checkout -b feature/your-idea

# Make changes, test
cd server && npm test

# Push & open PR
git push origin feature/your-idea
```

---

<div align="center">

**[⬆ back to top](#-hiveops)**

Made with 🐝 by [mamoor123](https://github.com/mamoor123)

</div>
