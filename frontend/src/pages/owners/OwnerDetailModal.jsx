import { useEffect, useState } from 'react';
import { Phone, Wallet, Car, History, CheckSquare, Square, Pencil } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TextArea from '../../components/ui/TextArea';
import PaymentQRDisplay from '../../components/ui/PaymentQRDisplay';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import * as ownersApi from '../../api/owners';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function OwnerDetailModal({ open, onClose, owner, onPayoutComplete, onEdit }) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const symbol = settings?.currency_symbol || '₹';

  const [tab, setTab] = useState('vehicles');
  const [unpaidRentals, setUnpaidRentals] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState(null);
  const [selectedRentalIds, setSelectedRentalIds] = useState([]);
  const [payoutMode, setPayoutMode] = useState(null); // null | 'single' | 'collective'
  const [activeRentalForSingle, setActiveRentalForSingle] = useState(null);
  const [notes, setNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [liveBalance, setLiveBalance] = useState(null);

  useEffect(() => {
    if (open && owner) {
      ownersApi.getOwnerUnpaidRentals(owner.id).then(setUnpaidRentals);
      ownersApi.getOwnerPayoutHistory(owner.id).then(setPayoutHistory);
      setLiveBalance(owner.outstanding_balance);
      setTab('vehicles');
      setPayoutMode(null);
      setSelectedRentalIds([]);
      setNotes('');
    }
  }, [open, owner]);

  const refreshOwnerData = async () => {
    const [updatedUnpaid, updatedHistory, freshOwner] = await Promise.all([
      ownersApi.getOwnerUnpaidRentals(owner.id),
      ownersApi.getOwnerPayoutHistory(owner.id),
      ownersApi.getOwner(owner.id),
    ]);
    setUnpaidRentals(updatedUnpaid);
    setPayoutHistory(updatedHistory);
    setLiveBalance(freshOwner.outstanding_balance);
  };

  if (!owner) return null;

  const collectiveTotal = unpaidRentals
    .filter((r) => selectedRentalIds.includes(r.id))
    .reduce((sum, r) => sum + Number(r.owner_share_amount), 0);

  const toggleRental = (id) => {
    setSelectedRentalIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handlePaySingle = async () => {
    setPaying(true);
    try {
      await ownersApi.paySingleRental(owner.id, activeRentalForSingle.id, notes);
      showToast(`Paid ${formatCurrency(activeRentalForSingle.owner_share_amount, symbol)} to ${owner.name}`);
      setPayoutMode(null);
      setActiveRentalForSingle(null);
      setNotes('');
      await refreshOwnerData();
      onPayoutComplete?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Payout failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  const handlePayCollective = async () => {
    setPaying(true);
    try {
      await ownersApi.payCollective(owner.id, selectedRentalIds, notes);
      showToast(`Collective payout of ${formatCurrency(collectiveTotal, symbol)} recorded for ${owner.name}`);
      setPayoutMode(null);
      setSelectedRentalIds([]);
      setNotes('');
      await refreshOwnerData();
      onPayoutComplete?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Payout failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={owner.name} subtitle={owner.phone} size="lg">
      <div className="space-y-5">
        <div className="flex justify-end">
          {onEdit && (
            <Button variant="secondary" icon={Pencil} size="sm" onClick={() => onEdit(owner)}>Edit Owner</Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryMini label="Vehicles Owned" value={owner.vehicle_count ?? owner.vehicles?.length ?? 0} icon={Car} />
          <SummaryMini label="Outstanding Balance" value={formatCurrency(liveBalance ?? owner.outstanding_balance, symbol)} icon={Wallet} tone="amber" />
          <SummaryMini label="UPI ID" value={owner.upi_id || 'Not set'} icon={Phone} />
        </div>

        <div className="flex gap-1 border-b border-navy-100">
          {[
            { key: 'vehicles', label: 'Vehicles' },
            { key: 'payout', label: 'Pay Owner' },
            { key: 'history', label: 'Payout History' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-amber-500 text-navy-900' : 'border-transparent text-navy-400 hover:text-navy-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'vehicles' && (
          <div className="space-y-2">
            {(owner.vehicles || []).length === 0 ? (
              <EmptyState icon={Car} title="No vehicles yet" description="This owner doesn't have any vehicles registered." />
            ) : (
              owner.vehicles.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-navy-100">
                  <div className="flex items-center gap-3">
                    {v.primary_photo ? (
                      <img src={v.primary_photo} className="w-12 h-9 rounded object-cover" alt="" />
                    ) : (
                      <div className="w-12 h-9 rounded bg-navy-100" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-navy-800">{v.registration_number}</p>
                      <p className="text-xs text-navy-400">{v.make} {v.model}</p>
                    </div>
                  </div>
                  <Badge variant={v.status}>{v.status}</Badge>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'payout' && !payoutMode && (
          <div className="space-y-3">
            {unpaidRentals.length === 0 ? (
              <EmptyState icon={Wallet} title="Nothing to pay" description="This owner has no outstanding rentals to be paid out." />
            ) : (
              <>
                <p className="text-xs text-navy-400">Select rentals for a collective payout, or pay one rental individually below.</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {unpaidRentals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-navy-100 hover:bg-navy-50/40">
                      <button onClick={() => toggleRental(r.id)} className="flex items-center gap-3 flex-1 text-left">
                        {selectedRentalIds.includes(r.id) ? (
                          <CheckSquare className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-navy-300 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-navy-800">{r.invoice_number} · {r.vehicle}</p>
                          <p className="text-xs text-navy-400">{r.customer} · {formatDateTime(r.closed_at)}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-navy-900 tabular-nums">{formatCurrency(r.owner_share_amount, symbol)}</span>
                        <Button size="sm" variant="secondary" onClick={() => { setActiveRentalForSingle(r); setPayoutMode('single'); }}>
                          Pay This
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedRentalIds.length > 0 && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                    <p className="text-sm font-medium text-amber-700">
                      {selectedRentalIds.length} selected · {formatCurrency(collectiveTotal, symbol)} total
                    </p>
                    <Button variant="amber" size="sm" onClick={() => setPayoutMode('collective')}>Pay Selected (Collective)</Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'payout' && payoutMode === 'single' && activeRentalForSingle && (
          <div className="space-y-4">
            <PaymentQRDisplay
              fetchQr={(amt) => ownersApi.getOwnerPayoutQR(owner.id, amt)}
              amount={activeRentalForSingle.owner_share_amount}
              symbol={symbol}
              label={`Pay for ${activeRentalForSingle.invoice_number}`}
              recipientName={owner.upi_payee_name || owner.name}
            />
            <TextArea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Paid via cash handover" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setPayoutMode(null); setActiveRentalForSingle(null); }}>Back</Button>
              <Button variant="success" className="flex-1" onClick={handlePaySingle} loading={paying}>Mark as Paid</Button>
            </div>
          </div>
        )}

        {tab === 'payout' && payoutMode === 'collective' && (
          <div className="space-y-4">
            <PaymentQRDisplay
              fetchQr={(amt) => ownersApi.getOwnerPayoutQR(owner.id, amt)}
              amount={collectiveTotal}
              symbol={symbol}
              label={`Collective payout · ${selectedRentalIds.length} rentals`}
              recipientName={owner.upi_payee_name || owner.name}
            />
            <TextArea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Bulk settlement for the month" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setPayoutMode(null)}>Back</Button>
              <Button variant="success" className="flex-1" onClick={handlePayCollective} loading={paying}>Mark as Paid</Button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          !payoutHistory ? (
            <div className="py-6 flex justify-center"><Spinner /></div>
          ) : payoutHistory.length === 0 ? (
            <EmptyState icon={History} title="No payouts yet" description="Payouts to this owner will appear here." />
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {payoutHistory.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-navy-100">
                  <div>
                    <p className="text-sm font-medium text-navy-800 capitalize">{p.payout_type} payout · {p.rental_ids.length} rental(s)</p>
                    <p className="text-xs text-navy-400">{formatDateTime(p.paid_at)} {p.notes && `· ${p.notes}`}</p>
                  </div>
                  <span className="text-sm font-semibold text-success-600 tabular-nums">{formatCurrency(p.amount, symbol)}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

function SummaryMini({ label, value, icon: Icon, tone = 'navy' }) {
  const tones = { navy: 'text-navy-600 bg-navy-50', amber: 'text-amber-600 bg-amber-50' };
  return (
    <div className="bg-white border border-navy-100 rounded-lg px-3.5 py-3">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-2 ${tones[tone]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="text-sm font-semibold text-navy-900 mt-0.5 truncate">{value}</p>
    </div>
  );
}
