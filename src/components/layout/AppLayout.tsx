import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Sidebar from './Sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NavLink } from 'react-router-dom';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/transactions') return 'Transactions';
  if (pathname === '/companies/new') return 'Create Company';
  if (pathname.startsWith('/companies/')) return 'Company';
  if (pathname === '/companies') return 'Companies';
  if (pathname === '/contacts') return 'Contacts';
  if (pathname === '/contacts/new') return 'Add Contact';
  if (pathname.startsWith('/contacts/')) return 'Contact';
  if (pathname === '/reporting') return 'Reporting';
  if (pathname === '/settings') return 'Settings';
  return 'Book Centre';
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { data: user } = trpc.auth.currentUser.useQuery();

  const title = getTitle(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background shrink-0">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
            </Button>

            {/* Profile avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user?.name ? getInitials(user.name) : 'BC'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/settings">Settings</NavLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
