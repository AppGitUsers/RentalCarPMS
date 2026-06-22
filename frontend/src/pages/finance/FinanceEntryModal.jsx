import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import * as financeApi from '../../api/finance';
import { useToast } from '../../components/ui/Toast';
import { toDateInputValue } from '../../utils/format';

const CATEGORY_OPTIONS = [
  { value: 'fuel', label: 'Fuel' }, { value: 'maintenance', label: 'Vehicle Maintenance' },
  { value: 'office', label: 'Office / Rent' }, { value: 'marketing', label: 'Marketing' },
  { value: 'insurance', label: 'Insurance' }, { value: 'misc_income', label: 'Other Income' },
  { value: 'misc_expense', label: 'Other Expense' },
];

export default function FinanceEntryModal({ open, onClose, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    entry_type: 'expense', category: 'misc_expense', title: '', amount: '',
    date: toDateInputValue(new Date()), notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({ entry_type: 'expense', category: 'misc_expense', title: '', amount: '', date: toDateInputValue(new Date()), notes: '' });
      setErrors({});
    }
  }, [open]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.amount) e.amount = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      await financeApi.createFinanceEntry(form);
      showToast('Entry added to Finance');
      onSaved();
      onClose();
    } catch {
      showToast('Could not save entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="Add Income / Expense"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} loading={saving}>Add Entry</Button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {['income', 'expense'].map((t) => (
            <button
              key={t}
              onClick={() => update('entry_type', t)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                form.entry_type === t ? 'border-navy-800 bg-navy-800 text-white' : 'border-navy-200 text-navy-600 hover:bg-navy-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Input label="Title" required value={form.title} error={errors.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Diesel refill for fleet" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount (₹)" type="number" required value={form.amount} error={errors.amount} onChange={(e) => update('amount', e.target.value)} />
          <Input label="Date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
        </div>
        <Select label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => update('category', e.target.value)} />
        <TextArea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}
