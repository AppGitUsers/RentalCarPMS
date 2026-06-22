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
  { value: 'manager', label: 'Manager' }, { value: 'driver', label: 'Driver' },
  { value: 'cleaner', label: 'Cleaner / Detailer' }, { value: 'front_desk', label: 'Front Desk' },
  { value: 'mechanic', label: 'Mechanic' }, { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  full_name: '', phone: '', email: '', role: 'driver', monthly_salary: '',
  date_joined: '', address: '', id_proof_number: '', notes: '',
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
        full_name: staff.full_name || '', phone: staff.phone || '', email: staff.email || '',
        role: staff.role || 'driver', monthly_salary: staff.monthly_salary || '',
        date_joined: staff.date_joined || '', address: staff.address || '',
        id_proof_number: staff.id_proof_number || '', notes: staff.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setPhotoFile(null);
    setErrors({});
  }, [staff, open]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Required';
    if (!form.phone.trim()) newErrors.phone = 'Required';
    if (!form.monthly_salary) newErrors.monthly_salary = 'Required';
    if (!form.date_joined) newErrors.date_joined = 'Required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

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
            <Input label="Phone Number" required value={form.phone} error={errors.phone}
              onChange={(e) => update('phone', e.target.value)} />
            <Select label="Role" options={ROLE_OPTIONS} value={form.role} onChange={(e) => update('role', e.target.value)} />
            <Input label="Date Joined" type="date" required value={form.date_joined} error={errors.date_joined}
              onChange={(e) => update('date_joined', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          <Input label="Monthly Salary (₹)" type="number" required value={form.monthly_salary} error={errors.monthly_salary}
            onChange={(e) => update('monthly_salary', e.target.value)} />
        </div>
        <Input label="ID Proof Number" value={form.id_proof_number} onChange={(e) => update('id_proof_number', e.target.value)} />
        <TextArea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} />
        <TextArea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}
