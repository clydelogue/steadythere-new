import { useState, useCallback, KeyboardEvent } from 'react';
import { X, Mail, Loader2, UserPlus, Send, AlertCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useInvitations, InvitationResult } from '@/hooks/useInvitations';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_CONFIG, getAssignableRoles } from '@/lib/permissions';
import type { OrgRole } from '@/types/database';
import { toast } from 'sonner';

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
  eventName?: string;
}

export function InviteTeamMemberDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
}: InviteTeamMemberDialogProps) {
  const { currentOrg, currentOrgMember } = useAuth();
  const { sendInvitations, isSendingInvitations } = useInvitations();

  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState<OrgRole>('volunteer');
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<InvitationResult[] | null>(null);

  const userRole = currentOrgMember?.role as OrgRole | undefined;
  const assignableRoles = userRole ? getAssignableRoles(userRole) : [];

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const addEmail = useCallback((email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && validateEmail(trimmed) && !emails.includes(trimmed)) {
      setEmails(prev => [...prev, trimmed]);
      setEmailInput('');
      return true;
    }
    return false;
  }, [emails]);

  const removeEmail = useCallback((email: string) => {
    setEmails(prev => prev.filter(e => e !== email));
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
      e.preventDefault();
      if (emailInput.trim()) {
        if (!addEmail(emailInput)) {
          if (!validateEmail(emailInput)) {
            toast.error('Invalid email format');
          } else if (emails.includes(emailInput.trim().toLowerCase())) {
            toast.error('Email already added');
          }
        }
      }
    } else if (e.key === 'Backspace' && !emailInput && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Split by common delimiters (comma, semicolon, newline, space)
    const pastedEmails = pastedText.split(/[,;\n\s]+/).filter(Boolean);

    let addedCount = 0;
    pastedEmails.forEach(email => {
      if (addEmail(email)) addedCount++;
    });

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} email${addedCount > 1 ? 's' : ''}`);
    }
  };

  const handleSendInvitations = async () => {
    if (emails.length === 0) {
      toast.error('Please add at least one email address');
      return;
    }

    try {
      const response = await sendInvitations({
        emails,
        role,
        eventId,
        message: message.trim() || undefined,
      });

      setResults(response.results);

      const successCount = response.results.filter(r => r.success).length;
      const failureCount = response.results.filter(r => !r.success).length;

      if (successCount > 0 && failureCount === 0) {
        toast.success(`${successCount} invitation${successCount > 1 ? 's' : ''} sent successfully!`);
        // Reset and close after short delay to show success
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
        }, 1500);
      } else if (successCount > 0) {
        toast.success(`${successCount} sent, ${failureCount} failed`);
      } else {
        toast.error('Failed to send invitations');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitations');
    }
  };

  const resetForm = () => {
    setEmails([]);
    setEmailInput('');
    setRole('volunteer');
    setMessage('');
    setResults(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const inviteContext = eventId && eventName
    ? `to collaborate on "${eventName}"`
    : `to join ${currentOrg?.name}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Members
          </DialogTitle>
          <DialogDescription>
            Send email invitations {inviteContext}. Recipients will receive a link to sign up and join.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          // Show results after sending
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-950/30'
                      : 'bg-red-50 dark:bg-red-950/30'
                  }`}
                >
                  {result.success ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  <span className="text-sm flex-1 truncate">{result.email}</span>
                  {!result.success && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Input form
          <div className="space-y-4 py-4">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Addresses</label>
              <div className="min-h-[80px] p-2 border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {emails.map(email => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1 py-1 pl-2 pr-1"
                    >
                      <Mail className="h-3 w-3" />
                      <span className="max-w-[150px] truncate">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="ml-1 p-0.5 rounded hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  type="text"
                  placeholder={emails.length === 0 ? "Enter email addresses..." : "Add more..."}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onBlur={() => {
                    if (emailInput.trim()) {
                      addEmail(emailInput);
                    }
                  }}
                  className="border-0 shadow-none focus-visible:ring-0 p-0 h-8"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter, comma, or space to add. Paste multiple emails at once.
              </p>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex flex-col items-start">
                        <span>{ROLE_CONFIG[r].label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_CONFIG[role].description}
              </p>
            </div>

            {/* Personal Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Personal Message (Optional)</label>
              <Textarea
                placeholder="Add a personal note to your invitation..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/500
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {results ? (
            <Button onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInvitations}
                disabled={emails.length === 0 || isSendingInvitations}
              >
                {isSendingInvitations ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send {emails.length > 0 ? `${emails.length} ` : ''}Invitation{emails.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
