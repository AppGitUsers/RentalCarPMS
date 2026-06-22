import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, UserPlus, Wallet, Car } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import SearchableSelect from '../../components/ui/SearchableSelect';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { useToast } from '../../components/ui/Toast';
import { useSettings } from '../../context/SettingsContext';
import * as customersApi from '../../api/customers';
import * as vehiclesApi from '../../api/vehicles';
import * as rentalsApi from '../../api/rentals';
import CustomerFormModal from '../customers/CustomerFormModal';
import { formatCurrency, toDateTimeInputValue } from '../../utils/format';

const STEPS = [
  { key: 'customer', label: 'Customer', icon: UserPlus },
  { key: 'vehicle', label: 'Vehicle & Trip', icon: Car },
  { key: 'payment', label: 'Payment', icon: Wallet },
];

function defaultStart() {
  return toDateTimeInputValue(new Date());
}
function defaultEnd() {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return toDateTimeInputValue(d);
}

export default function NewRentalWizard({ open, onClose, onCreated }) {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const symbol = settings?.currency_symbol || '₹';

  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    customer_id: '', vehicle: '', number_of_vehicles: 1, destination: '', purpose: '',
    scheduled_start: defaultStart(), scheduled_end: defaultEnd(), booked_days: 1,
    odometer_start: '', payment_timing: 'later', security_deposit_collected: false,
    security_deposit_amount: '',
  });

  useEffect(() => {
    if (open) {
      customersApi.listCustomers({ page_size: 500 }).then((d) => setCustomers(d.results || d));
      vehiclesApi.listVehicles({ status: 'available', page_size: 500 }).then((d) => setVehicles(d.results || d));
      setStep(0);
      setErrors({});
    }
  }, [open]);

  const selectedVehicle = vehicles.find((v) => String(v.id) === String(form.vehicle));

  const estimatedTotal = useMemo(() => {
    if (!selectedVehicle) return 0;
    const base = Number(selectedVehicle.daily_rate) * Number(form.booked_days || 1);
    const gst = base * (Number(settings?.gst_percent || 0) / 100);
    return base + gst;
  }, [selectedVehicle, form.booked_days, settings]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (form.scheduled_start && form.scheduled_end) {
      const start = new Date(form.scheduled_start);
      const end = new Date(form.scheduled_end);
      const diffHours = (end - start) / 36e5;
      if (diffHours > 0) {
        update('booked_days', Math.max(1, Math.ceil(diffHours / 24)));
      }
    }
  }, [form.scheduled_start, form.scheduled_end]);

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.full_name, sublabel: c.phone }));
  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.registration_number} — ${v.make} ${v.model}`,
    sublabel: `${formatCurrency(v.daily_rate, symbol)}/day`,
  }));

  const validateStep = () => {
    const e = {};
    if (step === 0 && !form.customer_id) e.customer_id = 'Select or add a customer';
    if (step === 1) {
      if (!form.vehicle) e.vehicle = 'Select a vehicle';
      if (!form.scheduled_start) e.scheduled_start = 'Required';
      if (!form.scheduled_end) e.scheduled_end = 'Required';
      if (!form.odometer_start) e.odometer_start = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        scheduled_start: new Date(form.scheduled_start).toISOString(),
        scheduled_end: new Date(form.scheduled_end).toISOString(),
        odometer_start: Number(form.odometer_start),
        security_deposit_amount: form.security_deposit_collected ? Number(form.security_deposit_amount || 0) : 0,
      };
      const rental = await rentalsApi.createRental(payload);
      showToast(`Booking ${rental.invoice_number} created successfully`);
      onCreated(rental);
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not create the booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerCreated = async () => {
    const data = await customersApi.listCustomers({ page_size: 500 });
    const list = data.results || data;
    setCustomers(list);
    if (list.length) {
      const newest = [...list].sort((a, b) => b.id - a.id)[0];
      update('customer_id', newest.id);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="New Car Rental Booking"
        subtitle={`Step ${step + 1} of ${STEPS.length}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={handleBack} disabled={step === 0} icon={ChevronLeft}>Back</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext} icon={ChevronRight}>Continue</Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting} icon={Check}>Confirm Booking</Button>
            )}
          </div>
        }
      >
        <div className="flex items-center mb-6">
          {STEPS.map((s, idx) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors',
                    idx < step ? 'bg-success-500 text-white' : idx === step ? 'bg-navy-800 text-white' : 'bg-navy-100 text-navy-400'
                  )}
                >
                  {idx < step ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={cn('text-sm font-medium', idx === step ? 'text-navy-900' : 'text-navy-400')}>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className={cn('flex-1 h-px mx-3', idx < step ? 'bg-success-300' : 'bg-navy-100')} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <SearchableSelect
                className="flex-1"
                label="Select Customer" required
                options={customerOptions}
                value={form.customer_id}
                error={errors.customer_id}
                onChange={(v) => update('customer_id', v)}
                placeholder="Search by name or phone..."
              />
              <Button variant="secondary" icon={UserPlus} onClick={() => setCustomerFormOpen(true)}>New</Button>
            </div>
            <p className="text-xs text-navy-400">
              Can't find the customer? Click "New" to add their legal details, ID proof and photo before continuing.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <SearchableSelect
              label="Select Vehicle" required
              options={vehicleOptions}
              value={form.vehicle}
              error={errors.vehicle}
              onChange={(v) => update('vehicle', v)}
              placeholder="Search registration, make or model..."
              emptyMessage="No available vehicles match your search"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Number of Vehicles" type="number" min="1" value={form.number_of_vehicles}
                onChange={(e) => update('number_of_vehicles', e.target.value)} />
              <Input label="Odometer at Pickup (km)" type="number" required value={form.odometer_start}
                error={errors.odometer_start} onChange={(e) => update('odometer_start', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Scheduled Start" type="datetime-local" required value={form.scheduled_start}
                error={errors.scheduled_start} onChange={(e) => update('scheduled_start', e.target.value)} />
              <Input label="Scheduled End" type="datetime-local" required value={form.scheduled_end}
                error={errors.scheduled_end} onChange={(e) => update('scheduled_end', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Destination" value={form.destination} onChange={(e) => update('destination', e.target.value)} placeholder="e.g. Madurai" />
              <Input label="Purpose of Trip" value={form.purpose} onChange={(e) => update('purpose', e.target.value)} placeholder="e.g. Family vacation" />
            </div>
            {selectedVehicle && (
              <div className="bg-navy-50/60 border border-navy-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-navy-600">
                  {formatCurrency(selectedVehicle.daily_rate, symbol)}/day × {form.booked_days} day(s)
                </span>
                <span className="text-base font-semibold text-navy-900 tabular-nums">
                  ≈ {formatCurrency(estimatedTotal, symbol)} estimated
                </span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">Payment Timing</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ key: 'now', label: 'Pay Now' }, { key: 'later', label: 'Pay Later' }].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => update('payment_timing', opt.key)}
                    className={cn(
                      'px-4 py-3 rounded-lg border text-sm font-medium transition-colors',
                      form.payment_timing === opt.key
                        ? 'border-navy-800 bg-navy-800 text-white'
                        : 'border-navy-200 text-navy-600 hover:bg-navy-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-navy-100 rounded-lg p-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.security_deposit_collected}
                  onChange={(e) => update('security_deposit_collected', e.target.checked)}
                  className="w-4 h-4 rounded border-navy-300 text-navy-700 focus:ring-navy-400"
                />
                <span className="text-sm font-medium text-navy-700">Collect a security deposit for this booking</span>
              </label>
              {form.security_deposit_collected && (
                <Input
                  className="mt-3" label="Security Deposit Amount" type="number"
                  value={form.security_deposit_amount}
                  onChange={(e) => update('security_deposit_amount', e.target.value)}
                  placeholder="e.g. 5000"
                />
              )}
            </div>

            <div className="bg-amber-50/60 border border-amber-100 rounded-lg px-4 py-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Booking Summary</p>
              <SummaryRow label="Vehicle" value={selectedVehicle ? `${selectedVehicle.registration_number} (${selectedVehicle.make} ${selectedVehicle.model})` : '-'} />
              <SummaryRow label="Duration" value={`${form.booked_days} day(s)`} />
              <SummaryRow label="Estimated Total" value={formatCurrency(estimatedTotal, symbol)} bold />
              <SummaryRow label="Payment Timing" value={form.payment_timing === 'now' ? 'Pay Now' : 'Pay Later'} />
            </div>
          </div>
        )}
      </Modal>

      <CustomerFormModal
        open={customerFormOpen}
        onClose={() => setCustomerFormOpen(false)}
        customer={null}
        onSaved={handleCustomerCreated}
      />
    </>
  );
}

function SummaryRow({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-amber-700/80">{label}</span>
      <span className={cn('text-sm text-amber-900', bold && 'font-semibold')}>{value}</span>
    </div>
  );
}
