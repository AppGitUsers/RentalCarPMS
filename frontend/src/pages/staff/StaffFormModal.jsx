import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import PhotoUpload from '../../components/ui/PhotoUpload';
import Button from '../../components/ui/Button';
import * as staffApi from '../../api/staff';
import { useToast } from '../../components/ui/Toast';

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Driver' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'watchman', label: 'Watchman' },
  { value: 'manager', label: 'Manager' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  full_name: '', phone: '', role: 'driver', monthly_salary: '',
  date_joined: '', is_active: true, address: '', id_proof_number: '', notes: '',
};

export default function StaffFormModal({ open, onClose, staff, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (staff) {
      setForm({
        full_name: staff.full_name || '',
        phone: staff.phone || '',
        role: staff.role || 'driver',
        monthly_salary: staff.monthly_salary || '',
        date_joined: staff.date_joined || '',
        is_active: staff.is_active !== false,
        address: staff.address || '',
        id_proof_number: staff.id_proof_number || '',
        notes: staff.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setPhotoFile(null);
    setErrors({});
  }, [staff, open]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Required';
    if (!form.monthly_salary) errs.monthly_salary = 'Required';
    if (!form.date_joined) errs.date_joined = 'Required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v ?? ''));
      if (photoFile) formData.append('photo', photoFile);

      if (staff) {
        await staffApi.updateStaffMember(staff.id, formData);
        showToast('Staff member updated');
      } else {
        await staffApi.createStaffMember(formData);
        showToast('Staff member added');
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save staff member', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={staff ? 'Edit Staff Member' : 'Add Staff Member'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>{staff ? 'Save Changes' : 'Add Staff'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-4">
          <PhotoUpload round existingUrl={staff?.photo} onChange={setPhotoFile} className="flex-shrink-0" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Input label="Full Name" required value={form.full_name} error={errors.full_name}
              onChange={(e) => update('full_name', e.target.value)} />
            <Input label="Phone Number" value={form.phone}
              onChange={(e) => update('phone', e.target.value)} />
            <Select label="Role" options={ROLE_OPTIONS} value={form.role}
              onChange={(e) => update('role', e.target.value)} />
            <Input label="Date Joined" type="date" required value={form.date_joined} error={errors.date_joined}
              onChange={(e) => update('date_joined', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Monthly Salary (₹)" type="number" required value={form.monthly_salary}
            error={errors.monthly_salary} onChange={(e) => update('monthly_salary', e.target.value)} />
          <Input label="ID Proof Number" value={form.id_proof_number}
            onChange={(e) => update('id_proof_number', e.target.value)} />
        </div>

        <TextArea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} />
        <TextArea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />

        {staff && (
          <label className="flex items-center gap-2 text-sm text-navy-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update('is_active', e.target.checked)}
              className="rounded"
            />
            Active staff member
          </label>
        )}
      </div>
    </Modal>
  );
}
