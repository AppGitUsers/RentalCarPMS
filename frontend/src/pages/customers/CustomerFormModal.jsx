import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import PhotoUpload from '../../components/ui/PhotoUpload';
import Button from '../../components/ui/Button';
import * as customersApi from '../../api/customers';
import { useToast } from '../../components/ui/Toast';

const ID_PROOF_OPTIONS = [
  { value: 'driving_license', label: 'Driving License' },
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  full_name: '', phone: '', alternate_phone: '', email: '', address: '',
  id_proof_type: 'driving_license', id_proof_number: '', driving_license_number: '', notes: '',
};

export default function CustomerFormModal({ open, onClose, customer, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setForm({
        full_name: customer.full_name || '', phone: customer.phone || '',
        alternate_phone: customer.alternate_phone || '', email: customer.email || '',
        address: customer.address || '', id_proof_type: customer.id_proof_type || 'driving_license',
        id_proof_number: customer.id_proof_number || '', driving_license_number: customer.driving_license_number || '',
        notes: customer.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setFiles({});
    setErrors({});
  }, [customer, open]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Required';
    if (!form.phone.trim()) newErrors.phone = 'Required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v ?? ''));
      const fileDebug = {};
      Object.entries(files).forEach(([k, file]) => {
        if (file) {
          formData.append(k, file);
          fileDebug[k] = `${file.name} | ${file.type || '(no type)'} | ${file.size}b`;
        }
      });
      console.log('[CustomerForm] submitting files:', fileDebug);

      if (customer) {
        await customersApi.updateCustomer(customer.id, formData);
        showToast('Customer updated successfully');
      } else {
        await customersApi.createCustomer(formData);
        showToast('Customer added successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      const d = err.response?.data;
      let msg = 'Could not save customer';
      if (d) {
        if (d.detail) {
          msg = d.detail;
        } else if (typeof d === 'object') {
          const parts = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`);
          if (parts.length) msg = parts.join(' · ');
        }
      }
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add New Customer'}
      subtitle="Legal and contact details for the renter"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>{customer ? 'Save Changes' : 'Add Customer'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" required value={form.full_name} error={errors.full_name}
            onChange={(e) => update('full_name', e.target.value)} placeholder="Customer's full name" />
          <Input label="Phone Number" required value={form.phone} error={errors.phone}
            onChange={(e) => update('phone', e.target.value)} placeholder="10-digit mobile number" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Alternate Phone" value={form.alternate_phone}
            onChange={(e) => update('alternate_phone', e.target.value)} placeholder="Optional" />
          <Input label="Email" type="email" value={form.email}
            onChange={(e) => update('email', e.target.value)} placeholder="Optional" />
        </div>
        <TextArea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="ID Proof Type" options={ID_PROOF_OPTIONS} value={form.id_proof_type}
            onChange={(e) => update('id_proof_type', e.target.value)} />
          <Input label="ID Proof Number" value={form.id_proof_number}
            onChange={(e) => update('id_proof_number', e.target.value)} placeholder="e.g. DL number, Aadhaar number" />
        </div>
        <Input label="Driving License Number" value={form.driving_license_number}
          onChange={(e) => update('driving_license_number', e.target.value)} placeholder="Required to drive the rented vehicle" />

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="self-center sm:self-start">
            <PhotoUpload label="Customer Photo" round
              existingUrl={customer?.customer_photo}
              onChange={(file) => setFiles((f) => ({ ...f, customer_photo: file }))} />
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1">
            <PhotoUpload label="ID Proof (Front)"
              existingUrl={customer?.id_proof_photo_front}
              onChange={(file) => setFiles((f) => ({ ...f, id_proof_photo_front: file }))} />
            <PhotoUpload label="ID Proof (Back)"
              existingUrl={customer?.id_proof_photo_back}
              onChange={(file) => setFiles((f) => ({ ...f, id_proof_photo_back: file }))} />
            <PhotoUpload label="Driving License"
              existingUrl={customer?.driving_license_photo}
              onChange={(file) => setFiles((f) => ({ ...f, driving_license_photo: file }))} />
          </div>
        </div>

        <TextArea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}
