import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as vehiclesApi from '../../api/vehicles';
import { useToast } from '../../components/ui/Toast';

const EMPTY = {
  vehicle_daily_rate: '',
  owner_daily_amount: '',
  owner_extra_km_percent: '0',
  owner_damage_percent: '0',
};

export default function VehicleOwnerRateModal({ open, onClose, vehicle, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !vehicle) return;
    setLoading(true);
    vehiclesApi.getVehicleRate(vehicle.id).then((data) => {
      if (data) {
        setForm({
          vehicle_daily_rate: data.vehicle_daily_rate ?? '',
          owner_daily_amount: data.owner_daily_amount ?? '',
          owner_extra_km_percent: data.owner_extra_km_percent ?? '0',
          owner_damage_percent: data.owner_damage_percent ?? '0',
        });
      } else {
        setForm(EMPTY);
      }
    }).finally(() => setLoading(false));
  }, [open, vehicle]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.vehicle_daily_rate || !form.owner_daily_amount) {
      showToast('Daily rate and owner amount are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await vehiclesApi.saveVehicleRate(vehicle.id, form);
      showToast('Rate configuration saved');
      onSaved?.();
      onClose();
    } catch {
      showToast('Could not save rate configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title={`Rate Config — ${vehicle?.registration_number}`}
      subtitle={`${vehicle?.make} ${vehicle?.model} · owner pricing & share`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Rate</Button>
        </>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-sm text-navy-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-3">Customer Pricing</p>
            <Input
              label="Daily Rate (₹)" type="number" required
              value={form.vehicle_daily_rate}
              onChange={(e) => update('vehicle_daily_rate', e.target.value)}
              placeholder="1500"
            />
          </div>

          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Owner Share</p>
            <Input
              label="Per Day Amount (₹)" type="number" required
              value={form.owner_daily_amount}
              onChange={(e) => update('owner_daily_amount', e.target.value)}
              placeholder="1000"
              hint="Fixed ₹ owner receives per booked day"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Extra KM Share (%)" type="number" min="0" max="100"
                value={form.owner_extra_km_percent}
                onChange={(e) => update('owner_extra_km_percent', e.target.value)}
                placeholder="70"
              />
              <Input
                label="Damage Share (%)" type="number" min="0" max="100"
                value={form.owner_damage_percent}
                onChange={(e) => update('owner_damage_percent', e.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          <div className="bg-navy-50/40 rounded-lg p-3 text-xs text-navy-500 space-y-1">
            <p className="font-medium text-navy-600 mb-1">Late return — automatic rule</p>
            <p>• Within grace period → no charge</p>
            <p>• Grace to 6 hrs late → half day charged (owner gets half per-day amount)</p>
            <p>• More than 6 hrs late → full day charged (owner gets full per-day amount)</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
