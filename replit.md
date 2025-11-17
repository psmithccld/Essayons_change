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

### Object Storage
- **Dual Provider System**: Supports both Google Cloud Storage (development) and Cloudflare R2 (production) via provider abstraction.
- **Auto-Detection**: Automatically selects the appropriate provider based on environment variables.
- **Provider-Specific Behavior**:
  - **GCS (Development)**: Streams files through the server with full ACL support for fine-grained access control.
  - **R2 (Production)**: Uses signed URL redirects (HTTP 302) for direct downloads from Cloudflare, eliminating streaming overhead.
- **ACL Graceful Degradation**: ACL features only work with GCS provider; R2 relies on application-level authorization.
- **Environment Variables**:
  - **Development (GCS)**: Uses Replit's built-in object storage with `PUBLIC_OBJECT_SEARCH_PATHS` and `PRIVATE_OBJECT_DIR`.
  - **Production (R2)**: Requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `PRIVATE_OBJECT_DIR`, and `PUBLIC_OBJECT_SEARCH_PATHS`.

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
- **Production Build**: 
  - Frontend: Vite builds to `dist/public/` directory with assets, images, and favicon
  - Backend: ESBuild bundles server to `dist/index.js`
  - Static File Serving: Production server serves files from `dist/public` using early middleware registration in `server/index.ts` to handle favicon and other root-level assets before API routes

### Security Configuration

#### Impersonation Token System
The application includes a secure impersonation system for Super Admin capabilities:

- **IMPERSONATION_SECRET**: Required environment variable containing a 256-bit (32-byte) base64url-encoded secret key
  - **Production**: Must be set explicitly - server will fail to start without it
  - **Development**: Can bypass the requirement by setting `ALLOW_DEV_IMPERSONATION_SECRET=true`
  - **Generation**: Use one of these methods to generate a base64url-safe key:
    - **Shell**: `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`
    - **Node.js**: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
  - **Format**: Must use base64url encoding (characters: A-Z, a-z, 0-9, `-`, `_` only - no `+`, `/`, or `=`)
  - **Security**: Never commit this secret to version control. Use Replit Secrets or environment-specific secret management.

#### Rate Limiting
- **Implementation**: In-memory Maps with automatic cleanup and size limits
- **Single Instance**: Current implementation works for single-server deployments
- **Production Scaling**: For multi-instance/Kubernetes deployments, migrate to Redis or external rate-limiting service
- **Configuration**: Rate limits and store size caps are hardcoded; consider moving to environment variables for production flexibility

### System Requirements

#### Node.js Version
- **Minimum Version**: Node.js 16.20+ / 18.12+ / 20+
- **Reason**: The application uses `base64url` encoding for cryptographic operations (HMAC token verification)
- **Verification**: Run `node --version` to check your current version
- **Note**: Older Node.js versions don't support `base64url` as a Buffer encoding parameter

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