# Project Management Application

## Overview

This is a comprehensive change management and project management application built with modern web technologies. It provides tools for managing projects, tasks, stakeholders, communications, surveys, and risk management (RAID logs). The application features an AI-powered coaching system using OpenAI to provide intelligent insights and recommendations for change management processes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern React application using TypeScript for type safety
- **Vite**: Fast build tool and development server for optimal development experience
- **React Query (TanStack Query)**: Server state management for data fetching, caching, and synchronization
- **Wouter**: Lightweight client-side routing library
- **Shadcn/ui**: Component library built on Radix UI primitives with Tailwind CSS styling
- **React Hook Form**: Form management with Zod schema validation
- **Tailwind CSS**: Utility-first CSS framework for responsive design

### Backend Architecture
- **Express.js**: Node.js web framework handling API routes and middleware
- **TypeScript**: Type-safe backend development with ES modules
- **Drizzle ORM**: Type-safe SQL database toolkit for PostgreSQL
- **Shared Schema**: Common TypeScript types and Zod schemas shared between frontend and backend

### Data Storage
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Database Schema**: Comprehensive schema including users, projects, tasks, stakeholders, RAID logs, communications, surveys, GPT interactions, customer tiers, and subscriptions
- **Migrations**: Drizzle-kit push-based schema management (schema.ts as source of truth)
- **Customer Tier System**: Single source of truth for feature availability and resource limits across the platform
  - Customer Tiers define: features, storage limits (maxFileUploadSizeMB, storageGB), seat limits, pricing
  - Organizations access features through active subscriptions linked to customer tiers
  - Feature resolution flow: Organization → Active Subscription → Customer Tier → Features
  - Standardized features: reports, gptCoach, communications, changeArtifacts, readinessSurveys, dataExport, auditLogs, customBranding, workflowAutomation
  - **Organization Defaults System**: REMOVED - Customer Tiers are now the sole source of feature and limit configuration
  - **Subscription Auto-Creation**: When Super Admin assigns a Customer Tier to an organization, an active subscription is automatically created/updated
  - **Feature Resolution Helper**: Centralized `resolveOrganizationFeatures()` function ensures consistent feature resolution across API endpoints and middleware

### Authentication and Authorization
- **Session-based**: Cookie-based session management with PostgreSQL session store
- **User Management**: Basic user system with roles and permissions
- **Default User**: Currently uses default user system (ready for full authentication implementation)
- **Critical Security Fixes (October 2025)**: Comprehensive multi-tenant isolation enforcement
  - **Middleware Fix**: `requireOrgContext` now uses `user.currentOrganizationId` as source of truth (previously used first active membership)
  - **Project Filtering**: `storage.getProjects()` assignedProjects query now filters by organizationId
  - **Authorization Helper**: `storage.getUserAuthorizedProjectIds()` accepts organizationId parameter and filters all queries by organization
  - **Dashboard Methods**: All dashboard analytics methods (getUserActiveInitiatives, getUserPendingSurveys, getUserPendingTasks, getUserOpenIssues, getUserInitiativesByPhase, getDashboardStats) accept organizationId
  - **API Endpoints**: All 38+ call sites updated to pass req.organizationId for proper tenant isolation
  - **Verified**: End-to-end tests confirm users cannot access projects/users from other organizations
- **Idle Timeout**: Automatic logout after 20 minutes of user inactivity (October 2025)
  - **Client-side Detection**: Custom `useIdleTimeout` hook tracks user activity via event listeners
  - **Tracked Events**: mousedown, mousemove, keydown, scroll, touchstart, click
  - **Debouncing**: Timer resets debounced to 500ms to prevent excessive timer churn during continuous activity
  - **Toast Notification**: Shows "Session Expired" message before automatic logout
  - **Implementation**: Hook integrated in AuthenticatedApp component (client/src/App.tsx)
  - **Limitation**: Client-only timeout; doesn't prevent persistent login across browser sessions unless 20 minutes elapse
  - **Type Safety**: Uses `ReturnType<typeof setTimeout>` for cross-environment compatibility
  - Files: client/src/hooks/useIdleTimeout.ts, client/src/App.tsx
- **Super Admin System**: Separate identity system for platform administrators
  - Super admin users stored in `super_admin_users` table (separate from platform users in `users` table)
  - Platform users cannot use reserved super admin usernames to prevent confusion
  - Comprehensive error handling for user creation with specific validation messages
  - Database roles: Admin, Manager, User (default role for new platform users)
- **Organization-Scoped Security Roles** (October 2025)
  - **Schema**: Roles table includes `organizationId` foreign key to organizations (nullable for migration compatibility)
  - **Compartmentalization**: Each organization has its own isolated set of security roles
  - **Role Filtering**: 
    - GET /api/super-admin/organizations/:orgId/roles returns only roles for that specific organization (Super Admin interface)
    - GET /api/roles filters by user's currentOrganizationId (Client UI user management)
  - **Validation**: POST /api/super-admin/users validates roleId belongs to selected organization (prevents privilege escalation)
  - **Migration**: Existing global roles (Admin, User, Viewer) maintained for backward compatibility; new roles are org-scoped
  - **Cleanup**: Orphaned org-specific roles from deleted organizations are removed during migration
  - **Security**: Both Super Admin and client UI interfaces enforce organization boundaries for role selection
  - Implementation: shared/schema.ts (roles table), server/routes.ts (API endpoints), server/seed.ts
- **Organization Seeding**: Automatic setup when Super Admin creates new organizations
  - **Idempotent Seeding**: Checks for existing resources before creating to prevent duplicates
  - **Three Default Roles**: Creates Admin, Manager, and User roles for each organization
    - Admin: Full permissions including system/security settings
    - Manager: Project management permissions (no system/security access)
    - User: Basic access (no admin capabilities, limited project visibility)
  - Creates Admin User with username `${orgSlug}-admin` linked to Admin role
  - **Secure Random Passwords**: Generates cryptographically secure random password for each admin user
  - **Email Uniqueness Handling**: Implements retry logic with fallback emails when contact email already exists
  - **Owner Linkage**: Updates organization.ownerUserId after creating admin user to maintain consistency
  - Adds Admin User to organization as owner (if no owner exists) or admin member
  - Creates default "CMIS Integration" initiative owned by Admin User
  - **Admin Credentials in API Response**: Returns admin username and password to Super Admin in create organization response
  - Seeding failures are logged but don't block organization creation
  - Implementation in `server/routes.ts` lines 1068-1240 (seedNewOrganization function)
- **Organization Deletion**: DELETE /api/super-admin/organizations/:id endpoint
  - Protected by requireSuperAdminAuth middleware (line 2140)
  - Prevents deletion of default organization
  - Relies on database CASCADE constraints for cleanup of related data
  - Returns proper error codes (404 for not found, 400 for default org, 500 for server errors)
  - Logs deletion activity for audit trail
- **Super Admin UI Enhancements**: Tier visibility and enrollment tracking (October 2025)
  - **Organization Tier Display**: Organizations page shows tier badge on each org card displaying subscription tier name
  - **Tier Pre-selection**: Edit organization dialog automatically pre-selects current tier based on active subscription
  - **Enrollment Counts**: Customer Tiers page displays enrollment count badge showing number of organizations enrolled in each tier
  - **Backend Optimizations**: Uses single GROUP BY query for enrollment counts (avoiding O(n) queries)
  - **Data Flow**: GET /api/super-admin/organizations joins subscriptions and tiers; GET /api/super-admin/customer-tiers includes enrollmentCount
  - Implementation: server/routes.ts (API endpoints), client/src/pages/super-admin/organizations.tsx, client/src/pages/super-admin/customer-tiers.tsx
- **Enhanced User Creation with Role Selection** (October 2025)
  - **API Endpoint**: GET /api/super-admin/organizations/:orgId/roles returns active, non-empty security roles for organization
  - **Role Assignment**: POST /api/super-admin/users accepts optional `roleId` parameter to assign specific security role during user creation
  - **Super Admin Creation**: `isSuperAdmin` parameter creates super admin users (homeless users only)
  - **Security Validations**: Server-side enforcement prevents privilege escalation (isSuperAdmin rejected if organizationId present, roleId must exist and be active)
  - **Organization ID Normalization**: Treats "", "none", undefined as homeless user consistently across backend
  - **Fallback Role**: Defaults to "User" role if no roleId provided; returns 400 if User role missing
  - **UI Features**: Dynamic Security Role dropdown appears when organization selected; "Make Super Admin" toggle with purple styling and Crown icon for homeless users
  - **State Management**: Role selection resets when organization changes to prevent stale assignments
  - Implementation: server/routes.ts (API endpoints lines 2087-2140, 2722-2990), client/src/pages/super-admin/users.tsx

### AI Integration
- **OpenAI GPT-5**: AI-powered coaching system for change management insights
- **Communication Planning**: Automated generation of communication strategies based on project data
- **Stakeholder Analysis**: AI-driven recommendations for stakeholder engagement
- **Risk Assessment**: Intelligent risk mitigation strategies

### Calendar Integration Status
- **Outlook Integration**: User dismissed Replit's Outlook connector integration
- **Alternative Options**: Manual API integration using stored credentials or .ics file export
- **Future Consideration**: Replit Outlook integration available if user wants to complete authorization flow later

### Component Architecture
- **Modular Components**: Reusable UI components following atomic design principles
- **Layout System**: Sidebar navigation with header and main content areas
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Data Visualization**: Custom Gantt charts and progress indicators

### Development Workflow
- **Hot Module Replacement**: Vite HMR for fast development iterations
- **Type Safety**: End-to-end TypeScript coverage from database to UI
- **Build Process**: Optimized production builds with ESBuild
- **Path Aliases**: Clean import paths using TypeScript path mapping

## External Dependencies

### Database and Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket**: Real-time database connections using ws library

### UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library for consistent iconography
- **Inter Font**: Primary typography via Google Fonts

### AI and Machine Learning
- **OpenAI API**: GPT-5 integration for intelligent coaching features
- **Environment Variables**: Secure API key management

### Development Tools
- **Replit Plugins**: Development environment integration
- **ESBuild**: Fast JavaScript bundling for production
- **PostCSS**: CSS processing with Autoprefixer

### Form and Data Management
- **React Hook Form**: Efficient form handling and validation
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities

### State Management
- **TanStack React Query**: Server state management with caching
- **React Context**: Local state management for UI components