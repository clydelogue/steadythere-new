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

describe('parseAIMilestones - edge cases', () => {
  // Helper function to parse milestones (mirrors app logic)
  const parseMilestones = (content: string) => {
    const match = content.match(/<milestones>([\s\S]*?)<\/milestones>/);
    if (!match) return null;
    return JSON.parse(match[1]);
  };

  const CATEGORIES = [
    'VENUE', 'CATERING', 'MARKETING', 'LOGISTICS',
    'PERMITS', 'SPONSORS', 'VOLUNTEERS', 'GENERAL',
  ];

  const processCategory = (category: string) =>
    CATEGORIES.includes(category) ? category : 'GENERAL';

  const processMilestone = (m: any) => ({
    id: 'test-id',
    title: m.title || '',
    description: m.description || '',
    category: processCategory(m.category),
    days_before_event: typeof m.daysBeforeEvent === 'number' ? m.daysBeforeEvent : 30,
    estimated_hours: m.estimatedHours,
  });

  it('handles empty response', () => {
    const result = parseMilestones('');
    expect(result).toBeNull();
  });

  it('handles response with only whitespace', () => {
    const result = parseMilestones('   \n\t   ');
    expect(result).toBeNull();
  });

  it('handles malformed JSON', () => {
    const content = `<milestones>
[
  { "title": "Test", "category": VENUE }
]
</milestones>`;

    const match = content.match(/<milestones>([\s\S]*?)<\/milestones>/);
    expect(match).not.toBeNull();
    expect(() => JSON.parse(match![1])).toThrow();
  });

  it('handles partial JSON (unclosed array)', () => {
    const content = `<milestones>
[
  { "title": "Test", "category": "VENUE" }
</milestones>`;

    const match = content.match(/<milestones>([\s\S]*?)<\/milestones>/);
    expect(match).not.toBeNull();
    expect(() => JSON.parse(match![1])).toThrow();
  });

  it('handles response with extra text before JSON tags', () => {
    const content = `Here are the suggested milestones for your event:

Some additional context and explanation here.

<milestones>
[
  {
    "title": "Book venue",
    "category": "VENUE",
    "daysBeforeEvent": 90
  }
]
</milestones>

Let me know if you need any changes!`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Book venue');
  });

  it('handles response with extra text after JSON tags', () => {
    const content = `<milestones>
[
  {
    "title": "Setup chairs",
    "category": "LOGISTICS",
    "daysBeforeEvent": 1
  }
]
</milestones>

I hope these milestones help you plan your event effectively!`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result[0].title).toBe('Setup chairs');
  });

  it('handles nested quotes in milestone titles', () => {
    const content = `<milestones>
[
  {
    "title": "Book \\"The Grand Ballroom\\" venue",
    "category": "VENUE",
    "daysBeforeEvent": 90
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result[0].title).toBe('Book "The Grand Ballroom" venue');
  });

  it('handles unicode characters', () => {
    const content = `<milestones>
[
  {
    "title": "Réserver le café ☕",
    "description": "Pour l'événement spécial 日本語",
    "category": "CATERING",
    "daysBeforeEvent": 30
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result[0].title).toBe('Réserver le café ☕');
    expect(result[0].description).toBe("Pour l'événement spécial 日本語");
  });

  it('handles emoji in titles and descriptions', () => {
    const content = `<milestones>
[
  {
    "title": "🎉 Launch party planning",
    "description": "Plan the celebration 🎊🥳",
    "category": "GENERAL",
    "daysBeforeEvent": 7
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result[0].title).toBe('🎉 Launch party planning');
  });

  it('handles very long milestone titles', () => {
    const longTitle = 'A'.repeat(500);
    const content = `<milestones>
[
  {
    "title": "${longTitle}",
    "category": "GENERAL",
    "daysBeforeEvent": 30
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result[0].title).toBe(longTitle);
    expect(result[0].title.length).toBe(500);
  });

  it('handles milestones with missing optional fields', () => {
    const content = `<milestones>
[
  {
    "title": "Minimal milestone",
    "category": "GENERAL",
    "daysBeforeEvent": 30
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();

    const processed = processMilestone(result[0]);
    expect(processed.title).toBe('Minimal milestone');
    expect(processed.description).toBe('');
    expect(processed.estimated_hours).toBeUndefined();
  });

  it('handles invalid category values gracefully', () => {
    const content = `<milestones>
[
  {
    "title": "Task with invalid category",
    "category": "FOOD_AND_DRINKS",
    "daysBeforeEvent": 30
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();

    const processed = processMilestone(result[0]);
    expect(processed.category).toBe('GENERAL'); // Falls back to GENERAL
  });

  it('handles lowercase category values', () => {
    const content = `<milestones>
[
  {
    "title": "Task with lowercase category",
    "category": "venue",
    "daysBeforeEvent": 30
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();

    const processed = processMilestone(result[0]);
    expect(processed.category).toBe('GENERAL'); // Lowercase is not valid
  });

  it('handles invalid days_before_event values', () => {
    const content = `<milestones>
[
  {
    "title": "Task with string days",
    "category": "GENERAL",
    "daysBeforeEvent": "thirty"
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();

    const processed = processMilestone(result[0]);
    expect(processed.days_before_event).toBe(30); // Falls back to default
  });

  it('handles negative days_before_event', () => {
    const content = `<milestones>
[
  {
    "title": "Post-event task",
    "category": "GENERAL",
    "daysBeforeEvent": -5
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();

    const processed = processMilestone(result[0]);
    expect(processed.days_before_event).toBe(-5); // Preserves negative value
  });

  it('handles null values in milestone fields', () => {
    const content = `<milestones>
[
  {
    "title": "Task with nulls",
    "description": null,
    "category": "GENERAL",
    "daysBeforeEvent": 30,
    "estimatedHours": null
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();

    const processed = processMilestone(result[0]);
    expect(processed.description).toBe('');
    expect(processed.estimated_hours).toBeNull();
  });

  it('handles empty milestones array', () => {
    const content = `<milestones>
[]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(0);
  });

  it('handles large number of milestones', () => {
    const milestones = Array.from({ length: 50 }, (_, i) => ({
      title: `Milestone ${i + 1}`,
      category: 'GENERAL',
      daysBeforeEvent: 100 - i * 2,
    }));

    const content = `<milestones>
${JSON.stringify(milestones, null, 2)}
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(50);
    expect(result[0].title).toBe('Milestone 1');
    expect(result[49].title).toBe('Milestone 50');
  });

  it('handles milestones with special characters in strings', () => {
    const content = `<milestones>
[
  {
    "title": "Task with special chars: <>&'\\n\\t",
    "description": "Line 1\\nLine 2\\tTabbed",
    "category": "GENERAL",
    "daysBeforeEvent": 30
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result[0].title).toContain('<>&');
  });

  it('handles response with multiple milestone tags (uses first)', () => {
    const content = `<milestones>
[
  {
    "title": "First batch",
    "category": "GENERAL",
    "daysBeforeEvent": 30
  }
]
</milestones>

<milestones>
[
  {
    "title": "Second batch",
    "category": "VENUE",
    "daysBeforeEvent": 60
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();
    expect(result[0].title).toBe('First batch');
  });

  it('handles zero daysBeforeEvent', () => {
    const content = `<milestones>
[
  {
    "title": "Day-of task",
    "category": "LOGISTICS",
    "daysBeforeEvent": 0
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();

    const processed = processMilestone(result[0]);
    expect(processed.days_before_event).toBe(0);
  });

  it('handles floating point daysBeforeEvent', () => {
    const content = `<milestones>
[
  {
    "title": "Task with float",
    "category": "GENERAL",
    "daysBeforeEvent": 30.5
  }
]
</milestones>`;

    const result = parseMilestones(content);
    expect(result).not.toBeNull();

    const processed = processMilestone(result[0]);
    expect(processed.days_before_event).toBe(30.5);
  });
});

describe('generateMilestonesPrompt', () => {
  // Helper to simulate prompt generation
  const generatePrompt = (eventInfo: {
    name?: string;
    description?: string;
    date?: string;
  }) => {
    let prompt = '';
    if (eventInfo.name) {
      prompt += `Event name: ${eventInfo.name}\n`;
    }
    if (eventInfo.description) {
      prompt += `Description: ${eventInfo.description}\n`;
    }
    if (eventInfo.date) {
      prompt += `Event date: ${eventInfo.date}\n`;
    }
    return prompt.trim();
  };

  it('includes event name in prompt', () => {
    const prompt = generatePrompt({ name: 'Annual Gala' });
    expect(prompt).toContain('Annual Gala');
  });

  it('includes event description in prompt', () => {
    const prompt = generatePrompt({
      name: 'Gala',
      description: 'A fancy fundraising dinner',
    });
    expect(prompt).toContain('A fancy fundraising dinner');
  });

  it('includes event date in prompt', () => {
    const prompt = generatePrompt({
      name: 'Gala',
      date: '2026-06-15',
    });
    expect(prompt).toContain('2026-06-15');
  });

  it('handles missing description', () => {
    const prompt = generatePrompt({ name: 'Simple Event' });
    expect(prompt).toContain('Simple Event');
    expect(prompt).not.toContain('Description:');
  });

  it('handles all fields present', () => {
    const prompt = generatePrompt({
      name: 'Golf Tournament',
      description: '18-hole charity tournament',
      date: '2026-09-20',
    });
    expect(prompt).toContain('Golf Tournament');
    expect(prompt).toContain('18-hole charity tournament');
    expect(prompt).toContain('2026-09-20');
  });

  it('handles empty input', () => {
    const prompt = generatePrompt({});
    expect(prompt).toBe('');
  });
});

describe('templateName parsing', () => {
  const parseTemplateName = (content: string) => {
    const match = content.match(/<templateName>([\s\S]*?)<\/templateName>/);
    return match ? match[1].trim() : null;
  };

  it('extracts template name from response', () => {
    const content = `<templateName>Golf Tournament</templateName>`;
    expect(parseTemplateName(content)).toBe('Golf Tournament');
  });

  it('handles template name with surrounding whitespace', () => {
    const content = `<templateName>
    Annual Charity Gala
    </templateName>`;
    expect(parseTemplateName(content)).toBe('Annual Charity Gala');
  });

  it('returns null when no template name tag', () => {
    const content = `Here are the milestones...`;
    expect(parseTemplateName(content)).toBeNull();
  });

  it('handles empty template name', () => {
    const content = `<templateName></templateName>`;
    expect(parseTemplateName(content)).toBe('');
  });

  it('handles template name with special characters', () => {
    const content = `<templateName>Annual Gala & Awards (2026)</templateName>`;
    expect(parseTemplateName(content)).toBe('Annual Gala & Awards (2026)');
  });
});
