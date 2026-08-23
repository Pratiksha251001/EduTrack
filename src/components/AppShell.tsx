import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  FileChartColumnIncreasing,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { college } from '../lib/college';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export const AppShell: React.FC = () => {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Mark Attendance', path: '/attendance', icon: ClipboardCheck },
    ...(role === 'admin'
      ? [
          { label: 'Departments', path: '/departments', icon: Building2 },
          { label: 'Teachers', path: '/teachers', icon: Users },
          { label: 'Subjects', path: '/subjects', icon: BookOpen },
          { label: 'Students', path: '/students', icon: GraduationCap },
        ]
      : []),
    { label: 'Reports & PDF', path: '/reports', icon: FileChartColumnIncreasing },
    { label: 'Parent SMS Logs', path: '/sms-logs', icon: MessageSquare },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[oklch(28%_0.045_158)] text-[oklch(93%_0.015_130)] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-[oklch(36%_0.05_158)] px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground font-display font-extrabold text-xl shadow-md">
              S
            </div>
            <div>
              <h1 className="font-display text-base font-bold leading-tight text-white">{college.shortName}</h1>
              <p className="text-[11px] text-[oklch(80%_0.02_130)] leading-none">Smart Attendance</p>
            </div>
          </div>
          <button className="lg:hidden text-white" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-4 my-4 rounded-xl bg-[oklch(24%_0.03_158)] p-3 border border-[oklch(34%_0.05_158)]">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.full_name || 'User'}</p>
              <p className="truncate text-[10px] text-[oklch(75%_0.02_130)]">{user?.email}</p>
            </div>
            <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider">
              {role}
            </Badge>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-accent text-accent-foreground font-semibold shadow-sm'
                    : 'text-[oklch(90%_0.015_130)] hover:bg-[oklch(34%_0.05_158)] hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-accent-foreground' : 'text-[oklch(75%_0.02_130)]'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[oklch(36%_0.05_158)] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-[oklch(90%_0.015_130)] hover:bg-[oklch(34%_0.05_158)] hover:text-white"
            >
              {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </Button>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display font-bold text-lg">{college.shortName}</span>
          </div>
          <Badge variant="outline">{role}</Badge>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
