import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as staffApi from '../../api/staff';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const DAYS = [
  { key: 'work_mon', label: 'Mon' },
  { key: 'work_tue', label: 'Tue' },
  { key: 'work_wed', label: 'Wed' },
  { key: 'work_thu', label: 'Thu' },
  { key: 'work_fri', label: 'Fri' },
  { key: 'work_sat', label: 'Sat' },
  { key: 'work_sun', label: 'Sun' },
];

const EMPTY_FORM = {
  name: '',
  start_time: '09:00',
  end_time: '17:00',
  late_grace_minutes: '15',
  ot_grace_minutes: '15',
  work_mon: true,
  work_tue: true,
  work_wed: true,
  work_thu: true,
  work_fri: true,
  work_sat: false,
  work_sun: false,
};

export default function ShiftFormModal({ open, onClose, shift, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (shift) {
      setForm({
        name: shift.name || '',
        start_time: shift.start_time || '09:00',
        end_time: shift.end_time || '17:00',
        late_grace_minutes: String(shift.late_grace_minutes ?? 15),
        ot_grace_minutes: String(shift.ot_grace_minutes ?? 15),
        work_mon: shift.work_mon ?? true,
        work_tue: shift.work_tue ?? true,
        work_wed: shift.work_wed ?? true,
        work_thu: shift.work_thu ?? true,
        work_fri: shift.work_fri ?? true,
        work_sat: shift.work_sat ?? false,
        work_sun: shift.work_sun ?? false,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [shift, open]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleDay = (key) => setForm((f) => ({ ...f, [key]: !f[key] }));

  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Required';
    if (!form.start_time) newErrors.start_time = 'Required';
    if (!form.end_time) newErrors.end_time = 'Required';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        start_time: form.start_time,
        end_time: form.end_time,
        late_grace_minutes: Number(form.late_grace_minutes) || 15,
        ot_grace_minutes: Number(form.ot_grace_minutes) || 15,
        work_mon: form.work_mon,
        work_tue: form.work_tue,
        work_wed: form.work_wed,
        work_thu: form.work_thu,
        work_fri: form.work_fri,
        work_sat: form.work_sat,
        work_sun: form.work_sun,
      };
      if (shift) {
        await staffApi.updateShift(shift.id, payload);
        showToast('Shift updated');
      } else {
        await staffApi.createShift(payload);
        showToast('Shift created');
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save shift', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={shift ? 'Edit Shift' : 'Add New Shift'}
      subtitle="Define shift timings, grace windows, and working days"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>{shift ? 'Save Changes' : 'Create Shift'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Shift Name" required
          value={form.name} error={errors.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g. Morning, Night, General"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time" type="time" required
            value={form.start_time} error={errors.start_time}
            onChange={(e) => update('start_time', e.target.value)}
          />
          <Input
            label="End Time" type="time" required
            value={form.end_time} error={errors.end_time}
            onChange={(e) => update('end_time', e.target.value)}
          />
        </div>

        {/* Working days */}
        <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Working Days</p>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleDay(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  form[key]
                    ? 'bg-navy-700 text-white border-navy-700'
                    : 'bg-white text-navy-400 border-navy-200 hover:border-navy-400'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-navy-400">
            Expected hours in payroll will only count these days in the month.
          </p>
        </div>

        <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4 space-y-4">
          <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Grace Windows</p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Late Grace (minutes)" type="number" min="0"
              value={form.late_grace_minutes}
              onChange={(e) => update('late_grace_minutes', e.target.value)}
              hint="Entry after this window is flagged Late"
            />
            <Input
              label="OT Grace (minutes)" type="number" min="0"
              value={form.ot_grace_minutes}
              onChange={(e) => update('ot_grace_minutes', e.target.value)}
              hint="Stay beyond this window counts as Overtime"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
