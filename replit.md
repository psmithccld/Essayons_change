# Project Management Application

## Overview
This is a comprehensive change management and project management application. It provides tools for managing projects, tasks, stakeholders, communications, surveys, and risk management (RAID logs). The application features an AI-powered coaching system to offer intelligent insights and recommendations for change management processes. Its business vision is to provide a modern, AI-augmented platform for efficient project and change management, targeting organizations seeking to streamline their operations and enhance decision-making.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, using Vite for fast development.
- **State Management**: React Query for server state management, Wouter for routing.
- **UI/Styling**: Shadcn/ui (Radix UI + Tailwind CSS) for components, Tailwind CSS for styling.
- **Forms**: React Hook Form with Zod for validation.

### Backend
- **Framework**: Express.js with TypeScript.
- **ORM**: Drizzle ORM for type-safe PostgreSQL interactions.
- **Shared Schema**: Common TypeScript types and Zod schemas shared between frontend and backend.

### Data Storage
- **Database**: PostgreSQL on Neon serverless platform.
- **Schema Management**: Drizzle-kit for migrations.
- **Customer Tiers**: A system defining feature availability and resource limits based on active subscriptions, replacing previous organization defaults.
- **Organization Seeding**: Automated setup for new organizations including default roles, an admin user, and an initial initiative.

### Authentication and Authorization
- **Session Management**: Cookie-based sessions with PostgreSQL store.
- **User Management**: Basic user system with roles and permissions, including a separate Super Admin system.
- **Multi-tenant Isolation**: Comprehensive enforcement ensuring users can only access data within their organization via `currentOrganizationId` and `organizationId` parameters across all relevant queries and API endpoints.
- **Comprehensive Reports Security**: All user reports (Login Activity, Role Assignment, Initiatives Participation) enforce organization filtering via organizationMemberships joins and organizationId conditions to prevent cross-tenant data leakage. Role Assignment report supports legacy global roles (organizationId = null) for backward compatibility.
- **Idle Timeout**: Automatic logout after 20 minutes of inactivity on the client side.
- **Organization-Scoped Security Roles**: Roles are now tied to specific organizations, preventing privilege escalation and enhancing compartmentalization.

### AI Integration
- **OpenAI GPT-5**: Powers the AI coaching system, communication planning, stakeholder analysis, and risk assessment.

### Component Architecture
- **Modularity**: Reusable UI components following atomic design principles.
- **Layout**: Sidebar navigation, header, and main content areas.
- **Responsiveness**: Mobile-first approach.

### Development Workflow
- **Type Safety**: End-to-end TypeScript.
- **Tooling**: Vite HMR, ESBuild for production builds, Path Aliases.

## External Dependencies

### Database and Infrastructure
- **Neon Database**: Serverless PostgreSQL.
- **ws**: WebSocket library for real-time connections.

### UI and Styling
- **Radix UI**: Headless component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Google Fonts**: Inter font for typography.

### AI and Machine Learning
- **OpenAI API**: For GPT-5 integration.

### Development Tools
- **Replit Plugins**: Development environment integration.
- **ESBuild**: JavaScript bundling.
- **PostCSS**: CSS processing.

### Form and Data Management
- **React Hook Form**: Form handling.
- **Zod**: Schema validation.
- **Date-fns**: Date utilities.

### State Management
- **TanStack React Query**: Server state management.
- **React Context**: Local state management.