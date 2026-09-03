import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Globe,
  MessageSquare,
  Copy,
  Check,
  Send,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { localDb } from '../lib/supabase';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  SMS_LANGUAGES,
  getParentWhatsAppUrl,
} from '../lib/college';
import { SmsLanguage } from '../lib/types';
import { ParentAlertModal } from '../components/ParentAlertModal';

export const SmsLogs: React.FC = () => {
  const [version, setVersion] = useState(0);
  const logs = localDb.sms_logs;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'__all' | 'sent' | 'failed'>('__all');
  const [langFilter, setLangFilter] = useState<'__all' | SmsLanguage>('__all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal state
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [modalStudentName, setModalStudentName] = useState('');
  const [modalParentMobile, setModalParentMobile] = useState('');
  const [modalParentName, setModalParentName] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [modalLang, setModalLang] = useState<SmsLanguage>('trilingual');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== '__all' && log.status !== statusFilter) return false;
      if (langFilter !== '__all') {
        const logLang = log.language || 'trilingual';
        if (logLang !== langFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.student_name.toLowerCase().includes(q) ||
          (log.parent_mobile && log.parent_mobile.toLowerCase().includes(q)) ||
          log.message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, statusFilter, langFilter, version]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openTranslateModal = (log: (typeof logs)[0]) => {
    const matchedStudent = localDb.students.find(s => s.id === log.student_id || s.full_name === log.student_name);
    setModalStudentName(log.student_name);
    setModalParentMobile(log.parent_mobile || matchedStudent?.parent_mobile || '');
    setModalParentName(matchedStudent?.parent_name || 'Parent');
    setModalDate(log.attendance_date);
    setModalLang((log.language as SmsLanguage) || 'trilingual');
    setAlertModalOpen(true);
  };

  const openNewAlertModal = () => {
    const firstStudent = localDb.students[0];
    setModalStudentName(firstStudent?.full_name || 'Student');
    setModalParentMobile(firstStudent?.parent_mobile || '');
    setModalParentName(firstStudent?.parent_name || 'Parent');
    setModalDate(new Date().toISOString().split('T')[0]);
    setModalLang('trilingual');
    setAlertModalOpen(true);
  };

  const getLanguageBadge = (langCode?: string) => {
    switch (langCode) {
      case 'mr':
        return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">🚩 मराठी</Badge>;
      case 'hi':
        return <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30">🇮🇳 हिंदी</Badge>;
      case 'en':
        return <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">🇬🇧 English</Badge>;
      case 'bilingual_mr':
        return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">📑 Eng+मराठी</Badge>;
      case 'bilingual_hi':
        return <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">📑 Eng+हिंदी</Badge>;
      case 'trilingual':
      default:
        return <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">🌐 त्रिभाषिक (All 3)</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Parent Absentee SMS Logs</h2>
          <p className="text-sm text-muted-foreground">
            Complete dispatch record of parent absence alerts sent in English, मराठी (Marathi), and हिंदी (Hindi).
          </p>
        </div>

        <Button onClick={openNewAlertModal} size="sm" className="self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-1.5" />
          Send Parent Alert
        </Button>
      </div>

      {toastMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>✓ {toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* Language Overview Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Multi-Language Parent Communication Active
            </span>
            <span className="text-[11px] text-muted-foreground block">
              Alerts are formulated in English, Marathi (स्थानिक पालकांसाठी), and Hindi (सरल संवाद) for instant parental comprehension.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10px]">🌐 English</Badge>
          <Badge variant="outline" className="text-[10px]">🚩 मराठी</Badge>
          <Badge variant="outline" className="text-[10px]">🇮🇳 हिंदी</Badge>
        </div>
      </div>

      <div className="surface-panel grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Search Log</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by student, mobile, or text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Globe className="h-3 w-3 text-primary" />
            Language Filter
          </label>
          <Select
            value={langFilter}
            onChange={(e: any) => setLangFilter(e.target.value)}
            options={[
              { value: '__all', label: 'All Languages (सर्व भाषा)' },
              { value: 'trilingual', label: '🌐 त्रिभाषिक (All 3 Languages)' },
              { value: 'mr', label: '🚩 मराठी (Marathi Only)' },
              { value: 'hi', label: '🇮🇳 हिंदी (Hindi Only)' },
              { value: 'en', label: '🇬🇧 English (English Only)' },
              { value: 'bilingual_mr', label: '📑 English + मराठी' },
              { value: 'bilingual_hi', label: '📑 English + हिंदी' },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Status Filter</label>
          <Select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            options={[
              { value: '__all', label: 'All Statuses' },
              { value: 'sent', label: 'Delivered / Sent' },
              { value: 'failed', label: 'Failed (No Number)' },
            ]}
          />
        </div>
      </div>

      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Parent Mobile</TableHead>
              <TableHead>Absence Date</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[280px]">SMS Message Content</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No SMS alert logs found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const waUrl = log.parent_mobile
                  ? getParentWhatsAppUrl(log.parent_mobile, log.message)
                  : null;

                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-semibold text-foreground whitespace-nowrap">
                      {log.student_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {log.parent_mobile || <span className="text-rose-500 font-bold">No Number</span>}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{log.attendance_date}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getLanguageBadge(log.language)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant={log.status === 'sent' ? 'success' : 'destructive'}
                        className="uppercase text-[10px]"
                      >
                        {log.status === 'sent' ? (
                          <CheckCircle className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1 inline" />
                        )}
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-md whitespace-pre-line text-foreground/90 bg-muted/20 p-2.5 rounded-lg border border-border/40 font-sans leading-relaxed">
                      {log.message}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(log.id, log.message)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Copy SMS text"
                        >
                          {copiedId === log.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Send via WhatsApp to parent"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">WhatsApp</span>
                          </a>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTranslateModal(log)}
                          className="h-7 px-2 text-xs"
                          title="View / Translate to Marathi, Hindi or English"
                        >
                          <Globe className="h-3.5 w-3.5 mr-1 text-primary" />
                          Translate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ParentAlertModal
        open={alertModalOpen}
        onOpenChange={setAlertModalOpen}
        studentName={modalStudentName}
        parentMobile={modalParentMobile}
        parentName={modalParentName}
        date={modalDate}
        initialLanguage={modalLang}
        onSuccess={(msg) => {
          setToastMsg(msg);
          setVersion(v => v + 1);
        }}
      />
    </div>
  );
};
