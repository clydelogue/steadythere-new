import { useState } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bell, Mail, Calendar } from 'lucide-react';

const daysOfWeek = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const NotificationSettings = () => {
  const { currentOrg, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    digest_enabled: currentOrg?.digest_enabled ?? true,
    digest_day: currentOrg?.digest_day?.toString() ?? '1',
    digest_time: currentOrg?.digest_time ?? '09:00',
  });

  const handleSave = async () => {
    if (!currentOrg) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          digest_enabled: formData.digest_enabled,
          digest_day: parseInt(formData.digest_day),
          digest_time: formData.digest_time,
        })
        .eq('id', currentOrg.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: 'Settings saved',
        description: 'Your notification settings have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentOrg) {
    return (
      <SettingsLayout title="Notifications" description="Manage notification preferences">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="Notifications" description="Manage notification preferences">
      <div className="space-y-6">
        {/* Weekly Digest */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Weekly Digest</CardTitle>
                <CardDescription>Receive a summary of upcoming events and tasks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="digest-toggle" className="text-base">Enable weekly digest</Label>
                <p className="text-sm text-muted-foreground">
                  Get a weekly email summarizing what's coming up
                </p>
              </div>
              <Switch
                id="digest-toggle"
                checked={formData.digest_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, digest_enabled: checked })}
              />
            </div>

            {formData.digest_enabled && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label htmlFor="digest-day">Send on</Label>
                  <Select 
                    value={formData.digest_day}
                    onValueChange={(value) => setFormData({ ...formData, digest_day: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digest-time">At</Label>
                  <Select 
                    value={formData.digest_time}
                    onValueChange={(value) => setFormData({ ...formData, digest_time: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="07:00">7:00 AM</SelectItem>
                      <SelectItem value="08:00">8:00 AM</SelectItem>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="12:00">12:00 PM</SelectItem>
                      <SelectItem value="17:00">5:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Reminder Notifications</CardTitle>
                <CardDescription>When to receive reminders about upcoming milestones</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Email reminders</p>
                  <p className="text-sm text-muted-foreground">Receive email notifications for due milestones</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="font-medium text-foreground">Overdue alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified when milestones become overdue</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="font-medium text-foreground">Assignment notifications</p>
                  <p className="text-sm text-muted-foreground">Notify when you're assigned to a milestone</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Updates */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Event Updates</CardTitle>
                <CardDescription>Notifications about event changes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Event date changes</p>
                  <p className="text-sm text-muted-foreground">When an event you're involved with changes dates</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="font-medium text-foreground">New milestones added</p>
                  <p className="text-sm text-muted-foreground">When new milestones are added to your events</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default NotificationSettings;
