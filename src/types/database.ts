// Database types matching the Supabase schema
// These types are used for type-safe database operations

export type EventStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'SKIPPED';
export type MilestoneCategory = 'VENUE' | 'CATERING' | 'MARKETING' | 'LOGISTICS' | 'PERMITS' | 'SPONSORS' | 'VOLUNTEERS' | 'GENERAL';
export type OrgRole = 'org_admin' | 'event_manager' | 'vendor' | 'partner' | 'volunteer';
export type DocumentCategory = 'CONTRACT' | 'INVOICE' | 'PERMIT' | 'MARKETING' | 'PHOTO' | 'REPORT' | 'CORRESPONDENCE' | 'UNCATEGORIZED';
export type DocumentSource = 'UPLOAD' | 'EMAIL' | 'GENERATED';
export type NotificationType = 'REMINDER' | 'OVERDUE' | 'ESCALATION' | 'ASSIGNMENT' | 'DIGEST' | 'WELCOME' | 'EVENT_UPDATE';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'IN_APP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type AgentActionType = 'MILESTONE_GENERATION' | 'MILESTONE_IMPROVEMENT' | 'CONTEXTUAL_HELP' | 'POST_EVENT_ANALYSIS' | 'TEMPLATE_UPDATE';
export type PatternType = 'TIMING_ADJUSTMENT' | 'NEW_MILESTONE' | 'REMOVE_MILESTONE' | 'SEQUENCE_CHANGE' | 'RESOURCE_SUGGESTION';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  default_reminder_days: number[] | null;
  digest_enabled: boolean | null;
  digest_day: number | null;
  digest_time: string | null;
  inbound_email_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  // Joined data
  organization?: Organization;
  profile?: Profile;
}

export interface EventType {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  default_reminder_days: number[] | null;
  current_version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  versions?: TemplateVersion[];
  milestone_templates?: MilestoneTemplate[];
}

export interface TemplateVersion {
  id: string;
  event_type_id: string;
  version: number;
  changelog: string | null;
  created_by: string | null;
  created_at: string;
  // Joined data
  event_type?: EventType;
  milestone_templates?: MilestoneTemplate[];
  creator?: Profile;
}

export interface MilestoneTemplate {
  id: string;
  event_type_id: string;
  template_version_id: string | null;
  title: string;
  description: string | null;
  category: MilestoneCategory;
  days_before_event: number;
  estimated_hours: number | null;
  sort_order: number | null;
  created_at: string;
  // Joined data
  template_version?: TemplateVersion;
}

export interface Event {
  id: string;
  organization_id: string;
  event_type_id: string | null;
  template_version_id: string | null;
  name: string;
  description: string | null;
  event_date: string;
  event_end_date: string | null;
  venue: string | null;
  address: string | null;
  is_virtual: boolean | null;
  virtual_link: string | null;
  reminder_days: number[] | null;
  status: EventStatus;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  event_type?: EventType;
  template_version?: TemplateVersion;
  owner?: Profile;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  category: MilestoneCategory;
  due_date: string;
  completed_at: string | null;
  status: MilestoneStatus;
  estimated_hours: number | null;
  actual_hours: number | null;
  assignee_id: string | null;
  from_template_id: string | null;
  is_ai_generated: boolean | null;
  was_modified: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assignee?: Profile;
  event?: Event;
}

export interface Document {
  id: string;
  organization_id: string;
  event_id: string | null;
  milestone_id: string | null;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  category: DocumentCategory;
  source: DocumentSource;
  source_email_from: string | null;
  source_email_subject: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  action_url: string | null;
  channel: NotificationChannel;
  scheduled_for: string;
  sent_at: string | null;
  status: NotificationStatus;
  related_event_id: string | null;
  related_milestone_id: string | null;
  created_at: string;
}

export interface AgentAction {
  id: string;
  organization_id: string;
  user_id: string;
  action_type: AgentActionType;
  prompt_summary: string | null;
  response_summary: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  was_accepted: boolean | null;
  user_modification: string | null;
  related_event_id: string | null;
  created_at: string;
}

export interface LearnedPattern {
  id: string;
  organization_id: string;
  pattern_type: PatternType;
  description: string;
  recommendation: string | null;
  source_event_ids: string[] | null;
  confidence: number | null;
  is_active: boolean | null;
  applied_count: number | null;
  created_at: string;
  updated_at: string;
}

// Attention item type for dashboard
export interface AttentionItem {
  id: string;
  type: 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'BLOCKED';
  milestone: Milestone;
  event: Event;
  daysUntilDue: number;
}
