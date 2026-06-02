import { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { Alert, AlertDescription } from '@/components/ui/alert';

function ProfileSection() {
  const { data: user } = trpc.auth.currentUser.useQuery();
  const utils = trpc.useUtils();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated');
      utils.auth.currentUser.invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowChangePw(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    },
    onError: (err) => setPwError(getErrorMessage(err)),
  });

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate({ name, email });
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match');
      return;
    }
    setPwError('');
    changePassword.mutate({ currentPassword: currentPw, newPassword: newPw });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={updateProfile.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={updateProfile.isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground capitalize">{user?.role ?? '—'}</p>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setShowChangePw((v) => !v)}
            >
              {showChangePw ? 'Cancel password change' : 'Change password'}
            </button>
            <Button type="submit" size="sm" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>

        {showChangePw && (
          <>
            <Separator />
            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwError && (
                <Alert variant="destructive">
                  <AlertDescription>{pwError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="current-pw">Current password</Label>
                <Input
                  id="current-pw"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-pw">New password</Label>
                <div className="relative">
                  <Input
                    id="new-pw"
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPw((v) => !v)}
                    tabIndex={-1}
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw">Confirm new password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!currentPw || !newPw || !confirmPw || changePassword.isPending}
              >
                {changePassword.isPending ? 'Changing...' : 'Change password'}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function UsersSection() {
  const { data: user } = trpc.auth.currentUser.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'superadmin'>('admin');
  const [inviteError, setInviteError] = useState('');

  const inviteMutation = trpc.users.invite.useMutation({
    onSuccess: () => {
      toast.success('User created');
      setInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      setInviteRole('admin');
      utils.users.list.invalidate();
    },
    onError: (err) => setInviteError(getErrorMessage(err)),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success('User deleted');
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (user?.role !== 'superadmin') return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Users</CardTitle>
          <Button size="sm" className="gap-2" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {users?.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {u.role}
                </Badge>
                {u.id !== user.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete user ${u.name}?`)) {
                        deleteMutation.mutate({ id: u.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {(!users || users.length === 0) && (
            <p className="text-sm text-muted-foreground py-4 text-center">No users yet</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setInviteError('');
              inviteMutation.mutate({ name: inviteName, email: inviteEmail, role: inviteRole, password: invitePassword });
            }}
            className="space-y-4"
          >
            {inviteError && (
              <Alert variant="destructive">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as 'admin' | 'superadmin')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!inviteName || !inviteEmail || invitePassword.length < 8 || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Creating...' : 'Create user'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Settings() {
  return (
    <div className="max-w-2xl space-y-6">
      <ProfileSection />
      <UsersSection />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Coming soon</Badge>
            <span className="text-xs text-muted-foreground">
              Manage transaction categories and types
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
