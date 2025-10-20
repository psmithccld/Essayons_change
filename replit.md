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
- **Super Admin System**: Separate identity system for platform administrators
  - Super admin users stored in `super_admin_users` table (separate from platform users in `users` table)
  - Platform users cannot use reserved super admin usernames to prevent confusion
  - Comprehensive error handling for user creation with specific validation messages
  - Database roles: Admin, Manager, User (default role for new platform users)
- **Organization Seeding**: Automatic setup when Super Admin creates new organizations
  - **Idempotent Seeding**: Checks for existing resources before creating to prevent duplicates
  - Creates Admin Security Role with name `${orgSlug}-Admin` (globally unique with all permissions enabled)
  - Creates Admin User with username `${orgSlug}-admin` linked to Admin role
  - **Secure Random Passwords**: Generates cryptographically secure random password for each admin user
  - **Email Uniqueness Handling**: Implements retry logic with fallback emails when contact email already exists
  - **Owner Linkage**: Updates organization.ownerUserId after creating admin user to maintain consistency
  - Adds Admin User to organization as owner (if no owner exists) or admin member
  - Creates default "CMIS Integration" initiative owned by Admin User
  - **Admin Credentials in API Response**: Returns admin username and password to Super Admin in create organization response
  - Seeding failures are logged but don't block organization creation
  - Implementation in `server/routes.ts` lines 1070-1232 (seedNewOrganization function)
- **Organization Deletion**: DELETE /api/super-admin/organizations/:id endpoint
  - Protected by requireSuperAdminAuth middleware (line 2140)
  - Prevents deletion of default organization
  - Relies on database CASCADE constraints for cleanup of related data
  - Returns proper error codes (404 for not found, 400 for default org, 500 for server errors)
  - Logs deletion activity for audit trail

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