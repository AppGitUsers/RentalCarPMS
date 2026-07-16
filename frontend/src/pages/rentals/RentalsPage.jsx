import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, CarFront, Clock3, CalendarRange, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [totalCount, setTotalCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
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

  const clearDateFilters = () => {
    setStartFrom(''); setStartTo(''); setEndFrom(''); setEndTo(''); setPage(1);
  };

  const loadStatic = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return Promise.all([
      rentalsApi.getActiveRentals(),
      rentalsApi.listRentals({ status: 'booked', scheduled_start_after: today, page_size: 1 }),
    ]).then(([active, upcoming]) => {
      setActiveRentals(active);
      setUpcomingCount(upcoming.count || 0);
    });
  }, []);

  const loadList = useCallback(() => {
    setLoading(true);
    return rentalsApi.listRentals({
      page: page > 1 ? page : undefined,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      payment_status: paymentFilter || undefined,
      scheduled_start_after:  startFrom || undefined,
      scheduled_start_before: startTo   || undefined,
      scheduled_end_after:    endFrom   || undefined,
      scheduled_end_before:   endTo     || undefined,
    }).then((data) => {
      setRentals(data.results || data);
      setTotalCount(data.count ?? (data.results || data).length);
      setHasNext(!!data.next);
      setHasPrev(!!data.previous);
    }).finally(() => setLoading(false));
  }, [page, debouncedSearch, statusFilter, paymentFilter, startFrom, startTo, endFrom, endTo]);

  const load = useCallback(() => {
    return Promise.all([loadStatic(), loadList()]);
  }, [loadStatic, loadList]);

  useEffect(() => { loadStatic(); }, [loadStatic]);
  useEffect(() => { loadList(); }, [loadList]);

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / 25) : 1;

  return (
    <div>
      <Topbar
        title="Car Rentals"
        subtitle="Bookings, active rentals and closures"
        actions={<Button icon={Plus} onClick={() => setWizardOpen(true)}>New Booking</Button>}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={CarFront} tone="amber" label="Cars Currently Out" value={activeRentals.length} />
          <StatCard icon={Clock3} tone="navy" label="Upcoming Bookings" value={upcomingCount} />
          <StatCard icon={CalendarRange} tone="success" label="Total Bookings" value={totalCount} />
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
                  onClick={() => { setStatusFilter(t.key); setPage(1); }}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === t.key ? 'bg-navy-800 text-white' : 'bg-white text-navy-500 border border-navy-200 hover:bg-navy-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-72">
              <Input
                icon={Search}
                placeholder="Search customer, phone, registration..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-navy-400 font-medium">Payment:</span>
            {PAYMENT_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setPaymentFilter(t.key); setPage(1); }}
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
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-navy-400 flex-shrink-0" />
                <span className="text-xs text-navy-400 font-medium">Pickup:</span>
              </div>
              <input
                type="date" value={startFrom}
                onChange={(e) => { setStartFrom(e.target.value); setPage(1); }}
                className="text-xs border border-navy-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white w-36"
              />
              <span className="text-xs text-navy-400">to</span>
              <input
                type="date" value={startTo}
                onChange={(e) => { setStartTo(e.target.value); setPage(1); }}
                className="text-xs border border-navy-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white w-36"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-navy-400 flex-shrink-0" />
                <span className="text-xs text-navy-400 font-medium">Return:</span>
              </div>
              <input
                type="date" value={endFrom}
                onChange={(e) => { setEndFrom(e.target.value); setPage(1); }}
                className="text-xs border border-navy-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white w-36"
              />
              <span className="text-xs text-navy-400">to</span>
              <input
                type="date" value={endTo}
                onChange={(e) => { setEndTo(e.target.value); setPage(1); }}
                className="text-xs border border-navy-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white w-36"
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rentals.map((r) => (
                <RentalCard key={r.id} rental={r} symbol={symbol} onClick={() => setDetailRentalId(r.id)} />
              ))}
            </div>

            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-navy-400">
                  Page {page} of {totalPages}
                  <span className="ml-2 text-navy-300">·</span>
                  <span className="ml-2">{totalCount} total</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!hasPrev}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-navy-200 text-sm font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-navy-200 text-sm font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
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
