import { useEffect, useState } from 'react';
import {
  MapPin, Gauge, Calendar, Download, FileText, CreditCard, AlertTriangle, CheckCircle2, CalendarPlus,
  Ban, Pencil,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import PaymentQRDisplay from '../../components/ui/PaymentQRDisplay';
import { Spinner } from '../../components/ui/Feedback';
import * as rentalsApi from '../../api/rentals';
import * as staffApi from '../../api/staff';
import { useToast } from '../../components/ui/Toast';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime, toDateTimeInputValue } from '../../utils/format';

const PICKUP_VENUE_OPTIONS = [
  { value: 'parking', label: 'Parking' },
  { value: 'airport', label: 'Airport' },
  { value: 'other', label: 'Other Location' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank Transfer' },
];

export default function RentalDetailModal({ open, onClose, rentalId, initialMode, onChanged }) {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { user } = useAuth();
  const symbol = settings?.currency_symbol || '₹';
  const isAdmin = !user?.role || user?.role === 'admin';

  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view');
  const [working, setWorking] = useState(false);

  const [odometerStart, setOdometerStart] = useState('');
  const [odometerEnd, setOdometerEnd] = useState('');
  const [damageAmount, setDamageAmount] = useState('0');
  const [damageNotes, setDamageNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [extensionDays, setExtensionDays] = useState('1');
  const [extensionRate, setExtensionRate] = useState('');
  const [refundGiven, setRefundGiven] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  const load = () => {
    setLoading(true);
    rentalsApi.getRental(rentalId).then(setRental).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && rentalId) {
      load();
      setMode(initialMode || 'view');
    } else {
      setRental(null);
    }
  }, [open, rentalId]);

  useEffect(() => {
    if (rental && mode === 'pay' && !paymentAmount) {
      setPaymentAmount(String(rental.balance_due));
    }
  }, [rental, mode]);

  if (!open) return null;

  const handleStart = async () => {
    setWorking(true);
    try {
      await rentalsApi.startRental(rental.id, Number(odometerStart || rental.odometer_start));
      showToast('Vehicle marked as picked up — rental is now active');
      load();
      setMode('view');
      onChanged?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not start rental', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleClose = async () => {
    if (!odometerEnd) {
      showToast('Enter the odometer reading at return', 'error');
      return;
    }
    setWorking(true);
    try {
      await rentalsApi.closeRental(rental.id, {
        odometer_end: Number(odometerEnd),
        damage_charge_amount: Number(damageAmount || 0),
        damage_notes: damageNotes,
      });
      showToast('Rental closed and charges calculated');
      load();
      setMode('view');
      onChanged?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not close rental', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleExtend = async () => {
    if (!extensionDays || Number(extensionDays) < 1) {
      showToast('Enter at least 1 day to extend', 'error');
      return;
    }
    setWorking(true);
    try {
      await rentalsApi.extendRental(rental.id, {
        extension_days: Number(extensionDays),
        ...(extensionRate ? { daily_rate: extensionRate } : {}),
      });
      showToast('Rental extended successfully');
      load();
      setMode('view');
      onChanged?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not extend rental', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount) {
      showToast('Enter a payment amount', 'error');
      return;
    }
    setWorking(true);
    try {
      await rentalsApi.addRentalPayment(rental.id, Number(paymentAmount), paymentMethod);
      showToast('Payment recorded successfully');
      load();
      setMode('view');
      onChanged?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not record payment', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleCancelRental = async () => {
    const amountPaid = Number(rental.amount_paid || 0);
    const refund = refundGiven ? Number(refundAmount || 0) : 0;
    if (refundGiven && (refundAmount === '' || refund < 0 || refund > amountPaid)) {
      showToast(`Refund amount must be between 0 and ${formatCurrency(amountPaid, symbol)}`, 'error');
      return;
    }
    setWorking(true);
    try {
      await rentalsApi.cancelRental(rental.id, refund);
      showToast('Booking cancelled');
      load();
      setMode('view');
      onChanged?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not cancel booking', 'error');
    } finally {
      setWorking(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      destination: rental.destination || '',
      purpose: rental.purpose || '',
      scheduled_start: toDateTimeInputValue(rental.scheduled_start),
      scheduled_end: toDateTimeInputValue(rental.scheduled_end),
      assigned_staff: rental.assigned_staff || '',
      pickup_venue: rental.pickup_venue || 'parking',
      pickup_venue_other_location: rental.pickup_venue_other_location || '',
      pickup_venue_other_link: rental.pickup_venue_other_link || '',
      driver_delivery_charge: rental.driver_delivery_charge || '0',
    });
    setEditErrors({});
    if (!staffList.length) {
      staffApi.listStaff({ is_active: true }).then((d) => setStaffList(d.results || d)).catch(() => {});
    }
    setMode('edit');
  };

  const handleEditSubmit = async () => {
    const errs = {};
    if (!editForm.scheduled_start) errs.scheduled_start = 'Required';
    if (!editForm.scheduled_end) errs.scheduled_end = 'Required';
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    const isOther = editForm.pickup_venue === 'other';
    setWorking(true);
    try {
      await rentalsApi.updateRental(rental.id, {
        destination: editForm.destination,
        purpose: editForm.purpose,
        scheduled_start: new Date(editForm.scheduled_start).toISOString(),
        scheduled_end: new Date(editForm.scheduled_end).toISOString(),
        assigned_staff: editForm.assigned_staff || null,
        pickup_venue: editForm.pickup_venue,
        pickup_venue_other_location: isOther ? editForm.pickup_venue_other_location : '',
        pickup_venue_other_link: isOther ? editForm.pickup_venue_other_link : '',
        driver_delivery_charge: isOther ? Number(editForm.driver_delivery_charge || 0) : 0,
      });
      showToast('Rental updated successfully');
      load();
      setMode('view');
      onChanged?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update rental', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleDownload = async (type) => {
    try {
      const blob = await rentalsApi.downloadRentalPdf(rental.id, type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'invoice' ? rental.invoice_number : 'Agreement-' + rental.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Could not download PDF', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rental ? rental.invoice_number : 'Loading...'}
      subtitle={rental ? `${rental.customer_detail?.full_name} · ${rental.vehicle_detail?.registration_number}` : undefined}
      size="lg"
    >
      {loading || !rental ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : mode === 'view' ? (
        <ViewMode
          rental={rental} symbol={symbol} isAdmin={isAdmin}
          onStart={() => { setOdometerStart(rental.odometer_start || ''); setMode('start'); }}
          onClose={() => { setOdometerEnd(''); setDamageAmount('0'); setDamageNotes(''); setMode('close'); }}
          onPay={() => { setPaymentAmount(rental.balance_due); setMode('pay'); }}
          onExtend={() => { setExtensionDays('1'); setExtensionRate(String(rental.daily_rate_snapshot)); setMode('extend'); }}
          onCancelRental={() => { setRefundGiven(false); setRefundAmount(''); setMode('cancelConfirm'); }}
          onEditRental={openEdit}
          onDownload={handleDownload}
        />
      ) : mode === 'cancelConfirm' ? (
        <CancelConfirmMode
          rental={rental} symbol={symbol}
          refundGiven={refundGiven} setRefundGiven={setRefundGiven}
          refundAmount={refundAmount} setRefundAmount={setRefundAmount}
          onCancel={() => setMode('view')} onConfirm={handleCancelRental} working={working}
        />
      ) : mode === 'edit' ? (
        <EditMode
          rental={rental} editForm={editForm} setEditForm={setEditForm} errors={editErrors}
          staffList={staffList}
          onCancel={() => setMode('view')} onConfirm={handleEditSubmit} working={working}
        />
      ) : mode === 'start' ? (
        <div className="space-y-4">
          <p className="text-sm text-navy-500">Confirm the vehicle is being handed over to the customer now.</p>
          <Input label="Odometer Reading at Pickup (km)" type="number" value={odometerStart} onChange={(e) => setOdometerStart(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setMode('view')}>Cancel</Button>
            <Button variant="amber" className="flex-1" onClick={handleStart} loading={working}>Confirm Pickup</Button>
          </div>
        </div>
      ) : mode === 'close' ? (
        <CloseMode
          rental={rental} symbol={symbol}
          odometerEnd={odometerEnd} setOdometerEnd={setOdometerEnd}
          damageAmount={damageAmount} setDamageAmount={setDamageAmount}
          damageNotes={damageNotes} setDamageNotes={setDamageNotes}
          onCancel={() => setMode('view')} onConfirm={handleClose} working={working}
        />
      ) : mode === 'extend' ? (
        <ExtendMode
          rental={rental} symbol={symbol}
          extensionDays={extensionDays} setExtensionDays={setExtensionDays}
          extensionRate={extensionRate} setExtensionRate={setExtensionRate}
          freeKmPerDay={settings?.free_km_per_day || 0}
          nextBooking={rental.next_booking}
          bufferHours={settings?.booking_buffer_hours ?? 2}
          onCancel={() => setMode('view')} onConfirm={handleExtend} working={working}
        />
      ) : mode === 'pay' ? (
        <div className="space-y-4">
          <PaymentQRDisplay
            fetchQr={(amt) => rentalsApi.getRentalPaymentQR(rental.id, amt)}
            amount={Number(paymentAmount || 0)}
            symbol={symbol}
            label="Customer scans to pay"
            recipientName={settings?.company_name}
          />
          <Input label="Amount Received" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <Select label="Payment Method" options={PAYMENT_METHODS} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setMode('view')}>Cancel</Button>
            <Button variant="success" className="flex-1" onClick={handleAddPayment} loading={working}>Submit Payment</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function ViewMode({ rental, symbol, isAdmin, onStart, onClose, onPay, onExtend, onCancelRental, onEditRental, onDownload }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Badge variant={rental.status}>{rental.status}</Badge>
        <Badge variant={rental.payment_status}>{rental.payment_status}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoMini icon={Calendar} label="Scheduled Start" value={formatDateTime(rental.scheduled_start)} />
        <InfoMini icon={Calendar} label="Scheduled End" value={formatDateTime(rental.scheduled_end)} />
        <InfoMini icon={MapPin} label="Destination" value={rental.destination || '-'} />
        <InfoMini icon={Gauge} label="Odometer Start" value={rental.odometer_start ?? '-'} />
        {rental.assigned_staff_name && (
          <InfoMini icon={MapPin} label="Assigned Driver" value={rental.assigned_staff_name} />
        )}
        {rental.pickup_venue && (
          <InfoMini icon={MapPin} label="Pickup Venue" value={
            rental.pickup_venue === 'parking' ? 'Parking' :
            rental.pickup_venue === 'airport' ? 'Airport' :
            rental.pickup_venue_other_location || 'Other Location'
          } />
        )}
      </div>

      <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4 space-y-2">
        <ChargeRow label="Base Amount" value={formatCurrency(rental.base_amount, symbol)} />
        {Number(rental.late_fee_amount) > 0 && (
          <ChargeRow
            label={`Late Fee — ${rental.late_fee_type || 'Late Return'}`}
            value={formatCurrency(rental.late_fee_amount, symbol)}
            highlight="danger"
          />
        )}
        {Number(rental.extra_km_amount) > 0 && <ChargeRow label="Extra KM Charge" value={formatCurrency(rental.extra_km_amount, symbol)} highlight="danger" />}
        {Number(rental.damage_charge_amount) > 0 && <ChargeRow label="Damage Charge" value={formatCurrency(rental.damage_charge_amount, symbol)} highlight="danger" />}
        {Number(rental.driver_delivery_charge) > 0 && (
          <ChargeRow
            label={rental.assigned_staff_name ? `Driver Delivery — ${rental.assigned_staff_name}` : 'Driver Delivery Charge'}
            value={formatCurrency(rental.driver_delivery_charge, symbol)}
          />
        )}
        <ChargeRow label={`GST (${rental.gst_percent_snapshot}%)`} value={formatCurrency(rental.gst_amount, symbol)} />
        <div className="border-t border-navy-200 pt-2 mt-1">
          <ChargeRow label="Total Amount" value={formatCurrency(rental.total_amount, symbol)} bold />
          <ChargeRow label="Amount Paid" value={formatCurrency(rental.amount_paid, symbol)} />
          {Number(rental.balance_due) < 0 ? (
            <ChargeRow label="Refund Due to Customer" value={formatCurrency(Math.abs(rental.balance_due), symbol)} bold highlight="danger" />
          ) : (
            <ChargeRow label="Balance Due" value={formatCurrency(rental.balance_due, symbol)} bold highlight={rental.balance_due > 0 ? 'amber' : 'success'} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {rental.status === 'booked' && (
          <Button variant="amber" icon={CheckCircle2} onClick={onStart}>Mark as Picked Up</Button>
        )}
        {rental.status === 'active' && (
          <Button variant="success" icon={CheckCircle2} onClick={onClose}>Close & Return Vehicle</Button>
        )}
        {(rental.status === 'booked' || rental.status === 'active') && (
          <Button variant="secondary" icon={CalendarPlus} onClick={onExtend}>Extend Rental</Button>
        )}
        {rental.balance_due > 0 && rental.status !== 'cancelled' && (
          <Button variant="primary" icon={CreditCard} onClick={onPay}>Record Payment</Button>
        )}
        {isAdmin && (rental.status === 'booked' || rental.status === 'active') && (
          <Button variant="secondary" icon={Pencil} onClick={onEditRental}>Edit Rental</Button>
        )}
        {isAdmin && rental.status === 'booked' && (
          <Button variant="danger" icon={Ban} onClick={onCancelRental}>Cancel Rental</Button>
        )}
        <Button variant="secondary" icon={Download} onClick={() => onDownload('invoice')}>Invoice PDF</Button>
        <Button variant="secondary" icon={FileText} onClick={() => onDownload('agreement')}>Agreement PDF</Button>
      </div>

      {(rental.customer_detail?.id_proof_photo_front || rental.customer_detail?.id_proof_photo_back || rental.customer_detail?.driving_license_photo) && (
        <div>
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Customer ID Documents</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rental.customer_detail.id_proof_photo_front && (
              <div>
                <p className="text-xs text-navy-400 mb-1">ID Proof — Front</p>
                <img src={rental.customer_detail.id_proof_photo_front} alt="ID Front" className="w-full h-24 object-cover rounded-lg border border-navy-100" />
              </div>
            )}
            {rental.customer_detail.id_proof_photo_back && (
              <div>
                <p className="text-xs text-navy-400 mb-1">ID Proof — Back</p>
                <img src={rental.customer_detail.id_proof_photo_back} alt="ID Back" className="w-full h-24 object-cover rounded-lg border border-navy-100" />
              </div>
            )}
            {rental.customer_detail.driving_license_photo && (
              <div>
                <p className="text-xs text-navy-400 mb-1">Driving License</p>
                <img src={rental.customer_detail.driving_license_photo} alt="Driving License" className="w-full h-24 object-cover rounded-lg border border-navy-100" />
              </div>
            )}
          </div>
        </div>
      )}

      {rental.payments?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Payment History</p>
          <div className="space-y-1.5">
            {rental.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white border border-navy-100">
                <span className="text-navy-600 capitalize">{p.method.replace('_', ' ')} · {formatDateTime(p.paid_at)}</span>
                <span className="font-semibold text-navy-900 tabular-nums">{formatCurrency(p.amount, symbol)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CancelConfirmMode({ rental, symbol, refundGiven, setRefundGiven, refundAmount, setRefundAmount, onCancel, onConfirm, working }) {
  const amountPaid = Number(rental.amount_paid || 0);
  const refund = refundGiven ? Number(refundAmount || 0) : 0;
  const retained = Math.max(amountPaid - refund, 0);
  const refundInvalid = refundGiven && (refundAmount === '' || refund < 0 || refund > amountPaid);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 bg-danger-50 border border-danger-100 rounded-lg px-3.5 py-2.5">
        <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0" />
        <p className="text-sm text-danger-600">This will cancel the booking. This action cannot be undone.</p>
      </div>

      <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4 space-y-2">
        <ChargeRow label="Total Rental Amount" value={formatCurrency(rental.total_amount, symbol)} />
        <ChargeRow label="Amount Collected" value={formatCurrency(rental.amount_paid, symbol)} />
        <ChargeRow label="Balance (To Be Collected)" value={formatCurrency(rental.balance_due, symbol)} />
      </div>

      {amountPaid > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Was any amount refunded to the customer?</label>
            <div className="flex gap-3">
              <Button
                variant={!refundGiven ? 'primary' : 'secondary'} size="sm" className="flex-1"
                onClick={() => { setRefundGiven(false); setRefundAmount(''); }}
              >
                No Refund
              </Button>
              <Button
                variant={refundGiven ? 'primary' : 'secondary'} size="sm" className="flex-1"
                onClick={() => { setRefundGiven(true); setRefundAmount(String(amountPaid)); }}
              >
                Yes, Refunded
              </Button>
            </div>
          </div>

          {refundGiven && (
            <Input
              label="Refund Amount" type="number" required
              value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
              error={refundInvalid ? `Must be between 0 and ${formatCurrency(amountPaid, symbol)}` : undefined}
              hint={`Max refundable: ${formatCurrency(amountPaid, symbol)}`}
            />
          )}

          <div className="bg-navy-50/60 rounded-lg px-3.5 py-2.5 text-sm">
            <ChargeRow
              label={refundGiven ? 'Retained as Cancellation Fee' : 'Retained (kept in full)'}
              value={formatCurrency(retained, symbol)}
              bold
            />
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Go Back</Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm} loading={working} disabled={refundInvalid}>
          Confirm Cancellation
        </Button>
      </div>
    </div>
  );
}

function CloseMode({ rental, symbol, odometerEnd, setOdometerEnd, damageAmount, setDamageAmount, damageNotes, setDamageNotes, onCancel, onConfirm, working }) {
  const kmCovered = odometerEnd ? Math.max(Number(odometerEnd) - (rental.odometer_start || 0), 0) : null;
  const freeKm = rental.free_km_total_snapshot;
  const extraKm = kmCovered !== null ? Math.max(kmCovered - freeKm, 0) : 0;
  const estExtraKmCharge = extraKm * Number(rental.extra_km_charge_snapshot);

  const now = new Date();
  const deadline = new Date(rental.scheduled_end);
  deadline.setMinutes(deadline.getMinutes() + rental.grace_period_minutes_snapshot);
  const isLate = now > deadline;

  return (
    <div className="space-y-4">
      {isLate && (
        <div className="flex items-center gap-2.5 bg-danger-50 border border-danger-100 rounded-lg px-3.5 py-2.5">
          <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600">This return is past the scheduled end time — a late fee will apply automatically.</p>
        </div>
      )}

      <Input
        label="Odometer Reading at Return (km)" type="number" required
        value={odometerEnd} onChange={(e) => setOdometerEnd(e.target.value)}
        hint={`Pickup odometer was ${rental.odometer_start ?? 0} km · ${freeKm} km included free`}
      />

      {kmCovered !== null && (
        <div className="bg-navy-50/60 rounded-lg px-3.5 py-2.5 text-sm space-y-1">
          <ChargeRow label="KM Covered" value={`${kmCovered} km`} />
          {extraKm > 0 && (
            <ChargeRow label={`Extra KM (${extraKm} km)`} value={formatCurrency(estExtraKmCharge, symbol)} highlight="danger" />
          )}
        </div>
      )}

      <Input label="Damage Charge (optional)" type="number" value={damageAmount} onChange={(e) => setDamageAmount(e.target.value)} />
      {Number(damageAmount) > 0 && (
        <TextArea label="Damage Notes" value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} rows={2} placeholder="Describe the damage..." />
      )}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button variant="success" className="flex-1" onClick={onConfirm} loading={working}>Close Rental & Calculate Charges</Button>
      </div>
    </div>
  );
}

function InfoMini({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-navy-100 rounded-lg px-3.5 py-2.5">
      <p className="text-xs text-navy-400 flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</p>
      <p className="text-sm font-medium text-navy-800 mt-0.5">{value}</p>
    </div>
  );
}

function ExtendMode({ rental, symbol, extensionDays, setExtensionDays, extensionRate, setExtensionRate, freeKmPerDay, nextBooking, bufferHours, onCancel, onConfirm, working }) {
  const days = Number(extensionDays) || 0;
  const rate = Number(extensionRate) || Number(rental.daily_rate_snapshot);
  const additionalBase = rate * days;
  const additionalGst = additionalBase * (Number(rental.gst_percent_snapshot) / 100);
  const additionalTotal = additionalBase + additionalGst;
  const newTotal = Number(rental.total_amount) + additionalTotal;
  const newFreeKm = rental.free_km_total_snapshot + (Number(freeKmPerDay) * days);
  const newEnd = days > 0 ? new Date(new Date(rental.scheduled_end).getTime() + days * 86400000) : null;

  const nextBookingStart = nextBooking ? new Date(nextBooking.scheduled_start) : null;
  const bufferMs = bufferHours * 3600000;
  const maxDays = nextBookingStart
    ? Math.max(0, Math.floor((nextBookingStart.getTime() - bufferMs - new Date(rental.scheduled_end).getTime()) / 86400000))
    : undefined;

  return (
    <div className="space-y-4">
      {nextBooking && (
        <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 bg-navy-50 border border-navy-100">
          <CalendarPlus className="w-4 h-4 flex-shrink-0 mt-0.5 text-navy-400" />
          <p className="text-sm text-navy-600">
            Next booking: <strong>{formatDateTime(nextBooking.scheduled_start)}</strong> ({nextBooking.customer_name})
            {maxDays !== undefined && ` — max ${maxDays} day(s) extension allowed`}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Extend by (days)" type="number" min="1" max={maxDays}
          value={extensionDays} onChange={(e) => setExtensionDays(e.target.value)}
          hint={maxDays !== undefined ? `Max ${maxDays} day(s)` : undefined}
        />
        <Input
          label="Rate per Day" type="number"
          value={extensionRate} onChange={(e) => setExtensionRate(e.target.value)}
          hint={`Booking rate: ${symbol}${rental.daily_rate_snapshot}/day`}
        />
      </div>

      {days > 0 && (
        <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4 space-y-2">
          <ChargeRow label="New Scheduled End" value={formatDateTime(newEnd?.toISOString())} />
          <ChargeRow label="Free KM Allowance" value={`${newFreeKm} km`} />
          <ChargeRow label={`Extension (${days} day(s) × ${symbol}${rate})`} value={formatCurrency(additionalBase, symbol)} />
          {Number(rental.gst_percent_snapshot) > 0 && (
            <ChargeRow label={`GST (${rental.gst_percent_snapshot}%)`} value={formatCurrency(additionalGst, symbol)} />
          )}
          <div className="border-t border-navy-200 pt-2 mt-1">
            <ChargeRow label="Additional Charge" value={formatCurrency(additionalTotal, symbol)} bold />
            <ChargeRow label="New Rental Total" value={formatCurrency(newTotal, symbol)} bold />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" className="flex-1" onClick={onConfirm} loading={working}>Confirm Extension</Button>
      </div>
    </div>
  );
}

function EditMode({ rental, editForm, setEditForm, errors, staffList, onCancel, onConfirm, working }) {
  if (!editForm) return null;
  const update = (key, value) => setEditForm((f) => ({ ...f, [key]: value }));
  const isOther = editForm.pickup_venue === 'other';

  const nextBookingStart = rental.next_booking ? new Date(rental.next_booking.scheduled_start) : null;

  return (
    <div className="space-y-4">
      {rental.next_booking && (
        <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 bg-navy-50 border border-navy-100">
          <CalendarPlus className="w-4 h-4 flex-shrink-0 mt-0.5 text-navy-400" />
          <p className="text-sm text-navy-600">
            Next booking for this vehicle: <strong>{formatDateTime(rental.next_booking.scheduled_start)}</strong> ({rental.next_booking.customer_name}) — the new schedule must leave the required buffer gap before it.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Scheduled Start" type="datetime-local" required value={editForm.scheduled_start}
          error={errors.scheduled_start} onChange={(e) => update('scheduled_start', e.target.value)} />
        <Input label="Scheduled End" type="datetime-local" required value={editForm.scheduled_end}
          error={errors.scheduled_end}
          max={nextBookingStart ? toDateTimeInputValue(nextBookingStart) : undefined}
          onChange={(e) => update('scheduled_end', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Destination" value={editForm.destination} onChange={(e) => update('destination', e.target.value)} />
        <Input label="Purpose of Trip" value={editForm.purpose} onChange={(e) => update('purpose', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Assigned Driver</label>
          <select
            value={editForm.assigned_staff}
            onChange={(e) => update('assigned_staff', e.target.value)}
            className="w-full border border-navy-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400 text-navy-800"
          >
            <option value="">No driver assigned</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} · {s.role.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <Select label="Pickup Venue" options={PICKUP_VENUE_OPTIONS} value={editForm.pickup_venue}
          onChange={(e) => update('pickup_venue', e.target.value)} />
      </div>
      {isOther && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Other Location" value={editForm.pickup_venue_other_location}
            onChange={(e) => update('pickup_venue_other_location', e.target.value)} />
          <Input label="Location Link (optional)" value={editForm.pickup_venue_other_link}
            onChange={(e) => update('pickup_venue_other_link', e.target.value)} />
        </div>
      )}
      {isOther && (
        <Input label="Driver Delivery Charge" type="number" value={editForm.driver_delivery_charge}
          onChange={(e) => update('driver_delivery_charge', e.target.value)} />
      )}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Discard</Button>
        <Button variant="primary" className="flex-1" onClick={onConfirm} loading={working}>Save Changes</Button>
      </div>
    </div>
  );
}

function ChargeRow({ label, value, bold, highlight }) {
  const colors = { danger: 'text-danger-500', amber: 'text-amber-600', success: 'text-success-600' };
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-navy-800' : 'text-navy-500'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold' : ''} ${highlight ? colors[highlight] : 'text-navy-800'}`}>{value}</span>
    </div>
  );
}
