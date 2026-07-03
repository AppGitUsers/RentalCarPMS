import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, CarFront, Clock3, CalendarRange, X } from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import { PageLoader, EmptyState } from '../../components/ui/Feedback';
import StatCard from '../../components/common/StatCard';
import * as rentalsApi from '../../api/rentals';
import { useSettings } from '../../context/SettingsContext';
import { useDebounce } from '../../hooks/useDebounce';
import RentalCard from './RentalCard';
import NewRentalWizard from './NewRentalWizard';
import RentalDetailModal from './RentalDetailModal';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active (Cars Out)' },
  { key: 'booked', label: 'Upcoming' },
  { key: 'closed', label: 'Closed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_TABS = [
  { key: '', label: 'All Payments' },
  { key: 'pending', label: 'Pending' },
  { key: 'partial', label: 'Partially Paid' },
  { key: 'paid', label: 'Paid' },
];

export default function RentalsPage() {
  const { settings } = useSettings();
  const symbol = settings?.currency_symbol || '₹';

  const [activeRentals, setActiveRentals] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [startFrom, setStartFrom] = useState('');
  const [startTo, setStartTo] = useState('');
  const [endFrom, setEndFrom] = useState('');
  const [endTo, setEndTo] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailRentalId, setDetailRentalId] = useState(null);
  const [detailInitialMode, setDetailInitialMode] = useState(null);

  const hasDateFilters = startFrom || startTo || endFrom || endTo;

  const clearDateFilters = () => { setStartFrom(''); setStartTo(''); setEndFrom(''); setEndTo(''); };

  useEffect(() => {
    rentalsApi.getActiveRentals().then(setActiveRentals);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    rentalsApi.listRentals({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      payment_status: paymentFilter || undefined,
      scheduled_start_after:  startFrom || undefined,
      scheduled_start_before: startTo   || undefined,
      scheduled_end_after:    endFrom   || undefined,
      scheduled_end_before:   endTo     || undefined,
    }).then((list) => {
      setRentals(list.results || list);
    }).finally(() => setLoading(false));
  }, [debouncedSearch, statusFilter, paymentFilter, startFrom, startTo, endFrom, endTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Topbar
        title="Car Rentals"
        subtitle="Bookings, active rentals and closures"
        actions={<Button icon={Plus} onClick={() => setWizardOpen(true)}>New Booking</Button>}
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={CarFront} tone="amber" label="Cars Currently Out" value={activeRentals.length} />
          <StatCard icon={Clock3} tone="navy" label="Upcoming Bookings" value={rentals.filter((r) => r.status === 'booked').length} />
          <StatCard icon={CalendarRange} tone="success" label="Total Bookings Shown" value={rentals.length} />
        </div>

        {activeRentals.length > 0 && (
          <Card>
            <p className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
              <CarFront className="w-4 h-4 text-amber-500" /> Cars Out Right Now
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeRentals.map((r) => (
                <RentalCard key={r.id} rental={r} symbol={symbol} onClick={() => setDetailRentalId(r.id)} />
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === t.key ? 'bg-navy-800 text-white' : 'bg-white text-navy-500 border border-navy-200 hover:bg-navy-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-72">
              <Input icon={Search} placeholder="Search customer, phone, registration..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-navy-400 font-medium">Payment:</span>
            {PAYMENT_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setPaymentFilter(t.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  paymentFilter === t.key
                    ? t.key === 'paid'      ? 'bg-success-500 text-white'
                      : t.key === 'partial' ? 'bg-amber-500 text-white'
                      : t.key === 'pending' ? 'bg-danger-500 text-white'
                      : 'bg-navy-800 text-white'
                    : 'bg-white text-navy-500 border border-navy-200 hover:bg-navy-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Date range filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-3.5 h-3.5 text-navy-400 flex-shrink-0" />
              <span className="text-xs text-navy-400 font-medium">Pickup:</span>
              <input
                type="date" value={startFrom} onChange={(e) => setStartFrom(e.target.value)}
                className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
              />
              <span className="text-xs text-navy-400">to</span>
              <input
                type="date" value={startTo} onChange={(e) => setStartTo(e.target.value)}
                className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <CalendarRange className="w-3.5 h-3.5 text-navy-400 flex-shrink-0" />
              <span className="text-xs text-navy-400 font-medium">Return:</span>
              <input
                type="date" value={endFrom} onChange={(e) => setEndFrom(e.target.value)}
                className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
              />
              <span className="text-xs text-navy-400">to</span>
              <input
                type="date" value={endTo} onChange={(e) => setEndTo(e.target.value)}
                className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
              />
            </div>

            {hasDateFilters && (
              <button
                onClick={clearDateFilters}
                className="flex items-center gap-1 text-xs text-danger-600 hover:text-danger-700 font-medium"
              >
                <X className="w-3 h-3" /> Clear dates
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : rentals.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No bookings found"
            description="Create a new booking or adjust your filters."
            action={<Button icon={Plus} onClick={() => setWizardOpen(true)}>New Booking</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rentals.map((r) => (
              <RentalCard key={r.id} rental={r} symbol={symbol} onClick={() => setDetailRentalId(r.id)} />
            ))}
          </div>
        )}
      </div>

      <NewRentalWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={(rental, paymentTiming) => {
          load();
          setDetailInitialMode(paymentTiming === 'now' ? 'pay' : null);
          setDetailRentalId(rental.id);
        }}
      />
      <RentalDetailModal
        open={!!detailRentalId}
        onClose={() => { setDetailRentalId(null); setDetailInitialMode(null); }}
        rentalId={detailRentalId}
        initialMode={detailInitialMode}
        onChanged={load}
      />
    </div>
  );
}
