import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  MessageSquare,
  BarChart3,
  FileText,
  ShieldCheck,
  Users,
  Sparkles,
  Lock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { college } from '../lib/college';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export const LandingAuth: React.FC = () => {
  const { loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginAsDemo('admin');
    navigate('/dashboard', { replace: true });
  };

  const handleDemo = async (role: 'admin' | 'teacher') => {
    setLoading(true);
    await loginAsDemo(role);
    navigate('/dashboard', { replace: true });
  };

  const features = [
    {
      icon: ClipboardCheck,
      title: 'Mark in Seconds',
      desc: 'Subject-wise roll call with present/absent toggles and same-day corrections by assigned teachers.',
    },
    {
      icon: MessageSquare,
      title: 'Automated Parent Alerts',
      desc: 'Absentees are detected immediately and custom SMS messages are automatically prepared for parents.',
    },
    {
      icon: BarChart3,
      title: 'Live Analytical Dashboards',
      desc: 'Daily percentages, subject trends, and automated warnings for students slipping below the 75% threshold.',
    },
    {
      icon: FileText,
      title: 'Audit-Ready PDF & CSV',
      desc: 'Branded official reports with signature lines for HODs & Principal, plus instant Excel/CSV data exports.',
    },
    {
      icon: Users,
      title: 'Role-Based Control',
      desc: 'Comprehensive management of departments, staff, subjects, and student cohorts with strict security.',
    },
    {
      icon: ShieldCheck,
      title: 'Cloud & Sandbox Sync',
      desc: 'Seamless dual-mode storage: connect directly to Supabase Postgres or test instantly in standalone sandbox.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background py-20 px-6">
        <div className="mx-auto max-w-5xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Next-Generation Academic Attendance System
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
            {college.name}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {college.tagline} — seamless morning roll calls, automated parent SMS notifications, and audit-ready reports.
          </p>

          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-left">
            <div className="flex border-b border-border mb-6">
              <button
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  tab === 'signin' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setTab('signin')}
              >
                Sign In
              </button>
              <button
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  tab === 'signup' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setTab('signup')}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <Input required placeholder="Dr. John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <Input required type="email" placeholder="faculty@smit.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Password</label>
                <Input required type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                {tab === 'signin' ? 'Sign In to Portal' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Lock className="h-3.5 w-3.5" /> Instant Sandbox Demo
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                One-click access preloaded with departments, subjects, students, and 14 days of historical attendance.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleDemo('admin')} disabled={loading}>
                  Demo Administrator
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleDemo('teacher')} disabled={loading}>
                  Demo Teacher
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center space-y-2 mb-12">
          <h2 className="font-display text-3xl font-bold">Comprehensive Faculty & Admin Tools</h2>
          <p className="text-muted-foreground text-sm">Engineered specifically for academic institutions.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="surface-panel space-y-3 hover:border-primary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-bold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
