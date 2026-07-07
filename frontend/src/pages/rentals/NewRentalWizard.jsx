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
import * as staffApi from '../../api/staff';
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
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    customer_id: '', vehicle: '', destination: '', purpose: '',
    scheduled_start: defaultStart(), scheduled_end: defaultEnd(), booked_days: 1,
    odometer_start: '', payment_timing: 'later', security_deposit_collected: false,
    security_deposit_amount: '', daily_rate: '',
    assigned_staff: '', pickup_venue: 'parking',
    pickup_venue_other_location: '', pickup_venue_other_link: '', driver_delivery_charge: '0',
  });

  useEffect(() => {
    if (open) {
      setCustomers([]);
      setSelectedCustomer(null);
      vehiclesApi.listVehicles({ status: 'available', page_size: 500 }).then((d) => setVehicles(d.results || d));
      staffApi.listStaff({ is_active: true }).then((d) => setStaffList(d.results || d)).catch(() => {});
      setStep(0);
      setErrors({});
    }
  }, [open]);

  const handleCustomerSearch = async (query) => {
    if (query.length < 2) { setCustomers([]); return; }
    setCustomerSearching(true);
    try {
      const data = await customersApi.listCustomers({ search: query, page_size: 20 });
      setCustomers(data.results || data);
    } finally {
      setCustomerSearching(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => String(v.id) === String(form.vehicle));

  const estimatedTotal = useMemo(() => {
    if (!selectedVehicle) return 0;
    const base = Number(form.daily_rate || 0) * Number(form.booked_days || 1);
    const gst = base * (Number(settings?.gst_percent || 0) / 100);
    const delivery = form.pickup_venue === 'other' ? Number(form.driver_delivery_charge || 0) : 0;
    return base + gst + delivery;
  }, [selectedVehicle, form.daily_rate, form.booked_days, form.pickup_venue, form.driver_delivery_charge, settings]);

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

  const customerOptions = [
    ...(selectedCustomer ? [{ value: selectedCustomer.id, label: selectedCustomer.full_name, sublabel: selectedCustomer.phone }] : []),
    ...customers.filter((c) => String(c.id) !== String(selectedCustomer?.id)).map((c) => ({ value: c.id, label: c.full_name, sublabel: c.phone })),
  ];
  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.registration_number} — ${v.make} ${v.model}`,
    sublabel: `${formatCurrency(v.vehicle_daily_rate, symbol)}/day`,
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
      const isOther = form.pickup_venue === 'other';
      const payload = {
        ...form,
        scheduled_start: new Date(form.scheduled_start).toISOString(),
        scheduled_end: new Date(form.scheduled_end).toISOString(),
        odometer_start: Number(form.odometer_start),
        security_deposit_amount: form.security_deposit_collected ? Number(form.security_deposit_amount || 0) : 0,
        assigned_staff: form.assigned_staff || null,
        driver_delivery_charge: isOther ? Number(form.driver_delivery_charge || 0) : 0,
        pickup_venue_other_location: isOther ? form.pickup_venue_other_location : '',
        pickup_venue_other_link: isOther ? form.pickup_venue_other_link : '',
      };
      const rental = await rentalsApi.createRental(payload);
      showToast(`Booking ${rental.invoice_number} created successfully`);
      onCreated(rental, form.payment_timing);
      onClose();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not create the booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerCreated = async () => {
    const data = await customersApi.listCustomers({ page_size: 5 });
    const list = data.results || data;
    if (list.length) {
      const newest = [...list].sort((a, b) => b.id - a.id)[0];
      setSelectedCustomer(newest);
      setCustomers([newest]);
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
                <span className={cn('hidden sm:inline text-sm font-medium', idx === step ? 'text-navy-900' : 'text-navy-400')}>{s.label}</span>
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
                onChange={(v) => {
                  update('customer_id', v);
                  const found = customers.find((c) => String(c.id) === String(v));
                  if (found) setSelectedCustomer(found);
                }}
                placeholder="Search by name or phone..."
                onSearch={handleCustomerSearch}
                searching={customerSearching}
              />
              <Button variant="secondary" icon={UserPlus} onClick={() => setCustomerFormOpen(true)}>New</Button>
            </div>
            <p className="text-xs text-navy-400">
              Type at least 2 characters to search by name or phone. Can't find them? Click "New" to add the customer first.
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
              onChange={(v) => {
                const veh = vehicles.find((x) => String(x.id) === String(v));
                setForm((f) => ({ ...f, vehicle: v, daily_rate: veh ? String(veh.vehicle_daily_rate) : '' }));
              }}
              placeholder="Search registration, make or model..."
              emptyMessage="No available vehicles match your search"
            />
            <Input label="Odometer at Pickup (km)" type="number" required value={form.odometer_start}
              error={errors.odometer_start} onChange={(e) => update('odometer_start', e.target.value)} />
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
            {/* Staff & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Assigned Driver (optional)</label>
                <select
                  value={form.assigned_staff}
                  onChange={(e) => update('assigned_staff', e.target.value)}
                  className="w-full border border-navy-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400 text-navy-800"
                >
                  <option value="">No driver assigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} · {s.role.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Pickup Venue</label>
                <select
                  value={form.pickup_venue}
                  onChange={(e) => {
                    update('pickup_venue', e.target.value);
                    if (e.target.value !== 'other') update('driver_delivery_charge', '0');
                  }}
                  className="w-full border border-navy-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400 text-navy-800"
                >
                  <option value="parking">Parking (no charge)</option>
                  <option value="airport">Airport (no charge)</option>
                  <option value="other">Other Location</option>
                </select>
              </div>
            </div>
            {form.pickup_venue === 'other' && (
              <div className="border border-amber-100 bg-amber-50/40 rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Delivery Location" value={form.pickup_venue_other_location}
                    onChange={(e) => update('pickup_venue_other_location', e.target.value)}
                    placeholder="e.g. Hotel XYZ, Chennai" />
                  <Input label="Location Link (Maps URL)" value={form.pickup_venue_other_link}
                    onChange={(e) => update('pickup_venue_other_link', e.target.value)}
                    placeholder="https://maps.google.com/..." />
                </div>
                <Input label="Driver Delivery Charge (₹)" type="number" min="0" step="0.01"
                  value={form.driver_delivery_charge}
                  onChange={(e) => update('driver_delivery_charge', e.target.value)}
                  hint="This will be added to the rental total and collected from the customer" />
              </div>
            )}

            {selectedVehicle && (
              <div className="space-y-3">
                <Input
                  label="Rate per Day"
                  type="number"
                  value={form.daily_rate}
                  onChange={(e) => update('daily_rate', e.target.value)}
                  hint={
                    Number(form.daily_rate) !== Number(selectedVehicle.vehicle_daily_rate)
                      ? `Default: ${formatCurrency(selectedVehicle.vehicle_daily_rate, symbol)}/day — you've applied a discount`
                      : `Edit to apply a discount for this booking`
                  }
                />
                <div className="bg-navy-50/60 border border-navy-100 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-navy-600">
                    {formatCurrency(form.daily_rate || 0, symbol)}/day × {form.booked_days} day(s)
                    {form.pickup_venue === 'other' && Number(form.driver_delivery_charge) > 0 && (
                      <span className="ml-2 text-amber-600">+ {formatCurrency(form.driver_delivery_charge, symbol)} delivery</span>
                    )}
                  </span>
                  <span className="text-base font-semibold text-navy-900 tabular-nums">
                    ≈ {formatCurrency(estimatedTotal, symbol)} estimated
                  </span>
                </div>
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
              {form.assigned_staff && (
                <SummaryRow label="Driver" value={staffList.find((s) => String(s.id) === String(form.assigned_staff))?.full_name || '-'} />
              )}
              <SummaryRow label="Pickup Venue" value={
                form.pickup_venue === 'parking' ? 'Parking' :
                form.pickup_venue === 'airport' ? 'Airport' :
                form.pickup_venue_other_location || 'Other Location'
              } />
              {form.pickup_venue === 'other' && Number(form.driver_delivery_charge) > 0 && (
                <SummaryRow label="Delivery Charge" value={formatCurrency(form.driver_delivery_charge, symbol)} />
              )}
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
