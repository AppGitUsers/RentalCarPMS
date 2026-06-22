import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import SearchableSelect from '../../components/ui/SearchableSelect';
import PhotoUpload from '../../components/ui/PhotoUpload';
import Button from '../../components/ui/Button';
import * as vehiclesApi from '../../api/vehicles';
import { useToast } from '../../components/ui/Toast';

const FUEL_OPTIONS = [
  { value: 'petrol', label: 'Petrol' }, { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' }, { value: 'cng', label: 'CNG' }, { value: 'hybrid', label: 'Hybrid' },
];
const TRANSMISSION_OPTIONS = [{ value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automatic' }];

const EMPTY_FORM = {
  owner: '', registration_number: '', make: '', model: '', year: '', color: '',
  seating_capacity: '4', fuel_type: 'petrol', transmission: 'manual', daily_rate: '',
  owner_share_percent_override: '', current_odometer: '0', rc_number: '',
  insurance_expiry: '', permit_expiry: '', fitness_expiry: '', notes: '',
};

export default function VehicleFormModal({ open, onClose, vehicle, owners, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (vehicle) {
      setForm({
        owner: vehicle.owner || '', registration_number: vehicle.registration_number || '',
        make: vehicle.make || '', model: vehicle.model || '', year: vehicle.year || '',
        color: vehicle.color || '', seating_capacity: vehicle.seating_capacity || '4',
        fuel_type: vehicle.fuel_type || 'petrol', transmission: vehicle.transmission || 'manual',
        daily_rate: vehicle.daily_rate || '', owner_share_percent_override: vehicle.owner_share_percent_override ?? '',
        current_odometer: vehicle.current_odometer ?? '0', rc_number: vehicle.rc_number || '',
        insurance_expiry: vehicle.insurance_expiry || '', permit_expiry: vehicle.permit_expiry || '',
        fitness_expiry: vehicle.fitness_expiry || '', notes: vehicle.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setPhotoFile(null);
    setErrors({});
  }, [vehicle, open]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const ownerOptions = owners.map((o) => ({ value: o.id, label: o.name, sublabel: o.phone }));

  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.owner) newErrors.owner = 'Required';
    if (!form.registration_number.trim()) newErrors.registration_number = 'Required';
    if (!form.make.trim()) newErrors.make = 'Required';
    if (!form.model.trim()) newErrors.model = 'Required';
    if (!form.daily_rate) newErrors.daily_rate = 'Required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v ?? ''));
      if (photoFile) formData.append('primary_photo', photoFile);

      if (vehicle) {
        await vehiclesApi.updateVehicle(vehicle.id, formData);
        showToast('Vehicle updated successfully');
      } else {
        await vehiclesApi.createVehicle(formData);
        showToast('Vehicle added successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.registration_number) {
        showToast('A vehicle with this registration number already exists', 'error');
      } else {
        showToast(data?.detail || 'Could not save vehicle', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
      subtitle="Vehicle details, pricing and ownership"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>{vehicle ? 'Save Changes' : 'Add Vehicle'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableSelect
            label="Car Owner" required options={ownerOptions} value={form.owner} error={errors.owner}
            onChange={(v) => update('owner', v)} placeholder="Search and select owner..."
          />
          <Input label="Registration Number" required value={form.registration_number} error={errors.registration_number}
            onChange={(e) => update('registration_number', e.target.value.toUpperCase())} placeholder="TN10AB1234" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input label="Make" required value={form.make} error={errors.make}
            onChange={(e) => update('make', e.target.value)} placeholder="Toyota" />
          <Input label="Model" required value={form.model} error={errors.model}
            onChange={(e) => update('model', e.target.value)} placeholder="Innova" />
          <Input label="Year" type="number" value={form.year} onChange={(e) => update('year', e.target.value)} placeholder="2022" />
          <Input label="Color" value={form.color} onChange={(e) => update('color', e.target.value)} placeholder="White" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Input label="Seating Capacity" type="number" value={form.seating_capacity}
            onChange={(e) => update('seating_capacity', e.target.value)} />
          <Select label="Fuel Type" options={FUEL_OPTIONS} value={form.fuel_type} onChange={(e) => update('fuel_type', e.target.value)} />
          <Select label="Transmission" options={TRANSMISSION_OPTIONS} value={form.transmission} onChange={(e) => update('transmission', e.target.value)} />
        </div>

        <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-4">Pricing & Ownership Split</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Daily Rate (₹)" type="number" required value={form.daily_rate} error={errors.daily_rate}
              onChange={(e) => update('daily_rate', e.target.value)} placeholder="1000" />
            <Input label="Owner Share Override (%)" type="number" min="0" max="100" step="0.01"
              value={form.owner_share_percent_override}
              onChange={(e) => update('owner_share_percent_override', e.target.value)}
              hint="Leave blank to use the owner's / global default" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Current Odometer (km)" type="number" value={form.current_odometer}
            onChange={(e) => update('current_odometer', e.target.value)} />
          <Input label="RC Number" value={form.rc_number} onChange={(e) => update('rc_number', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Insurance Expiry" type="date" value={form.insurance_expiry} onChange={(e) => update('insurance_expiry', e.target.value)} />
          <Input label="Permit Expiry" type="date" value={form.permit_expiry} onChange={(e) => update('permit_expiry', e.target.value)} />
          <Input label="Fitness Expiry" type="date" value={form.fitness_expiry} onChange={(e) => update('fitness_expiry', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhotoUpload label="Vehicle Photo" existingUrl={vehicle?.primary_photo} onChange={setPhotoFile} />
          <TextArea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={4} />
        </div>
      </div>
    </Modal>
  );
}
