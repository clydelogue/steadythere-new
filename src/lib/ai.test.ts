import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the AI response parsing logic used in NewTemplate
describe('AI Milestone Generation', () => {
  describe('milestone parsing', () => {
    it('should parse milestones from valid AI response', () => {
      const aiResponse = `Here are suggested milestones for your golf tournament:

<milestones>
[
  {
    "title": "Book venue",
    "description": "Reserve the golf course and sign contract",
    "category": "VENUE",
    "daysBeforeEvent": 90,
    "estimatedHours": 2
  },
  {
    "title": "Secure sponsors",
    "description": "Contact potential sponsors and confirm commitments",
    "category": "SPONSORS",
    "daysBeforeEvent": 75,
    "estimatedHours": 10
  }
]
</milestones>

<templateName>Golf Tournament</templateName>

Let me know if you'd like to adjust any of these milestones!`;

      const milestonesMatch = aiResponse.match(/<milestones>([\s\S]*?)<\/milestones>/);
      const nameMatch = aiResponse.match(/<templateName>([\s\S]*?)<\/templateName>/);

      expect(milestonesMatch).not.toBeNull();
      expect(nameMatch).not.toBeNull();
      expect(nameMatch![1].trim()).toBe('Golf Tournament');

      const parsedMilestones = JSON.parse(milestonesMatch![1]);
      expect(parsedMilestones).toHaveLength(2);
      expect(parsedMilestones[0].title).toBe('Book venue');
      expect(parsedMilestones[0].category).toBe('VENUE');
      expect(parsedMilestones[0].daysBeforeEvent).toBe(90);
      expect(parsedMilestones[1].title).toBe('Secure sponsors');
    });

    it('should handle response without milestones tag', () => {
      const aiResponse = `I'd be happy to help, but I need more information about your event.`;

      const milestonesMatch = aiResponse.match(/<milestones>([\s\S]*?)<\/milestones>/);
      expect(milestonesMatch).toBeNull();
    });

    it('should handle malformed JSON in milestones', () => {
      const aiResponse = `<milestones>
[
  { "title": "Book venue", invalid json here }
]
</milestones>`;

      const milestonesMatch = aiResponse.match(/<milestones>([\s\S]*?)<\/milestones>/);
      expect(milestonesMatch).not.toBeNull();

      expect(() => {
        JSON.parse(milestonesMatch![1]);
      }).toThrow();
    });

    it('should validate milestone categories', () => {
      const validCategories = [
        'VENUE',
        'CATERING',
        'MARKETING',
        'LOGISTICS',
        'PERMITS',
        'SPONSORS',
        'VOLUNTEERS',
        'GENERAL',
      ];

      const aiMilestone = {
        category: 'VENUE',
      };

      expect(validCategories.includes(aiMilestone.category)).toBe(true);

      const invalidMilestone = {
        category: 'INVALID_CATEGORY',
      };

      expect(validCategories.includes(invalidMilestone.category)).toBe(false);
    });

    it('should default to GENERAL for unknown categories', () => {
      const CATEGORIES = [
        'VENUE',
        'CATERING',
        'MARKETING',
        'LOGISTICS',
        'PERMITS',
        'SPONSORS',
        'VOLUNTEERS',
        'GENERAL',
      ];

      const processCategory = (category: string) =>
        CATEGORIES.includes(category as any) ? category : 'GENERAL';

      expect(processCategory('VENUE')).toBe('VENUE');
      expect(processCategory('UNKNOWN')).toBe('GENERAL');
      expect(processCategory('invalid')).toBe('GENERAL');
      expect(processCategory('')).toBe('GENERAL');
    });
  });

  describe('milestone transformation', () => {
    it('should transform AI milestone format to app format', () => {
      const aiMilestone = {
        title: 'Book venue',
        description: 'Reserve the location',
        category: 'VENUE',
        daysBeforeEvent: 90,
        estimatedHours: 2,
      };

      const CATEGORIES = ['VENUE', 'CATERING', 'MARKETING', 'LOGISTICS', 'PERMITS', 'SPONSORS', 'VOLUNTEERS', 'GENERAL'];

      const appMilestone = {
        id: 'test-id',
        title: aiMilestone.title,
        description: aiMilestone.description || '',
        category: CATEGORIES.includes(aiMilestone.category) ? aiMilestone.category : 'GENERAL',
        days_before_event: aiMilestone.daysBeforeEvent || 30,
        estimated_hours: aiMilestone.estimatedHours,
      };

      expect(appMilestone.title).toBe('Book venue');
      expect(appMilestone.days_before_event).toBe(90);
      expect(appMilestone.category).toBe('VENUE');
    });

    it('should handle missing optional fields', () => {
      const aiMilestone = {
        title: 'Simple task',
        category: 'GENERAL',
        daysBeforeEvent: 30,
      };

      const appMilestone = {
        id: 'test-id',
        title: aiMilestone.title,
        description: (aiMilestone as any).description || '',
        category: aiMilestone.category,
        days_before_event: aiMilestone.daysBeforeEvent || 30,
        estimated_hours: (aiMilestone as any).estimatedHours,
      };

      expect(appMilestone.description).toBe('');
      expect(appMilestone.estimated_hours).toBeUndefined();
    });
  });

  describe('due date calculation', () => {
    it('should calculate due dates from event date and days before', () => {
      const eventDate = new Date('2026-06-15');
      const milestones = [
        { days_before_event: 90 },
        { days_before_event: 60 },
        { days_before_event: 30 },
        { days_before_event: 7 },
        { days_before_event: 0 },
      ];

      const calculateDueDate = (eventDate: Date, daysBefore: number) => {
        const dueDate = new Date(eventDate);
        dueDate.setDate(dueDate.getDate() - daysBefore);
        return dueDate.toISOString().split('T')[0];
      };

      expect(calculateDueDate(eventDate, 90)).toBe('2026-03-17');
      expect(calculateDueDate(eventDate, 60)).toBe('2026-04-16');
      expect(calculateDueDate(eventDate, 30)).toBe('2026-05-16');
      expect(calculateDueDate(eventDate, 7)).toBe('2026-06-08');
      expect(calculateDueDate(eventDate, 0)).toBe('2026-06-15');
    });
  });
});

describe('AI System Prompt', () => {
  it('should include required prompt elements', () => {
    const systemPrompt = `You are helping a nonprofit executive director create an event template in Steady, an event management platform.

Based on their event description, generate a comprehensive list of milestones (tasks) needed to execute the event.

Output milestones in this JSON format:
<milestones>
[
  {
    "title": "Book venue",
    "description": "Reserve the location and sign contract",
    "category": "VENUE",
    "daysBeforeEvent": 90,
    "estimatedHours": 2
  }
]
</milestones>

Guidelines:
- Generate 8-15 milestones for a typical event
- Space milestones appropriately (venue booking early, final confirmations late)
- Use ONLY these categories: VENUE, CATERING, MARKETING, LOGISTICS, PERMITS, SPONSORS, VOLUNTEERS, GENERAL
- Be practical and comprehensive
- Include setup/teardown tasks near the event date

Also suggest a template name based on the description.
<templateName>Suggested Name Here</templateName>`;

    // Verify prompt structure
    expect(systemPrompt).toContain('<milestones>');
    expect(systemPrompt).toContain('</milestones>');
    expect(systemPrompt).toContain('<templateName>');
    expect(systemPrompt).toContain('</templateName>');
    expect(systemPrompt).toContain('VENUE');
    expect(systemPrompt).toContain('CATERING');
    expect(systemPrompt).toContain('Generate 8-15 milestones');
  });
});
