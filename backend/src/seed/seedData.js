const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const User = require('../models/User');
const Organization = require('../models/Organization');
const OrgMember = require('../models/OrgMember');
const Team = require('../models/Team');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Milestone = require('../models/Milestone');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plansphere';
    console.log(`Connecting to MongoDB for seeding at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      OrgMember.deleteMany({}),
      Team.deleteMany({}),
      Project.deleteMany({}),
      ProjectMember.deleteMany({}),
      Milestone.deleteMany({}),
      Sprint.deleteMany({}),
      Task.deleteMany({}),
      Issue.deleteMany({}),
      Comment.deleteMany({}),
      Activity.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log('Creating Seed Users with specific roles...');

    // Hash password upfront for all seed users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const usersData = [
      {
        name: 'Sarah Jenkins',
        email: 'admin@plansphere.io',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        jobTitle: 'VP of Engineering / Org Admin',
        department: 'Executive Leadership',
        systemRole: 'superadmin'
      },
      {
        name: 'David Chen',
        email: 'pm@plansphere.io',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        jobTitle: 'Senior Technical Project Manager',
        department: 'Product Management',
        systemRole: 'user'
      },
      {
        name: 'Elena Rostova',
        email: 'lead@plansphere.io',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        jobTitle: 'Fullstack Tech Lead',
        department: 'Platform Architecture',
        systemRole: 'user'
      },
      {
        name: 'Alex Rivera',
        email: 'dev@plansphere.io',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        jobTitle: 'Senior Frontend Engineer',
        department: 'Engineering',
        systemRole: 'user'
      },
      {
        name: 'Marcus Vance',
        email: 'stakeholder@plansphere.io',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        jobTitle: 'Director of Product & Strategy',
        department: 'Strategic Operations',
        systemRole: 'user'
      },
      {
        name: 'Priya Patel',
        email: 'priya.patel@plansphere.io',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        jobTitle: 'Backend Core Specialist',
        department: 'Engineering',
        systemRole: 'user'
      },
      {
        name: 'Jordan Lee',
        email: 'jordan.lee@plansphere.io',
        password: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        jobTitle: 'DevOps & Reliability Engineer',
        department: 'Infrastructure',
        systemRole: 'user'
      }
    ];

    const users = await User.insertMany(usersData);
    const userMap = {};
    users.forEach((u) => {
      userMap[u.email] = u;
    });

    console.log('Creating Organizations...');
    const org1 = await Organization.create({
      name: 'TechSphere Enterprise Solutions',
      slug: 'techsphere-enterprise',
      description: 'Global cloud solutions and high-throughput microservices engineering',
      logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=TechSphere',
      owner: userMap['admin@plansphere.io']._id
    });

    const org2 = await Organization.create({
      name: 'Apex FinTech Innovations',
      slug: 'apex-fintech',
      description: 'Next-generation algorithmic banking and payment infrastructure',
      logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ApexFintech',
      owner: userMap['admin@plansphere.io']._id
    });

    console.log('Adding Organization Memberships...');
    const orgMembers = [
      { organization: org1._id, user: userMap['admin@plansphere.io']._id, role: 'Org Admin' },
      { organization: org1._id, user: userMap['pm@plansphere.io']._id, role: 'Member' },
      { organization: org1._id, user: userMap['lead@plansphere.io']._id, role: 'Member' },
      { organization: org1._id, user: userMap['dev@plansphere.io']._id, role: 'Member' },
      { organization: org1._id, user: userMap['stakeholder@plansphere.io']._id, role: 'Member' },
      { organization: org1._id, user: userMap['priya.patel@plansphere.io']._id, role: 'Member' },
      { organization: org1._id, user: userMap['jordan.lee@plansphere.io']._id, role: 'Member' },
      // Org2
      { organization: org2._id, user: userMap['admin@plansphere.io']._id, role: 'Org Admin' },
      { organization: org2._id, user: userMap['pm@plansphere.io']._id, role: 'Member' }
    ];
    await OrgMember.insertMany(orgMembers);

    console.log('Creating Cross-Functional Teams...');
    const teams = await Team.insertMany([
      {
        name: 'Platform Core & Cloud',
        organization: org1._id,
        lead: userMap['lead@plansphere.io']._id,
        members: [
          userMap['lead@plansphere.io']._id,
          userMap['priya.patel@plansphere.io']._id,
          userMap['jordan.lee@plansphere.io']._id
        ],
        description: 'Underlying distributed messaging, caching, and multi-tenant DB sharding'
      },
      {
        name: 'Frontend & UI Experience',
        organization: org1._id,
        lead: userMap['dev@plansphere.io']._id,
        members: [
          userMap['dev@plansphere.io']._id,
          userMap['lead@plansphere.io']._id
        ],
        description: 'Design system, interactive real-time kanban boards, and accessible dashboards'
      }
    ]);

    console.log('Creating Projects...');
    const project1 = await Project.create({
      name: 'CloudScale NextGen Platform',
      key: 'CLOUD',
      description: 'Scalable multi-cloud microservices platform with real-time auditability and high availability',
      organization: org1._id,
      lead: userMap['pm@plansphere.io']._id,
      status: 'active',
      category: 'software',
      startDate: new Date('2026-08-01'),
      targetDate: new Date('2026-12-15'),
      budget: 350000,
      riskLevel: 'Medium'
    });

    const project2 = await Project.create({
      name: 'Mobile Banking 2.0 Modernization',
      key: 'BANK',
      description: 'Biometric authorization, instant SEPA settlement, and micro-investment portfolio tracker',
      organization: org1._id,
      lead: userMap['pm@plansphere.io']._id,
      status: 'active',
      category: 'software',
      startDate: new Date('2026-08-15'),
      targetDate: new Date('2026-11-30'),
      budget: 200000,
      riskLevel: 'Low'
    });

    const project3 = await Project.create({
      name: 'Q4 Global Enterprise Marketing Rollout',
      key: 'MKTG',
      description: 'Cross-channel software adoption campaign, enterprise webinars, and sales enablement collateral',
      organization: org1._id,
      lead: userMap['pm@plansphere.io']._id,
      status: 'active',
      category: 'business',
      startDate: new Date('2026-09-01'),
      targetDate: new Date('2026-10-31'),
      budget: 85000,
      riskLevel: 'Low'
    });

    console.log('Assigning Project-Scoped RBAC Roles...');
    // CLOUD Project assignments
    await ProjectMember.insertMany([
      { project: project1._id, user: userMap['pm@plansphere.io']._id, role: 'Project Manager' },
      { project: project1._id, user: userMap['lead@plansphere.io']._id, role: 'Team Lead' },
      { project: project1._id, user: userMap['dev@plansphere.io']._id, role: 'Developer/Member' },
      { project: project1._id, user: userMap['priya.patel@plansphere.io']._id, role: 'Developer/Member' },
      { project: project1._id, user: userMap['jordan.lee@plansphere.io']._id, role: 'Developer/Member' },
      { project: project1._id, user: userMap['stakeholder@plansphere.io']._id, role: 'Stakeholder' },

      // BANK Project assignments
      { project: project2._id, user: userMap['pm@plansphere.io']._id, role: 'Project Manager' },
      { project: project2._id, user: userMap['lead@plansphere.io']._id, role: 'Team Lead' },
      { project: project2._id, user: userMap['dev@plansphere.io']._id, role: 'Developer/Member' },
      { project: project2._id, user: userMap['stakeholder@plansphere.io']._id, role: 'Stakeholder' },

      // MKTG Project assignments
      { project: project3._id, user: userMap['pm@plansphere.io']._id, role: 'Project Manager' },
      { project: project3._id, user: userMap['stakeholder@plansphere.io']._id, role: 'Stakeholder' }
    ]);

    console.log('Creating Sprints for CloudScale Project...');
    const sprint1 = await Sprint.create({
      project: project1._id,
      name: 'Sprint 1 - Foundation & Schemas',
      goal: 'Define MongoDB collections, JWT auth token lifecycle, and REST scaffold',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-14'),
      status: 'completed',
      velocity: 32,
      retrospective: 'Delivered core schema migration on time; need faster automated lint runs'
    });

    const sprint2 = await Sprint.create({
      project: project1._id,
      name: 'Sprint 2 - Kanban Board & Real-time State',
      goal: 'Implement drag-and-drop swimlanes, optimistic updates, and activity feeds',
      startDate: new Date('2026-08-15'),
      endDate: new Date('2026-08-28'),
      status: 'completed',
      velocity: 36,
      retrospective: 'Drag-and-drop state sync achieved under 30ms latency!'
    });

    const sprint3 = await Sprint.create({
      project: project1._id,
      name: 'Sprint 3 - Workload & Gantt Timeline',
      goal: 'Deliver interactive capacity balancing, milestone timeline, and issue severity workflows',
      startDate: new Date('2026-08-29'),
      endDate: new Date('2026-09-12'),
      status: 'completed',
      velocity: 40,
      retrospective: 'Workload calculations successfully alert when members exceed 13 story points'
    });

    const activeSprint = await Sprint.create({
      project: project1._id,
      name: 'Sprint 4 - Real-time Collaboration & Auth',
      goal: 'Deliver @mentions notifications, file attachments, and audit trail export',
      startDate: new Date('2026-09-13'),
      endDate: new Date('2026-09-27'),
      status: 'active',
      velocity: 0,
      retrospective: ''
    });

    const plannedSprint = await Sprint.create({
      project: project1._id,
      name: 'Sprint 5 - Enterprise Scalability & Hardening',
      goal: 'SOC2 type 2 audit logs, stress test 5,000 concurrent socket connections',
      startDate: new Date('2026-09-28'),
      endDate: new Date('2026-10-12'),
      status: 'planned',
      velocity: 0,
      retrospective: ''
    });

    console.log('Creating Milestones for CloudScale Project...');
    const m1 = await Milestone.create({
      project: project1._id,
      title: 'Milestone 1: Architectural Baseline & Security Sign-off',
      description: 'Complete threat matrix, role permissions, and zero-trust authentication handshake',
      dueDate: new Date('2026-08-20'),
      status: 'achieved',
      progress: 100
    });

    const m2 = await Milestone.create({
      project: project1._id,
      title: 'Milestone 2: Beta Collaboration Feature Complete',
      description: 'Interactive Kanban, sprint velocity tracking, workload dashboard, and issue resolutions',
      dueDate: new Date('2026-09-25'),
      status: 'in_progress',
      progress: 75
    });

    const m3 = await Milestone.create({
      project: project1._id,
      title: 'Milestone 3: Production Readiness & Enterprise Pilot',
      description: 'End-to-end load testing, multi-org isolation verification, and high availability failover',
      dueDate: new Date('2026-10-25'),
      status: 'planned',
      progress: 20
    });

    const m4 = await Milestone.create({
      project: project1._id,
      title: 'Milestone 4: Global Public Availability (GA)',
      description: 'General availability launch with full enterprise documentation and SLA guarantee',
      dueDate: new Date('2026-12-10'),
      status: 'planned',
      progress: 0
    });

    console.log('Creating Rich Tasks across Kanban Columns...');
    const tasksData = [
      // Done Column (Completed in Sprint 4 or earlier)
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-101',
        title: 'Design resilient JWT refresh token rotation mechanism',
        description: 'Implement short-lived access tokens with cryptographic rotation. Handled by @Elena and validated with @David.',
        type: 'story',
        status: 'done',
        priority: 'high',
        storyPoints: 5,
        assignee: userMap['lead@plansphere.io']._id,
        reporter: userMap['pm@plansphere.io']._id,
        estimatedHours: 12,
        loggedHours: 11,
        labels: ['Security', 'Auth', 'Backend'],
        order: 0
      },
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-102',
        title: 'Build responsive Drag-and-Drop Kanban swimlanes',
        description: 'Smooth visual drag indicators with HTML5 drag events and optimistic state updates. Review requested from @Alex.',
        type: 'task',
        status: 'done',
        priority: 'urgent',
        storyPoints: 8,
        assignee: userMap['dev@plansphere.io']._id,
        reporter: userMap['lead@plansphere.io']._id,
        estimatedHours: 20,
        loggedHours: 18,
        labels: ['Frontend', 'Kanban', 'UI/UX'],
        order: 1
      },
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-103',
        title: 'Setup automated Mongoose connection retry logic',
        description: 'Ensure graceful reconnection during transient database failover scenarios.',
        type: 'task',
        status: 'done',
        priority: 'medium',
        storyPoints: 3,
        assignee: userMap['priya.patel@plansphere.io']._id,
        reporter: userMap['lead@plansphere.io']._id,
        estimatedHours: 8,
        loggedHours: 7,
        labels: ['Database', 'Reliability'],
        order: 2
      },

      // In Review Column
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-104',
        title: 'In-app @mentions parser & notification banner',
        description: 'Auto-detect `@username` in descriptions and comment threads, triggering notifications. In code review with @Elena.',
        type: 'story',
        status: 'in_review',
        priority: 'high',
        storyPoints: 5,
        assignee: userMap['dev@plansphere.io']._id,
        reporter: userMap['pm@plansphere.io']._id,
        estimatedHours: 14,
        loggedHours: 12,
        labels: ['Frontend', 'Notifications'],
        order: 0
      },
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-105',
        title: 'Multer static attachment uploads & thumbnail preview',
        description: 'Enable drag-and-drop file uploading for task and issue cards with 15MB file ceiling.',
        type: 'task',
        status: 'in_review',
        priority: 'medium',
        storyPoints: 3,
        assignee: userMap['priya.patel@plansphere.io']._id,
        reporter: userMap['dev@plansphere.io']._id,
        estimatedHours: 10,
        loggedHours: 9,
        labels: ['Backend', 'Storage', 'Files'],
        order: 1
      },

      // In Progress Column
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-106',
        title: 'Team workload capacity calculator & overload warning badges',
        description: 'Calculate assigned story points per sprint per developer. Flag warning when points exceed capacity (13 pts).',
        type: 'story',
        status: 'in_progress',
        priority: 'urgent',
        storyPoints: 8,
        assignee: userMap['lead@plansphere.io']._id,
        reporter: userMap['pm@plansphere.io']._id,
        estimatedHours: 16,
        loggedHours: 8,
        labels: ['Analytics', 'Workload', 'Core'],
        order: 0
      },
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-107',
        title: 'Project timeline interactive Gantt milestone bars',
        description: 'Visual timeline showing milestone dates, sprint bounds, and overdue task indicators.',
        type: 'story',
        status: 'in_progress',
        priority: 'high',
        storyPoints: 5,
        assignee: userMap['dev@plansphere.io']._id,
        reporter: userMap['pm@plansphere.io']._id,
        estimatedHours: 14,
        loggedHours: 6,
        labels: ['Timeline', 'Milestones', 'Frontend'],
        order: 1
      },
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-108',
        title: 'Prometheus metrics & health check endpoint',
        description: 'Expose /api/health with system telemetry and DB response latencies.',
        type: 'task',
        status: 'in_progress',
        priority: 'medium',
        storyPoints: 3,
        assignee: userMap['jordan.lee@plansphere.io']._id,
        reporter: userMap['lead@plansphere.io']._id,
        estimatedHours: 8,
        loggedHours: 4,
        labels: ['DevOps', 'Observability'],
        order: 2
      },

      // To Do Column
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-109',
        title: 'Export sprint velocity & burndown to CSV/JSON report',
        description: 'Allow Project Managers and Stakeholders like @Marcus to export progress reports.',
        type: 'task',
        status: 'todo',
        priority: 'medium',
        storyPoints: 3,
        assignee: userMap['pm@plansphere.io']._id,
        reporter: userMap['stakeholder@plansphere.io']._id,
        estimatedHours: 6,
        loggedHours: 0,
        labels: ['Reporting', 'Export'],
        order: 0
      },
      {
        project: project1._id,
        sprint: activeSprint._id,
        milestone: m2._id,
        taskNumber: 'CLOUD-110',
        title: 'Enterprise SSO SAML 2.0 integration sandbox',
        description: 'Test Okta & Azure AD directory sync with project role mapping.',
        type: 'epic',
        status: 'todo',
        priority: 'high',
        storyPoints: 8,
        assignee: userMap['jordan.lee@plansphere.io']._id,
        reporter: userMap['admin@plansphere.io']._id,
        estimatedHours: 24,
        loggedHours: 0,
        isBlocked: true,
        blockerReason: 'Awaiting vendor security certificate from enterprise test tenant.',
        labels: ['Enterprise', 'Security', 'SSO'],
        order: 1
      },

      // Backlog (No sprint or backlog status)
      {
        project: project1._id,
        sprint: null,
        milestone: m3._id,
        taskNumber: 'CLOUD-111',
        title: 'Audit log search with date range and entity filtering',
        description: 'Full-text indexing on activity collection for compliance auditing.',
        type: 'story',
        status: 'backlog',
        priority: 'medium',
        storyPoints: 5,
        assignee: null,
        reporter: userMap['pm@plansphere.io']._id,
        estimatedHours: 12,
        loggedHours: 0,
        labels: ['Compliance', 'Audit'],
        order: 0
      },
      {
        project: project1._id,
        sprint: null,
        milestone: m3._id,
        taskNumber: 'CLOUD-112',
        title: 'Multi-region Redis read replica synchronization',
        description: 'Scale session caching across US-East and EU-West clusters.',
        type: 'task',
        status: 'backlog',
        priority: 'low',
        storyPoints: 5,
        assignee: userMap['jordan.lee@plansphere.io']._id,
        reporter: userMap['lead@plansphere.io']._id,
        estimatedHours: 15,
        loggedHours: 0,
        labels: ['Infrastructure', 'Redis'],
        order: 1
      }
    ];

    const tasks = await Task.insertMany(tasksData);
    const taskMap = {};
    tasks.forEach((t) => {
      taskMap[t.taskNumber] = t;
    });

    // Link task dependency: CLOUD-104 depends on CLOUD-102
    await Task.findOneAndUpdate(
      { taskNumber: 'CLOUD-104' },
      { dependencies: [taskMap['CLOUD-102']._id] }
    );

    console.log('Creating Realistic Software Issues (Bugs) with Status Histories...');
    const issuesData = [
      {
        project: project1._id,
        task: taskMap['CLOUD-102']._id,
        issueNumber: 'CLOUD-BUG-1',
        title: 'Kanban card drops to bottom if cursor hovers column margin',
        description: 'Dragging a card across columns occasionally slips into the bottom index when moving mouse quickly.',
        severity: 'medium',
        priority: 'medium',
        status: 'in_progress',
        reproductionSteps: '1. Drag CLOUD-106 from In Progress to In Review\n2. Move cursor along the 8px border divider\n3. Release mouse click',
        expectedBehavior: 'Card inserts cleanly into the hovered position slot.',
        actualBehavior: 'Card snaps to the final index of the target swimlane.',
        assignee: userMap['dev@plansphere.io']._id,
        reporter: userMap['lead@plansphere.io']._id,
        statusHistory: [
          { status: 'open', changedBy: userMap['lead@plansphere.io']._id, changedAt: new Date(Date.now() - 48 * 3600000), note: 'Discovered in testing' },
          { status: 'in_progress', changedBy: userMap['dev@plansphere.io']._id, changedAt: new Date(Date.now() - 24 * 3600000), note: 'Working on drag coordinates calculation' }
        ]
      },
      {
        project: project1._id,
        task: null,
        issueNumber: 'CLOUD-BUG-2',
        title: 'Critical: Rate-limiter resets too slowly on batch webhook triggers',
        description: 'Third-party integrations get intermittent 429 Too Many Requests when syncing 100+ events simultaneously.',
        severity: 'critical',
        priority: 'urgent',
        status: 'open',
        reproductionSteps: '1. Send 120 API requests in a 3-second burst using mock test suite\n2. Inspect 429 response rate header',
        expectedBehavior: 'Token bucket should allow burst up to 200 req/min.',
        actualBehavior: 'Bucket caps strictly at 50 req/min without burst allowance.',
        assignee: userMap['priya.patel@plansphere.io']._id,
        reporter: userMap['stakeholder@plansphere.io']._id,
        statusHistory: [
          { status: 'open', changedBy: userMap['stakeholder@plansphere.io']._id, changedAt: new Date(Date.now() - 12 * 3600000), note: 'Reported by Enterprise pilot partner' }
        ]
      },
      {
        project: project1._id,
        task: taskMap['CLOUD-101']._id,
        issueNumber: 'CLOUD-BUG-3',
        title: 'Expired JWT token returned wrong error payload format',
        description: 'Server was returning HTML 500 stack trace instead of standard JSON { success: false, message: "Token expired" }',
        severity: 'high',
        priority: 'high',
        status: 'resolved',
        reproductionSteps: '1. Forge expired Bearer token\n2. Call GET /api/projects',
        expectedBehavior: 'HTTP 401 with structured JSON message',
        actualBehavior: 'Raw HTML 500 error returned prior to fix',
        resolutionNotes: 'Updated errorHandler middleware to catch TokenExpiredError and return 401 JSON.',
        resolvedBy: userMap['lead@plansphere.io']._id,
        resolvedAt: new Date(Date.now() - 6 * 3600000),
        assignee: userMap['lead@plansphere.io']._id,
        reporter: userMap['pm@plansphere.io']._id,
        statusHistory: [
          { status: 'open', changedBy: userMap['pm@plansphere.io']._id, changedAt: new Date(Date.now() - 72 * 3600000), note: 'Discovered during API contract audit' },
          { status: 'in_progress', changedBy: userMap['lead@plansphere.io']._id, changedAt: new Date(Date.now() - 36 * 3600000), note: 'Refactoring errorHandler' },
          { status: 'resolved', changedBy: userMap['lead@plansphere.io']._id, changedAt: new Date(Date.now() - 6 * 3600000), note: 'Fixed in commit 8a4c10' }
        ]
      }
    ];

    const issues = await Issue.insertMany(issuesData);

    console.log('Adding Comments with Mentions...');
    await Comment.insertMany([
      {
        project: project1._id,
        task: taskMap['CLOUD-102']._id,
        author: userMap['lead@plansphere.io']._id,
        content: 'Great progress @Alex! The smooth drop animation looks crisp. Can we ensure keyboard accessibility (Enter/Space) is also supported?',
        mentions: [userMap['dev@plansphere.io']._id]
      },
      {
        project: project1._id,
        task: taskMap['CLOUD-102']._id,
        author: userMap['dev@plansphere.io']._id,
        content: 'Thanks @Elena! Working on keyboard navigation right now. Will have a patch ready by EOD.',
        mentions: [userMap['lead@plansphere.io']._id]
      },
      {
        project: project1._id,
        task: taskMap['CLOUD-106']._id,
        author: userMap['pm@plansphere.io']._id,
        content: '@Marcus - The team capacity view now accurately accounts for vacation days and sprint velocities!',
        mentions: [userMap['stakeholder@plansphere.io']._id]
      },
      {
        project: project1._id,
        issue: issues[0]._id,
        author: userMap['dev@plansphere.io']._id,
        content: 'Isolated the root cause to an offset calculation in the boundingClientRect check. Submitting fix PR shortly.',
        mentions: []
      }
    ]);

    console.log('Creating In-App Notifications...');
    await Notification.insertMany([
      {
        recipient: userMap['dev@plansphere.io']._id,
        sender: userMap['lead@plansphere.io']._id,
        project: project1._id,
        organization: org1._id,
        type: 'mention',
        title: 'Mentioned in CLOUD-102',
        message: 'Elena Rostova mentioned you in "Build responsive Drag-and-Drop Kanban swimlanes"',
        link: `/projects/${project1._id}?tab=board&taskId=${taskMap['CLOUD-102']._id}`,
        read: false
      },
      {
        recipient: userMap['dev@plansphere.io']._id,
        sender: userMap['pm@plansphere.io']._id,
        project: project1._id,
        organization: org1._id,
        type: 'assignment',
        title: 'Task Assigned',
        message: 'You were assigned to "Team workload capacity calculator & overload warning badges"',
        link: `/projects/${project1._id}?tab=board&taskId=${taskMap['CLOUD-106']._id}`,
        read: true
      },
      {
        recipient: userMap['lead@plansphere.io']._id,
        sender: userMap['dev@plansphere.io']._id,
        project: project1._id,
        organization: org1._id,
        type: 'mention',
        title: 'Mentioned in CLOUD-102',
        message: 'Alex Rivera mentioned you in "Build responsive Drag-and-Drop Kanban swimlanes"',
        link: `/projects/${project1._id}?tab=board&taskId=${taskMap['CLOUD-102']._id}`,
        read: false
      },
      {
        recipient: userMap['pm@plansphere.io']._id,
        sender: userMap['jordan.lee@plansphere.io']._id,
        project: project1._id,
        organization: org1._id,
        type: 'blocker',
        title: 'Task Flagged as Blocked',
        message: 'CLOUD-110 Enterprise SSO is blocked: Awaiting vendor security certificate',
        link: `/projects/${project1._id}?tab=board&taskId=${taskMap['CLOUD-110']._id}`,
        read: false
      }
    ]);

    console.log('Recording Activity Feed Entries (Audit Trail)...');
    await Activity.insertMany([
      {
        project: project1._id,
        organization: org1._id,
        user: userMap['pm@plansphere.io']._id,
        action: 'started_sprint',
        entityType: 'sprint',
        entityId: activeSprint._id,
        entityTitle: 'Sprint 4 - Real-time Collaboration & Auth',
        details: { goal: activeSprint.goal }
      },
      {
        project: project1._id,
        organization: org1._id,
        user: userMap['dev@plansphere.io']._id,
        action: 'moved_task',
        entityType: 'task',
        entityId: taskMap['CLOUD-102']._id,
        entityTitle: 'CLOUD-102: Build responsive Drag-and-Drop Kanban swimlanes',
        details: { from: 'in_progress', to: 'done' }
      },
      {
        project: project1._id,
        organization: org1._id,
        user: userMap['lead@plansphere.io']._id,
        action: 'resolved_issue',
        entityType: 'issue',
        entityId: issues[2]._id,
        entityTitle: 'CLOUD-BUG-3: Expired JWT token returned wrong error payload format',
        details: { resolutionNotes: 'Updated errorHandler middleware to catch TokenExpiredError' }
      },
      {
        project: project1._id,
        organization: org1._id,
        user: userMap['jordan.lee@plansphere.io']._id,
        action: 'blocked_task',
        entityType: 'task',
        entityId: taskMap['CLOUD-110']._id,
        entityTitle: 'CLOUD-110: Enterprise SSO SAML 2.0 integration sandbox',
        details: { blockerReason: 'Awaiting vendor security certificate from enterprise test tenant.' }
      },
      {
        project: project1._id,
        organization: org1._id,
        user: userMap['dev@plansphere.io']._id,
        action: 'added_comment',
        entityType: 'comment',
        entityId: taskMap['CLOUD-102']._id,
        entityTitle: 'CLOUD-102: Build responsive Drag-and-Drop Kanban swimlanes',
        details: { snippet: 'Thanks @Elena! Working on keyboard navigation...' }
      }
    ]);

    console.log('\n======================================================');
    console.log('✅ PLANSPHERE DATABASE SEEDED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Persona Test Accounts (Password: password123 for all):');
    console.log('1. Organization Admin : admin@plansphere.io (Sarah Jenkins)');
    console.log('2. Project Manager    : pm@plansphere.io (David Chen)');
    console.log('3. Team Lead          : lead@plansphere.io (Elena Rostova)');
    console.log('4. Developer / Member : dev@plansphere.io (Alex Rivera)');
    console.log('5. Stakeholder (Read) : stakeholder@plansphere.io (Marcus Vance)');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
