import { supabase } from "@/integrations/supabase/client";

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface GenerateAIResponseParams {
  messages: AIMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Generate an AI response using Claude via the ai-generate edge function.
 * Requires an authenticated user session.
 * 
 * @example
 * const result = await generateAIResponse({
 *   system: 'You are a helpful assistant.',
 *   messages: [{ role: 'user', content: 'Say hello' }],
 * });
 * console.log(result.content);
 */
export async function generateAIResponse({
  messages,
  system,
  maxTokens = 2000,
  temperature = 0.7,
}: GenerateAIResponseParams): Promise<AIResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await supabase.functions.invoke('ai-generate', {
    body: { 
      messages, 
      system, 
      max_tokens: maxTokens, 
      temperature 
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to generate AI response');
  }

  return response.data as AIResponse;
}
