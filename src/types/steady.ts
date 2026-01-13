// Steady Core Types

export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'SKIPPED';
export type EventStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type MilestoneCategory = 'VENUE' | 'CATERING' | 'MARKETING' | 'LOGISTICS' | 'PERMITS' | 'SPONSORS' | 'VOLUNTEERS' | 'GENERAL';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface EventType {
  id: string;
  name: string;
  description?: string;
  icon: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  eventTypeId: string;
  eventType?: EventType;
  eventDate: Date;
  venue?: string;
  status: EventStatus;
  ownerId: string;
  owner?: User;
  milestones?: Milestone[];
  progress?: number; // 0-100
}

export interface Milestone {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  category: MilestoneCategory;
  dueDate: Date;
  completedAt?: Date;
  status: MilestoneStatus;
  assigneeId?: string;
  assignee?: User;
  isAiGenerated?: boolean;
  estimatedHours?: number;
}

export interface AttentionItem {
  id: string;
  type: 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'BLOCKED';
  milestone: Milestone;
  event: Event;
  daysUntilDue: number;
}
