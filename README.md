# 🌐 PlanSphere - Enterprise Project Collaboration Platform

> A full-stack MERN project collaboration platform for software and business teams to manage portfolios, projects, milestones, tasks, sprints, issues, comments, files, and team workload with project-scoped RBAC and comprehensive audit logging.

---

## 🏛️ Architecture & Tech Stack

- **Frontend**:
  - React 19 + Vite 8
  - Tailwind CSS + Lucide React
  - React Router v7
  - Optimistic Kanban state updates with HTML5 drag-and-drop
  - 1-Click Role Persona Simulator for instantaneous permission testing
  - Global Search modal (`Ctrl+K` / `Cmd+K`)
  - Real-time in-app notifications & @mentions

- **Backend**:
  - Node.js + Express.js REST API
  - MongoDB + Mongoose data modeling
  - JWT Authentication & Bcrypt password hashing
  - Multi-tier RBAC (Organization Admin vs Project-scoped: PM, Team Lead, Developer, Stakeholder)
  - Multer static file upload handler (`/uploads`)
  - Automated activity feed audit logging & @mention notification dispatching

---

## 👥 Role Hierarchy & RBAC Matrix

| Role | Organization Scope | Project Scope | Permissions & Capabilities |
| :--- | :--- | :--- | :--- |
| **Organization Admin** | Full Authority | Superuser | Manage organization settings, invite members, configure teams, full CRUD across all projects. |
| **Project Manager** | Member | Project Lead | Plan sprints, manage milestones, assign tasks, review risks, export reports, manage project members. |
| **Team Lead** | Member | Team Manager | Manage team workload, review tasks, resolve blockers, start/complete sprints, coordinate releases. |
| **Developer / Member** | Member | Contributor | Move tasks on Kanban board, update progress, comment, attach files, flag blockers, report bugs. |
| **Stakeholder** | Member | Read-Only | Executive view of progress, timeline milestones, risk matrix, burndown charts. Mutations return `403 Forbidden`. |

---

## 🔑 Demo Accounts (Password: `password123` for all)

| Persona Name | Email | Role | Title |
| :--- | :--- | :--- | :--- |
| **Sarah Jenkins** | `admin@plansphere.io` | **Org Admin** | VP of Engineering / Org Admin |
| **David Chen** | `pm@plansphere.io` | **Project Manager** | Senior Technical PM |
| **Elena Rostova** | `lead@plansphere.io` | **Team Lead** | Fullstack Tech Lead |
| **Alex Rivera** | `dev@plansphere.io` | **Developer/Member** | Senior Frontend Engineer |
| **Marcus Vance** | `stakeholder@plansphere.io` | **Stakeholder** | Director of Product & Strategy |

*Tip: The top navigation bar includes an interactive **1-Click Persona Switcher** dropdown allowing you to switch between all 5 roles on the fly!*

---

## 🚀 Key Features

1. **Portfolio Dashboard**:
   - High-level initiative tracking across Software and Business categories.
   - Program risk ratings (Low, Medium, High) and overall portfolio health metrics.
   - 1-click project creation wizard with unique project key generation.

2. **Interactive Kanban Board**:
   - Drag-and-drop swimlanes: `Backlog`, `To Do`, `In Progress`, `In Review`, `Done`.
   - **Optimistic UI Updates**: instant visual feedback with automatic rollback on network failure.
   - Story point badges, priority pills, assignee avatars, attachment counters, and dependency indicators.
   - Multi-parameter filtering by Sprint (Active/All/Backlog), Assignee, Priority, and Search.

3. **Sprint Planning & Backlog Management**:
   - Active sprint header with goal, timeline, and real-time velocity progress.
   - Start planned sprint & Complete active sprint workflow with retrospective capture.
   - Product backlog with direct dropdown actions to move tasks into timeboxed iterations.

4. **Timeline & Milestone Progression (Gantt-Style)**:
   - Milestone tracker with target deadlines and automated progress computation based on linked tasks.
   - Status indicators: `Planned`, `In Progress`, `Achieved`, `Delayed`.
   - Overdue alert badges for milestones past their target completion date.

5. **Team Workload & Capacity Balancing**:
   - Developer capacity calculation based on sprint velocity (13 points / 40 hours threshold).
   - Automated **Overload Warning Badges** for engineers assigned above capacity.
   - Detailed per-member task breakdown (Todo, In Progress, Done, Blocked) with expandable work lists.
   - Unassigned tasks tracking to prevent unallocated scope creep.

6. **Issue & Quality Assurance Tracker**:
   - Severity categorization: `Critical`, `High`, `Medium`, `Low`.
   - Full defect reproduction documentation: reproduction steps, expected behavior, and actual behavior.
   - **Status History Audit Trail**: chronological log of every status change with timestamp and author note.
   - Resolution workflow with explicit resolution notes input and `resolvedBy` attribution.

7. **Reports & Analytics**:
   - **Active Sprint Burndown Chart**: SVG coordinate chart comparing Ideal guide vs Actual burn rate.
   - **Sprint Velocity History**: story points planned vs completed across historical sprints.
   - Status & Priority distribution breakdowns.
   - Export full project telemetry to structured JSON.

8. **Activity Feed & Audit Trail**:
   - Real-time chronological audit trail of all project events (status changes, blocker flags, comments).
   - Filter by entity type: `task`, `issue`, `sprint`, `comment`.

9. **In-App Notifications & Mentions**:
   - In-app notification bell with unread counters and 1-click "Mark All Read".
   - Automated `@name` detection in descriptions and comments that notifies mentioned teammates.

10. **Organization Administration & Teams**:
    - Member directory with role management.
    - Invitation workflow (auto-provisions invited teammates).
    - Cross-functional team squads (e.g. Platform Core, Frontend Experience) with designated team leads.

---

## 🛠️ Running the Application

### 1. Backend Server
```bash
cd backend
npm install
npm run seed     # Seeds realistic demo projects, sprints, tasks, and issues
npm start        # Starts Express API on http://localhost:5000
```

### 2. Frontend Client
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

- Web UI: **http://localhost:5173**
- Backend API: **http://localhost:5000/api**
- Health Check: **http://localhost:5000/api/health**
