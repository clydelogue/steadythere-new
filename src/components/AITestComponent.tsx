import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateAIResponse } from '@/lib/ai';
import { Loader2 } from 'lucide-react';

export function AITestComponent() {
  const [prompt, setPrompt] = useState('Say hello and tell me a fun fact about the number 42.');
  const [response, setResponse] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ input_tokens: number; output_tokens: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setUsage(null);

    try {
      const result = await generateAIResponse({
        system: 'You are a helpful and friendly assistant. Keep responses concise.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.7,
      });

      setResponse(result.content);
      setUsage(result.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AI Edge Function Test</CardTitle>
        <CardDescription>
          Test the ai-generate edge function by sending a message to Claude.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm font-medium">
            Test Prompt
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your test message..."
            rows={3}
          />
        </div>

        <Button onClick={handleTest} disabled={loading || !prompt.trim()}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Generating...' : 'Send Test Message'}
        </Button>

        {error && (
          <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {response && (
          <div className="p-4 rounded-md bg-muted border">
            <p className="font-medium mb-2">Response</p>
            <p className="text-sm whitespace-pre-wrap">{response}</p>
          </div>
        )}

        {usage && (
          <div className="text-xs text-muted-foreground">
            Tokens used: {usage.input_tokens} input, {usage.output_tokens} output
          </div>
        )}
      </CardContent>
    </Card>
  );
}
