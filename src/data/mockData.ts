import type { Event, Milestone, AttentionItem, User, EventType } from '@/types/steady';
import { addDays, subDays } from 'date-fns';

// Mock Users
export const mockUsers: User[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@nonprofitorg.org', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: '2', name: 'Michael Chen', email: 'michael@nonprofitorg.org', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael' },
  { id: '3', name: 'Emily Rodriguez', email: 'emily@nonprofitorg.org', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily' },
  { id: '4', name: 'David Kim', email: 'david@nonprofitorg.org', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
];

// Mock Event Types
export const mockEventTypes: EventType[] = [
  { id: '1', name: 'Annual Gala', icon: '🎭', description: 'Formal fundraising dinner with auction' },
  { id: '2', name: 'Charity 5K', icon: '🏃', description: 'Community run/walk event' },
  { id: '3', name: 'Silent Auction', icon: '🔨', description: 'Auction-focused fundraiser' },
  { id: '4', name: 'Community Fair', icon: '🎪', description: 'Family-friendly outdoor event' },
];

const today = new Date();

// Generate milestones for Annual Gala
const galaMilestones: Milestone[] = [
  {
    id: 'gm1',
    eventId: 'e1',
    title: 'Book venue and confirm contract',
    description: 'Secure The Grand Ballroom and review contract terms with legal',
    category: 'VENUE',
    dueDate: subDays(today, 3),
    status: 'COMPLETED',
    completedAt: subDays(today, 5),
    assigneeId: '1',
    assignee: mockUsers[0],
    isAiGenerated: true,
  },
  {
    id: 'gm2',
    eventId: 'e1',
    title: 'Finalize catering menu',
    description: 'Work with caterer to design menu options including vegetarian and dietary restrictions',
    category: 'CATERING',
    dueDate: subDays(today, 1),
    status: 'IN_PROGRESS',
    assigneeId: '2',
    assignee: mockUsers[1],
    isAiGenerated: true,
    estimatedHours: 4,
  },
  {
    id: 'gm3',
    eventId: 'e1',
    title: 'Send save-the-dates',
    description: 'Design and mail save-the-date cards to donor list',
    category: 'MARKETING',
    dueDate: today,
    status: 'NOT_STARTED',
    assigneeId: '3',
    assignee: mockUsers[2],
    isAiGenerated: true,
  },
  {
    id: 'gm4',
    eventId: 'e1',
    title: 'Confirm keynote speaker',
    description: 'Finalize agreement with keynote speaker and travel arrangements',
    category: 'LOGISTICS',
    dueDate: addDays(today, 3),
    status: 'NOT_STARTED',
    assigneeId: '1',
    assignee: mockUsers[0],
    isAiGenerated: true,
  },
  {
    id: 'gm5',
    eventId: 'e1',
    title: 'Recruit auction item sponsors',
    description: 'Reach out to 20 potential sponsors for silent auction items',
    category: 'SPONSORS',
    dueDate: addDays(today, 7),
    status: 'IN_PROGRESS',
    assigneeId: '4',
    assignee: mockUsers[3],
    isAiGenerated: true,
  },
  {
    id: 'gm6',
    eventId: 'e1',
    title: 'Recruit event volunteers',
    description: 'Secure 15 volunteers for event day operations',
    category: 'VOLUNTEERS',
    dueDate: addDays(today, 14),
    status: 'NOT_STARTED',
    assigneeId: '3',
    assignee: mockUsers[2],
    isAiGenerated: true,
  },
];

// Generate milestones for Charity 5K
const runMilestones: Milestone[] = [
  {
    id: 'rm1',
    eventId: 'e2',
    title: 'Submit city permit application',
    description: 'File permit for road closure and event space',
    category: 'PERMITS',
    dueDate: subDays(today, 5),
    status: 'BLOCKED',
    assigneeId: '1',
    assignee: mockUsers[0],
    isAiGenerated: true,
  },
  {
    id: 'rm2',
    eventId: 'e2',
    title: 'Secure water station sponsors',
    description: 'Get 4 sponsors for hydration stations along route',
    category: 'SPONSORS',
    dueDate: addDays(today, 2),
    status: 'NOT_STARTED',
    assigneeId: '4',
    assignee: mockUsers[3],
    isAiGenerated: true,
  },
  {
    id: 'rm3',
    eventId: 'e2',
    title: 'Order participant medals',
    description: 'Design and order 500 finisher medals',
    category: 'LOGISTICS',
    dueDate: addDays(today, 10),
    status: 'NOT_STARTED',
    assigneeId: '2',
    assignee: mockUsers[1],
    isAiGenerated: true,
  },
];

// Mock Events
export const mockEvents: Event[] = [
  {
    id: 'e1',
    name: 'Annual Spring Gala 2026',
    description: 'Our signature fundraising event featuring dinner, silent auction, and live entertainment.',
    eventTypeId: '1',
    eventType: mockEventTypes[0],
    eventDate: addDays(today, 45),
    venue: 'The Grand Ballroom',
    status: 'ACTIVE',
    ownerId: '1',
    owner: mockUsers[0],
    milestones: galaMilestones,
    progress: 25,
  },
  {
    id: 'e2',
    name: 'Hope Run 5K',
    description: 'Community run/walk supporting youth programs.',
    eventTypeId: '2',
    eventType: mockEventTypes[1],
    eventDate: addDays(today, 30),
    venue: 'City Park',
    status: 'ACTIVE',
    ownerId: '2',
    owner: mockUsers[1],
    milestones: runMilestones,
    progress: 10,
  },
  {
    id: 'e3',
    name: 'Summer Silent Auction',
    description: 'Online and in-person auction featuring local art and experiences.',
    eventTypeId: '3',
    eventType: mockEventTypes[2],
    eventDate: addDays(today, 75),
    venue: 'Community Center',
    status: 'PLANNING',
    ownerId: '3',
    owner: mockUsers[2],
    milestones: [],
    progress: 0,
  },
];

// Generate attention items
export const mockAttentionItems: AttentionItem[] = [
  {
    id: 'a1',
    type: 'OVERDUE',
    milestone: galaMilestones[1],
    event: mockEvents[0],
    daysUntilDue: -1,
  },
  {
    id: 'a2',
    type: 'BLOCKED',
    milestone: runMilestones[0],
    event: mockEvents[1],
    daysUntilDue: -5,
  },
  {
    id: 'a3',
    type: 'DUE_TODAY',
    milestone: galaMilestones[2],
    event: mockEvents[0],
    daysUntilDue: 0,
  },
  {
    id: 'a4',
    type: 'DUE_SOON',
    milestone: runMilestones[1],
    event: mockEvents[1],
    daysUntilDue: 2,
  },
];

// All milestones for calendar
export const allMilestones: Milestone[] = [...galaMilestones, ...runMilestones];
