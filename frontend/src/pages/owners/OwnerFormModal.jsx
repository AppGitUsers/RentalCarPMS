import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import PhotoUpload from '../../components/ui/PhotoUpload';
import Button from '../../components/ui/Button';
import * as ownersApi from '../../api/owners';
import { useToast } from '../../components/ui/Toast';

const EMPTY_FORM = {
  name: '', phone: '', alternate_phone: '', email: '', address: '',
  upi_id: '', upi_payee_name: '', default_share_percent: '', id_proof_number: '', notes: '',
};

export default function OwnerFormModal({ open, onClose, owner, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [idProofFile, setIdProofFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (owner) {
      setForm({
        name: owner.name || '', phone: owner.phone || '', alternate_phone: owner.alternate_phone || '',
        email: owner.email || '', address: owner.address || '', upi_id: owner.upi_id || '',
        upi_payee_name: owner.upi_payee_name || '', default_share_percent: owner.default_share_percent ?? '',
        id_proof_number: owner.id_proof_number || '', notes: owner.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setIdProofFile(null);
    setErrors({});
  }, [owner, open]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Required';
    if (!form.phone.trim()) newErrors.phone = 'Required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v ?? ''));
      if (idProofFile) formData.append('id_proof_photo', idProofFile);

      if (owner) {
        await ownersApi.updateOwner(owner.id, formData);
        showToast('Owner updated successfully');
      } else {
        await ownersApi.createOwner(formData);
        showToast('Car owner added successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save owner', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={owner ? 'Edit Car Owner' : 'Add New Car Owner'}
      subtitle="Owner contact and payout details"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>{owner ? 'Save Changes' : 'Add Owner'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Owner Name" required value={form.name} error={errors.name}
            onChange={(e) => update('name', e.target.value)} placeholder="Full name" />
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

        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 space-y-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Payout Details (for QR generation)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="UPI ID" value={form.upi_id} onChange={(e) => update('upi_id', e.target.value)}
              placeholder="owner@upi" hint="Required to generate a payout QR for this owner" />
            <Input label="UPI Payee Display Name" value={form.upi_payee_name}
              onChange={(e) => update('upi_payee_name', e.target.value)} placeholder="Defaults to owner name" />
          </div>
          <Input
            label="Owner Share Override (%)"
            type="number" min="0" max="100" step="0.01"
            value={form.default_share_percent}
            onChange={(e) => update('default_share_percent', e.target.value)}
            placeholder="Leave blank to use the global default from Settings"
            hint="Overrides the global default % for all of this owner's vehicles (can still be overridden per-vehicle)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="ID Proof Number" value={form.id_proof_number}
            onChange={(e) => update('id_proof_number', e.target.value)} placeholder="Optional" />
          <PhotoUpload label="ID Proof Photo" existingUrl={owner?.id_proof_photo} onChange={setIdProofFile} />
        </div>

        <TextArea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}
