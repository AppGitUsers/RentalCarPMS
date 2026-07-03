import { useEffect, useState } from 'react';
import {
  MapPin, Gauge, Calendar, Download, FileText, CreditCard, AlertTriangle, CheckCircle2,
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
import { useToast } from '../../components/ui/Toast';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateTime } from '../../utils/format';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank Transfer' },
];

export default function RentalDetailModal({ open, onClose, rentalId, initialMode, onChanged }) {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const symbol = settings?.currency_symbol || '₹';

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
          rental={rental} symbol={symbol}
          onStart={() => { setOdometerStart(rental.odometer_start || ''); setMode('start'); }}
          onClose={() => { setOdometerEnd(''); setDamageAmount('0'); setDamageNotes(''); setMode('close'); }}
          onPay={() => { setPaymentAmount(rental.balance_due); setMode('pay'); }}
          onDownload={handleDownload}
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

function ViewMode({ rental, symbol, onStart, onClose, onPay, onDownload }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Badge variant={rental.status}>{rental.status}</Badge>
        <Badge variant={rental.payment_status}>{rental.payment_status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoMini icon={Calendar} label="Scheduled Start" value={formatDateTime(rental.scheduled_start)} />
        <InfoMini icon={Calendar} label="Scheduled End" value={formatDateTime(rental.scheduled_end)} />
        <InfoMini icon={MapPin} label="Destination" value={rental.destination || '-'} />
        <InfoMini icon={Gauge} label="Odometer Start" value={rental.odometer_start ?? '-'} />
      </div>

      <div className="bg-navy-50/60 border border-navy-100 rounded-xl p-4 space-y-2">
        <ChargeRow label="Base Amount" value={formatCurrency(rental.base_amount, symbol)} />
        {Number(rental.late_fee_amount) > 0 && (
          <ChargeRow
            label={`Late Fee — ${rental.late_fee_type === 'half_day' ? 'Half Day' : rental.late_fee_type === 'full_day' ? 'Full Day' : 'Late Return'}`}
            value={formatCurrency(rental.late_fee_amount, symbol)}
            highlight="danger"
          />
        )}
        {Number(rental.extra_km_amount) > 0 && <ChargeRow label="Extra KM Charge" value={formatCurrency(rental.extra_km_amount, symbol)} highlight="danger" />}
        {Number(rental.damage_charge_amount) > 0 && <ChargeRow label="Damage Charge" value={formatCurrency(rental.damage_charge_amount, symbol)} highlight="danger" />}
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
        {rental.balance_due > 0 && rental.status !== 'cancelled' && (
          <Button variant="primary" icon={CreditCard} onClick={onPay}>Record Payment</Button>
        )}
        <Button variant="secondary" icon={Download} onClick={() => onDownload('invoice')}>Invoice PDF</Button>
        <Button variant="secondary" icon={FileText} onClick={() => onDownload('agreement')}>Agreement PDF</Button>
      </div>

      {(rental.customer_detail?.id_proof_photo_front || rental.customer_detail?.id_proof_photo_back || rental.customer_detail?.driving_license_photo) && (
        <div>
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Customer ID Documents</p>
          <div className="grid grid-cols-3 gap-3">
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

function ChargeRow({ label, value, bold, highlight }) {
  const colors = { danger: 'text-danger-500', amber: 'text-amber-600', success: 'text-success-600' };
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-navy-800' : 'text-navy-500'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold' : ''} ${highlight ? colors[highlight] : 'text-navy-800'}`}>{value}</span>
    </div>
  );
}
