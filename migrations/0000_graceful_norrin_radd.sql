CREATE TABLE "change_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"project_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"content_type" text NOT NULL,
	"file_path" text NOT NULL,
	"object_path" text NOT NULL,
	"description" text,
	"tags" text[] DEFAULT '{}',
	"category" text DEFAULT 'general',
	"version_number" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"access_count" integer DEFAULT 0,
	"last_accessed_at" timestamp,
	"uploaded_by_id" uuid NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"is_public" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"template_items" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_user_id" uuid,
	"recipient_email" text,
	"recipient_name" text,
	"recipient_role" text,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"responded_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_strategy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"project_id" uuid NOT NULL,
	"phase" text NOT NULL,
	"strategy_name" text NOT NULL,
	"description" text,
	"target_audiences" jsonb DEFAULT '[]'::jsonb,
	"key_messages" jsonb DEFAULT '[]'::jsonb,
	"communication_channels" text[] DEFAULT '{}',
	"frequency" text,
	"stakeholder_mapping" jsonb DEFAULT '{}'::jsonb,
	"resistance_points" jsonb DEFAULT '[]'::jsonb,
	"success_metrics" jsonb DEFAULT '[]'::jsonb,
	"timeline" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"template_type" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tags" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"target_audience" text[] DEFAULT '{}',
	"status" text NOT NULL,
	"type" text NOT NULL,
	"tags" text[] DEFAULT '{}',
	"priority" text,
	"effectiveness_rating" numeric(3, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"change_description" text,
	"editor_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communication_versions_communication_id_version_unique" UNIQUE("communication_id","version")
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"target_audience" text[] DEFAULT '{}',
	"send_date" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"channel_preferences" jsonb DEFAULT '{}'::jsonb,
	"visibility_settings" text DEFAULT 'public',
	"distribution_method" text,
	"raid_log_references" text[] DEFAULT '{}',
	"export_options" jsonb DEFAULT '{}'::jsonb,
	"tags" text[] DEFAULT '{}',
	"priority" text DEFAULT 'medium',
	"effectiveness_rating" numeric(3, 2),
	"engagement_score" numeric(5, 2) DEFAULT '0.00',
	"view_count" integer DEFAULT 0,
	"share_count" integer DEFAULT 0,
	"last_viewed_at" timestamp,
	"archived_at" timestamp,
	"archived_by_id" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"meeting_who" text,
	"meeting_what" text,
	"meeting_when" timestamp,
	"meeting_where" text,
	"meeting_why" text,
	"meeting_type" text,
	"meeting_duration" integer,
	"meeting_timezone" text,
	"meeting_location" text,
	"meeting_agenda" jsonb DEFAULT '[]'::jsonb,
	"meeting_objectives" text[] DEFAULT '{}',
	"meeting_outcomes" text,
	"meeting_preparation" text,
	"meeting_recurrence_pattern" text,
	"is_gpt_generated" boolean DEFAULT false NOT NULL,
	"gpt_prompt_used" text,
	"gpt_interaction_id" uuid,
	"template_id" uuid,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "consultation_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"consultant_id" uuid,
	"consultation_type" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"duration" integer,
	"recommended_plan_id" uuid,
	"custom_features" jsonb DEFAULT '{}'::jsonb,
	"custom_limits" jsonb DEFAULT '{}'::jsonb,
	"setup_tasks" jsonb DEFAULT '[]'::jsonb,
	"training_modules" jsonb DEFAULT '[]'::jsonb,
	"follow_up_date" timestamp,
	"consultation_notes" text,
	"user_requirements" text,
	"business_objectives" text,
	"success_metrics" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "gpt_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"org_role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by_id" uuid NOT NULL,
	"accepted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_date" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"related_id" uuid,
	"related_type" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_defaults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"features" jsonb DEFAULT '{"reports":true,"gptCoach":true,"advancedAnalytics":false,"customBranding":false,"apiAccess":false,"ssoIntegration":false,"advancedSecurity":false,"customWorkflows":false}'::jsonb NOT NULL,
	"limits" jsonb DEFAULT '{"maxUsers":100,"maxProjects":50,"maxTasksPerProject":1000,"maxFileUploadSizeMB":10,"apiCallsPerMonth":10000,"storageGB":10}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{"allowGuestAccess":false,"requireEmailVerification":true,"enableAuditLogs":true,"dataRetentionDays":365,"autoBackup":true}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"org_role" text DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"invited_by_id" uuid,
	CONSTRAINT "organization_memberships_user_id_organization_id_unique" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#3b82f6',
	"secondary_color" text DEFAULT '#64748b',
	"custom_domain" text,
	"timezone" text DEFAULT 'UTC',
	"date_format" text DEFAULT 'MM/dd/yyyy',
	"enabled_features" jsonb DEFAULT '{}'::jsonb,
	"custom_limits" jsonb DEFAULT '{}'::jsonb,
	"custom_fields" jsonb DEFAULT '[]'::jsonb,
	"integration_settings" jsonb DEFAULT '{}'::jsonb,
	"invoice_prefix" text,
	"billing_email" text,
	"tax_id" text,
	"billing_address" jsonb DEFAULT '{}'::jsonb,
	"is_consultation_complete" boolean DEFAULT false,
	"consultation_notes" text,
	"setup_progress" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"contact_email" text NOT NULL,
	"billing_email" text NOT NULL,
	"contact_phone" text,
	"address" text,
	"website" text,
	"max_users" integer DEFAULT 10 NOT NULL,
	"tax_id" text,
	"enabled_features" jsonb DEFAULT '{"readinessSurveys":true,"gptCoach":true,"communications":true,"changeArtifacts":true,"reports":true}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"seat_limit" integer NOT NULL,
	"price_per_seat_cents" integer NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"canvas_data" jsonb NOT NULL,
	"elements" jsonb DEFAULT '[]'::jsonb,
	"connections" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'identify_need' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"progress" integer DEFAULT 0,
	"owner_id" uuid NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category" text,
	"objectives" text,
	"scope" text,
	"success_criteria" text,
	"budget" numeric(15, 2),
	"assumptions" text,
	"constraints" text,
	"risks" text,
	"deliverables" jsonb DEFAULT '[]'::jsonb,
	"stakeholder_requirements" text,
	"business_justification" text,
	"current_phase" text DEFAULT 'identify_need' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raid_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"severity" text NOT NULL,
	"impact" text NOT NULL,
	"probability" text,
	"owner_id" uuid NOT NULL,
	"assignee_id" uuid,
	"due_date" timestamp,
	"resolution" text,
	"likelihood" integer,
	"risk_level" integer,
	"potential_outcome" text,
	"who_will_manage" text,
	"notes" text,
	"event" text,
	"due_out" text,
	"was_deadline_met" boolean,
	"priority" text,
	"root_cause" text,
	"category" text,
	"target_resolution_date" timestamp,
	"resolution_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "stakeholders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"department" text,
	"email" text,
	"phone" text,
	"influence_level" text NOT NULL,
	"support_level" text NOT NULL,
	"engagement_level" text NOT NULL,
	"communication_preference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" text DEFAULT 'trialing' NOT NULL,
	"seats_purchased" integer DEFAULT 1 NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "super_admin_mfa_setup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"super_admin_user_id" uuid NOT NULL,
	"temp_totp_secret" text NOT NULL,
	"backup_codes" text[] NOT NULL,
	"qr_code_data_url" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "super_admin_mfa_setup_super_admin_user_id_unique" UNIQUE("super_admin_user_id")
);
--> statement-breakpoint
CREATE TABLE "super_admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"super_admin_user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "super_admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"totp_secret" text,
	"backup_codes" text[],
	"mfa_enrolled_at" timestamp,
	"last_mfa_used_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "super_admin_users_username_unique" UNIQUE("username"),
	CONSTRAINT "super_admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "support_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"super_admin_user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"action" text NOT NULL,
	"resource" text,
	"resource_id" text,
	"description" text NOT NULL,
	"details" jsonb,
	"access_level" text DEFAULT 'read' NOT NULL,
	"is_customer_visible" boolean DEFAULT true NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"initial_context" jsonb DEFAULT '{}'::jsonb,
	"current_page" text,
	"user_agent" text,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"issue_resolved" boolean DEFAULT false NOT NULL,
	"satisfaction_rating" integer,
	"escalated_to_ticket" uuid,
	"escalated_at" timestamp,
	"conversation_duration" integer,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"issue_category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"super_admin_user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_type" text DEFAULT 'read_only' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"reason" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"user_context" jsonb DEFAULT '{}'::jsonb,
	"system_context" jsonb DEFAULT '{}'::jsonb,
	"conversation_history" jsonb DEFAULT '[]'::jsonb,
	"assigned_to_super_admin" uuid,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"email_sent" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp,
	"notifications_sent" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"respondent_id" uuid,
	"respondent_email" text,
	"responses" jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"questions" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"target_stakeholders" text[] DEFAULT '{}',
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"global_features" jsonb DEFAULT '{"maintenanceMode":false,"newUserRegistration":true,"emailNotifications":true,"gptServices":true,"fileUploads":true,"reports":true}'::jsonb NOT NULL,
	"security" jsonb DEFAULT '{"passwordMinLength":8,"passwordRequireSpecialChars":true,"sessionTimeoutMinutes":120,"maxLoginAttempts":5,"twoFactorRequired":false,"ipWhitelist":[]}'::jsonb NOT NULL,
	"email" jsonb DEFAULT '{"fromName":"Platform Support","fromEmail":"noreply@platform.com","replyToEmail":"support@platform.com","supportEmail":"help@platform.com","maxDailyEmails":10000}'::jsonb NOT NULL,
	"limits" jsonb DEFAULT '{"maxOrganizations":1000,"maxUsersPerOrganization":500,"maxProjectsPerOrganization":100,"maxStoragePerOrganizationMB":5000}'::jsonb NOT NULL,
	"maintenance" jsonb DEFAULT '{"scheduledMaintenanceStart":null,"scheduledMaintenanceEnd":null,"maintenanceMessage":"The platform is currently undergoing maintenance. We'll be back shortly."}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assignee_id" uuid,
	"assignee_email" text,
	"start_date" timestamp,
	"due_date" timestamp,
	"completed_date" timestamp,
	"progress" integer DEFAULT 0,
	"dependencies" text[] DEFAULT '{}',
	"checklist" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by_id" uuid,
	CONSTRAINT "user_group_memberships_user_id_group_id_unique" UNIQUE("user_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "user_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_initiative_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"role" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by_id" uuid NOT NULL,
	CONSTRAINT "user_initiative_assignments_user_id_project_id_unique" UNIQUE("user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"permissions" jsonb NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_permissions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"department" text,
	"role_id" uuid NOT NULL,
	"current_organization_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "change_artifacts" ADD CONSTRAINT "change_artifacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_artifacts" ADD CONSTRAINT "change_artifacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_artifacts" ADD CONSTRAINT "change_artifacts_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_strategy" ADD CONSTRAINT "communication_strategy_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_strategy" ADD CONSTRAINT "communication_strategy_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_strategy" ADD CONSTRAINT "communication_strategy_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_versions" ADD CONSTRAINT "communication_versions_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_versions" ADD CONSTRAINT "communication_versions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_archived_by_id_users_id_fk" FOREIGN KEY ("archived_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_gpt_interaction_id_gpt_interactions_id_fk" FOREIGN KEY ("gpt_interaction_id") REFERENCES "public"."gpt_interactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_template_id_communication_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."communication_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_workflows" ADD CONSTRAINT "consultation_workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_workflows" ADD CONSTRAINT "consultation_workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_workflows" ADD CONSTRAINT "consultation_workflows_consultant_id_users_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_workflows" ADD CONSTRAINT "consultation_workflows_recommended_plan_id_plans_id_fk" FOREIGN KEY ("recommended_plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpt_interactions" ADD CONSTRAINT "gpt_interactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpt_interactions" ADD CONSTRAINT "gpt_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_maps" ADD CONSTRAINT "process_maps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_maps" ADD CONSTRAINT "process_maps_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_logs" ADD CONSTRAINT "raid_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_logs" ADD CONSTRAINT "raid_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_logs" ADD CONSTRAINT "raid_logs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_logs" ADD CONSTRAINT "raid_logs_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "super_admin_mfa_setup" ADD CONSTRAINT "super_admin_mfa_setup_super_admin_user_id_super_admin_users_id_fk" FOREIGN KEY ("super_admin_user_id") REFERENCES "public"."super_admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "super_admin_sessions" ADD CONSTRAINT "super_admin_sessions_super_admin_user_id_super_admin_users_id_fk" FOREIGN KEY ("super_admin_user_id") REFERENCES "public"."super_admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_session_id_support_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."support_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_super_admin_user_id_super_admin_users_id_fk" FOREIGN KEY ("super_admin_user_id") REFERENCES "public"."super_admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_escalated_to_ticket_support_tickets_id_fk" FOREIGN KEY ("escalated_to_ticket") REFERENCES "public"."support_tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_super_admin_user_id_super_admin_users_id_fk" FOREIGN KEY ("super_admin_user_id") REFERENCES "public"."super_admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_super_admin_super_admin_users_id_fk" FOREIGN KEY ("assigned_to_super_admin") REFERENCES "public"."super_admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_respondent_id_users_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_group_id_user_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_initiative_assignments" ADD CONSTRAINT "user_initiative_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_initiative_assignments" ADD CONSTRAINT "user_initiative_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_initiative_assignments" ADD CONSTRAINT "user_initiative_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "change_artifacts_project_id_idx" ON "change_artifacts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "change_artifacts_category_idx" ON "change_artifacts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "change_artifacts_uploaded_by_idx" ON "change_artifacts" USING btree ("uploaded_by_id");--> statement-breakpoint
CREATE INDEX "change_artifacts_uploaded_at_idx" ON "change_artifacts" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "change_artifacts_project_category_idx" ON "change_artifacts" USING btree ("project_id","category");--> statement-breakpoint
CREATE INDEX "change_artifacts_project_active_idx" ON "change_artifacts" USING btree ("project_id","is_active");--> statement-breakpoint
CREATE INDEX "change_artifacts_tags_gin_idx" ON "change_artifacts" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "change_artifacts_filename_trgm_idx" ON "change_artifacts" USING gin ("original_filename" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "change_artifacts_description_trgm_idx" ON "change_artifacts" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "communications_project_id_idx" ON "communications" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "communications_type_idx" ON "communications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "communications_status_idx" ON "communications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "communications_created_at_idx" ON "communications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "communications_project_type_idx" ON "communications" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "communications_project_status_idx" ON "communications" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "communications_tags_gin_idx" ON "communications" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "communications_title_trgm_idx" ON "communications" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "communications_content_trgm_idx" ON "communications" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "consultation_workflows_org_user_idx" ON "consultation_workflows" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "consultation_workflows_status_idx" ON "consultation_workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "consultation_workflows_consultant_idx" ON "consultation_workflows" USING btree ("consultant_id");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_email_idx" ON "email_verification_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_org_email_idx" ON "invitations" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invitations_expires_idx" ON "invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "org_memberships_org_user_idx" ON "organization_memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "org_memberships_user_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_settings_org_idx" ON "organization_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_owner_idx" ON "organizations" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "plans_active_idx" ON "plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_sub_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "super_admin_mfa_setup_user_idx" ON "super_admin_mfa_setup" USING btree ("super_admin_user_id");--> statement-breakpoint
CREATE INDEX "super_admin_mfa_setup_expires_idx" ON "super_admin_mfa_setup" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "super_admin_sessions_user_idx" ON "super_admin_sessions" USING btree ("super_admin_user_id");--> statement-breakpoint
CREATE INDEX "super_admin_sessions_expires_idx" ON "super_admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "super_admin_users_username_idx" ON "super_admin_users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "super_admin_users_email_idx" ON "super_admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "super_admin_users_mfa_enabled_idx" ON "super_admin_users" USING btree ("mfa_enabled");--> statement-breakpoint
CREATE INDEX "support_audit_logs_session_idx" ON "support_audit_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "support_audit_logs_super_admin_idx" ON "support_audit_logs" USING btree ("super_admin_user_id");--> statement-breakpoint
CREATE INDEX "support_audit_logs_organization_idx" ON "support_audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "support_audit_logs_customer_visible_idx" ON "support_audit_logs" USING btree ("is_customer_visible","organization_id");--> statement-breakpoint
CREATE INDEX "support_audit_logs_created_at_idx" ON "support_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "support_conversations_org_idx" ON "support_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "support_conversations_user_idx" ON "support_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_conversations_session_idx" ON "support_conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "support_conversations_active_idx" ON "support_conversations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "support_conversations_resolved_idx" ON "support_conversations" USING btree ("issue_resolved");--> statement-breakpoint
CREATE INDEX "support_conversations_escalated_idx" ON "support_conversations" USING btree ("escalated_to_ticket");--> statement-breakpoint
CREATE INDEX "support_sessions_super_admin_idx" ON "support_sessions" USING btree ("super_admin_user_id");--> statement-breakpoint
CREATE INDEX "support_sessions_organization_idx" ON "support_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "support_sessions_active_idx" ON "support_sessions" USING btree ("is_active","organization_id");--> statement-breakpoint
CREATE INDEX "support_sessions_expiry_idx" ON "support_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "support_tickets_org_idx" ON "support_tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "support_tickets_assigned_idx" ON "support_tickets" USING btree ("assigned_to_super_admin");