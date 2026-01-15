import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  User, 
  Users, 
  Bell, 
  FileText,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const settingsNav = [
  { 
    name: 'Organization', 
    href: '/settings/organization', 
    icon: Building2,
    description: 'Name, timezone & defaults'
  },
  { 
    name: 'Profile', 
    href: '/settings/profile', 
    icon: User,
    description: 'Your personal settings'
  },
  { 
    name: 'Team', 
    href: '/settings/team', 
    icon: Users,
    description: 'Members & roles'
  },
  { 
    name: 'Notifications', 
    href: '/settings/notifications', 
    icon: Bell,
    description: 'Email & digest settings'
  },
  { 
    name: 'Templates', 
    href: '/templates', 
    icon: FileText,
    description: 'Event templates'
  },
];

interface SettingsLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function SettingsLayout({ children, title, description }: SettingsLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden border-b border-border bg-card">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading font-semibold text-foreground">Settings</h1>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-57px)] lg:min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-card">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="shrink-0">
                <Link to="/">
                  <ChevronLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="font-heading text-lg font-semibold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your workspace</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {settingsNav.map((item) => {
              const isActive = item.href === '/templates' 
                ? location.pathname.startsWith('/templates')
                : location.pathname === item.href;
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                    'hover:bg-muted',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  <item.icon className={cn(
                    'w-5 h-5 shrink-0',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  )} />
                  <div className="min-w-0">
                    <p className={cn(
                      'font-medium text-sm',
                      isActive ? 'text-primary-foreground' : 'text-foreground'
                    )}>
                      {item.name}
                    </p>
                    <p className={cn(
                      'text-xs truncate',
                      isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {item.description}
                    </p>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="lg:hidden w-full">
          <div className="flex overflow-x-auto gap-2 p-4 border-b border-border bg-card">
            {settingsNav.map((item) => {
              const isActive = item.href === '/templates' 
                ? location.pathname.startsWith('/templates')
                : location.pathname === item.href;
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
          
          {/* Mobile Content */}
          <main className="p-4">
            <div className="mb-6">
              <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {children}
          </main>
        </div>

        {/* Desktop Content */}
        <main className="hidden lg:block flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl">
            <div className="mb-8">
              <h2 className="font-heading text-2xl font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
