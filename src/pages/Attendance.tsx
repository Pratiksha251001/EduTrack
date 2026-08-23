import React, { useState, useMemo } from 'react';
import { Check, X, Send, AlertCircle, Save, Loader2 } from 'lucide-react';
import { localDb } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { college, generateSmsMessage } from '../lib/college';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog } from '../components/ui/dialog';

export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const subjects = localDb.subjects;
  const students = localDb.students;

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  const eligibleStudents = useMemo(() => {
    if (!selectedSubject) return [];
    return students.filter(
      st =>
        st.status === 'active' &&
        st.semester === selectedSubject.semester &&
        (!selectedSubject.department_id || st.department_id === selectedSubject.department_id) &&
        (searchQuery.trim() === '' ||
          st.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          st.roll_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [students, selectedSubject, searchQuery]);

  React.useEffect(() => {
    const existing = localDb.attendance.filter(
      a => a.subject_id === selectedSubjectId && a.date === selectedDate
    );
    const map: Record<string, 'present' | 'absent'> = {};
    eligibleStudents.forEach(st => {
      const rec = existing.find(r => r.student_id === st.id);
      map[st.id] = rec ? rec.status : 'present';
    });
    setAttendanceState(map);
  }, [selectedSubjectId, selectedDate, eligibleStudents]);

  const markAll = (status: 'present' | 'absent') => {
    const next: Record<string, 'present' | 'absent'> = {};
    eligibleStudents.forEach(st => (next[st.id] = status));
    setAttendanceState(next);
  };

  const toggleStudent = (id: string, status: 'present' | 'absent') => {
    setAttendanceState(prev => ({ ...prev, [id]: status }));
  };

  const absentees = eligibleStudents.filter(st => (attendanceState[st.id] || 'present') === 'absent');

  const handleSaveAndSendAlerts = async () => {
    if (!selectedSubject) return;
    setSaving(true);

    const records = eligibleStudents.map(st => ({
      student_id: st.id,
      subject_id: selectedSubject.id,
      date: selectedDate,
      status: attendanceState[st.id] || 'present',
      marked_by: user?.id || null
    }));

    await localDb.upsertAttendance(records);

    if (absentees.length > 0) {
      const smsEntries = absentees.map(st => ({
        student_id: st.id,
        subject_id: selectedSubject.id,
        student_name: st.full_name,
        parent_mobile: st.parent_mobile,
        message: generateSmsMessage(st.full_name, selectedDate, selectedSubject.name),
        status: (st.parent_mobile ? 'sent' : 'failed') as 'sent' | 'failed',
        attendance_date: selectedDate,
        sent_at: new Date().toISOString()
      }));
      await localDb.insert('sms_logs', smsEntries);
    }

    setSaving(false);
    setConfirmOpen(false);
    setSuccessMsg(`Attendance saved successfully! ${absentees.length} Parent SMS alerts dispatched.`);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Mark Subject Attendance</h2>
        <p className="text-sm text-muted-foreground">
          One daily record per student per subject. Absentees automatically queue parent SMS alerts.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          ✓ {successMsg}
        </div>
      )}

      <div className="surface-panel grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Select Subject</label>
          <Select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            options={subjects.map(s => ({
              value: s.id,
              label: `${s.code} · ${s.name} (Sem ${s.semester})`
            }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Attendance Date</label>
          <Input
            type="date"
            max={todayStr}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Filter Students</label>
          <Input
            placeholder="Search by name or roll no..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="surface-panel space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h3 className="font-display text-lg font-bold">
              {eligibleStudents.length} Students in Cohort
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedSubject?.name} · Semester {selectedSubject?.semester}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll('present')}>
              All Present
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll('absent')}>
              All Absent
            </Button>
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={eligibleStudents.length === 0}>
              <Save className="mr-2 h-4 w-4" /> Save Attendance
            </Button>
          </div>
        </div>

        {eligibleStudents.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No active students enrolled in this subject's semester and department.
          </div>
        ) : (
          <div className="space-y-2">
            {eligibleStudents.map(st => {
              const status = attendanceState[st.id] || 'present';
              return (
                <div
                  key={st.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3.5 transition-colors ${
                    status === 'absent'
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{st.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Roll No: <span className="font-medium text-foreground">{st.roll_number}</span> · Parent Mobile: {st.parent_mobile || 'None'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Badge variant={status === 'present' ? 'success' : 'destructive'} className="uppercase text-[10px]">
                      {status}
                    </Badge>
                    <Button
                      size="sm"
                      variant={status === 'present' ? 'default' : 'outline'}
                      onClick={() => toggleStudent(st.id, 'present')}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Present
                    </Button>
                    <Button
                      size="sm"
                      variant={status === 'absent' ? 'destructive' : 'outline'}
                      onClick={() => toggleStudent(st.id, 'absent')}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Absent
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle className="h-6 w-6" />
            <h3 className="font-display text-lg font-bold">Confirm Attendance & Parent SMS</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            You are saving attendance for <strong>{selectedSubject?.name}</strong> on <strong>{selectedDate}</strong>.
          </p>
          <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
            <p><strong>Total Marked:</strong> {eligibleStudents.length} students</p>
            <p><strong>Present:</strong> {eligibleStudents.length - absentees.length}</p>
            <p className="text-destructive font-semibold"><strong>Absent:</strong> {absentees.length} students</p>
          </div>
          {absentees.length > 0 && (
            <p className="text-xs text-muted-foreground">
              An automated SMS alert will be recorded and dispatched to {absentees.length} parent(s).
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAndSendAlerts} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Save & Trigger Alerts
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
