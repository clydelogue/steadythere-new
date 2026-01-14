import { AITestComponent } from '@/components/AITestComponent';
import { AppLayout } from '@/components/layout/AppLayout';

export default function AITest() {
  return (
    <AppLayout title="AI Test" subtitle="Test the AI edge function">
      <AITestComponent />
    </AppLayout>
  );
}
