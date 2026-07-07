import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Car, CheckCircle2, Wrench, Clock3, UserCircle2, Wallet } from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PageLoader, EmptyState } from '../../components/ui/Feedback';
import StatCard from '../../components/common/StatCard';
import * as vehiclesApi from '../../api/vehicles';
import * as ownersApi from '../../api/owners';
import { useSettings } from '../../context/SettingsContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatDateTime } from '../../utils/format';
import VehicleCard from './VehicleCard';
import VehicleFormModal from './VehicleFormModal';
import VehicleDetailModal from './VehicleDetailModal';
import VehicleOwnerRateModal from './VehicleOwnerRateModal';
import OwnerFormModal from '../owners/OwnerFormModal';
import OwnerDetailModal from '../owners/OwnerDetailModal';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'rented', label: 'Rented Out' },
  { key: 'maintenance', label: 'Maintenance' },
];

export default function VehiclesOwnersPage() {
  const { settings } = useSettings();
  const symbol = settings?.currency_symbol || '₹';
  const [section, setSection] = useState('vehicles'); // vehicles | owners

  // Vehicles state
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [statusSummary, setStatusSummary] = useState(null);
  const [upcomingArrivals, setUpcomingArrivals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const debouncedVehicleSearch = useDebounce(vehicleSearch, 350);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [viewingVehicle, setViewingVehicle] = useState(null);
  const [rateVehicle, setRateVehicle] = useState(null);

  // Owners state
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(true);
  const [ownerSearch, setOwnerSearch] = useState('');
  const debouncedOwnerSearch = useDebounce(ownerSearch, 350);
  const [ownerFormOpen, setOwnerFormOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [viewingOwner, setViewingOwner] = useState(null);

  const loadVehicles = useCallback(() => {
    setVehiclesLoading(true);
    Promise.all([
      vehiclesApi.listVehicles({ search: debouncedVehicleSearch || undefined, status: statusFilter || undefined }),
      vehiclesApi.getVehicleStatusSummary(),
      vehiclesApi.getUpcomingArrivals(),
    ]).then(([vData, summary, arrivals]) => {
      setVehicles(vData.results || vData);
      setStatusSummary(summary);
      setUpcomingArrivals(arrivals);
    }).finally(() => setVehiclesLoading(false));
  }, [debouncedVehicleSearch, statusFilter]);

  const loadOwners = useCallback(() => {
    setOwnersLoading(true);
    ownersApi.listOwners({ search: debouncedOwnerSearch || undefined })
      .then((data) => setOwners(data.results || data))
      .finally(() => setOwnersLoading(false));
  }, [debouncedOwnerSearch]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);
  useEffect(() => { loadOwners(); }, [loadOwners]);

  const handleViewVehicle = async (v) => {
    const full = await vehiclesApi.getVehicle(v.id);
    setViewingVehicle(full);
  };

  const handleViewOwner = async (o) => {
    const full = await ownersApi.getOwner(o.id);
    setViewingOwner(full);
  };

  return (
    <div>
      <Topbar
        title="Owners & Cars"
        subtitle="Fleet overview, ownership and payouts"
        actions={
          section === 'vehicles' ? (
            <Button icon={Plus} onClick={() => { setEditingVehicle(null); setVehicleFormOpen(true); }}>Add Vehicle</Button>
          ) : (
            <Button icon={Plus} onClick={() => { setEditingOwner(null); setOwnerFormOpen(true); }}>Add Owner</Button>
          )
        }
      />

      <div className="px-4 sm:px-8 pt-6">
        <div className="flex gap-1 border-b border-navy-100 mb-6">
          <button
            onClick={() => setSection('vehicles')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              section === 'vehicles' ? 'border-amber-500 text-navy-900' : 'border-transparent text-navy-400 hover:text-navy-600'
            }`}
          >
            <Car className="w-4 h-4" /> Vehicles
          </button>
          <button
            onClick={() => setSection('owners')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              section === 'owners' ? 'border-amber-500 text-navy-900' : 'border-transparent text-navy-400 hover:text-navy-600'
            }`}
          >
            <UserCircle2 className="w-4 h-4" /> Car Owners
          </button>
        </div>
      </div>

      {section === 'vehicles' && (
        <div className="px-4 sm:px-8 pb-8 space-y-6">
          {statusSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Car} tone="navy" label="Total Fleet" value={statusSummary.total} />
              <StatCard icon={CheckCircle2} tone="success" label="Available Now" value={statusSummary.available} />
              <StatCard icon={Clock3} tone="amber" label="Currently Rented" value={statusSummary.rented} />
              <StatCard icon={Wrench} tone="danger" label="Under Maintenance" value={statusSummary.maintenance} />
            </div>
          )}

          {upcomingArrivals.length > 0 && (
            <Card>
              <p className="text-sm font-semibold text-navy-800 mb-3">Arriving Shortly — Next Returns</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {upcomingArrivals.map((a) => (
                  <div key={a.rental_id} className="flex-shrink-0 w-64 bg-navy-50/60 border border-navy-100 rounded-lg px-4 py-3">
                    <p className="text-sm font-medium text-navy-800">{a.registration_number} · {a.make} {a.model}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{a.customer}</p>
                    <p className="text-xs font-medium text-amber-600 mt-1.5">Due {formatDateTime(a.scheduled_end)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === f.key ? 'bg-navy-800 text-white' : 'bg-white text-navy-500 border border-navy-200 hover:bg-navy-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-72">
              <Input icon={Search} placeholder="Search registration, make, model..." value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} />
            </div>
          </div>

          {vehiclesLoading ? (
            <PageLoader />
          ) : vehicles.length === 0 ? (
            <EmptyState icon={Car} title="No vehicles found" description="Add a vehicle to get started, or adjust your filters." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehicles.map((v) => (
                <div key={v.id} className="flex flex-col gap-1">
                  <VehicleCard vehicle={v} symbol={symbol} onClick={() => handleViewVehicle(v)} />
                  <button
                    onClick={() => setRateVehicle(v)}
                    className="w-full text-xs text-navy-400 hover:text-amber-600 border border-navy-100 rounded-lg py-1 bg-white hover:border-amber-200 transition-colors"
                  >
                    Rate Config
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section === 'owners' && (
        <div className="px-4 sm:px-8 pb-8 space-y-6">
          <div className="w-full sm:w-80">
            <Input icon={Search} placeholder="Search owner name, phone, UPI ID..." value={ownerSearch} onChange={(e) => setOwnerSearch(e.target.value)} />
          </div>

          {ownersLoading ? (
            <PageLoader />
          ) : owners.length === 0 ? (
            <EmptyState icon={UserCircle2} title="No car owners yet" description="Add your first car owner to start onboarding their vehicles." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {owners.map((o) => (
                <Card key={o.id} hover onClick={() => handleViewOwner(o)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-navy-100 flex items-center justify-center text-base font-semibold text-navy-600">
                        {o.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{o.name}</p>
                        <p className="text-xs text-navy-400">{o.phone}</p>
                      </div>
                    </div>
                    {!o.is_active && <Badge variant="inactive">Inactive</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-navy-100">
                    <span className="text-navy-400 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {o.vehicle_count} vehicle(s)</span>
                    <span className={`font-semibold tabular-nums flex items-center gap-1 ${o.outstanding_balance > 0 ? 'text-amber-600' : 'text-navy-400'}`}>
                      <Wallet className="w-3.5 h-3.5" /> {formatCurrency(o.outstanding_balance, symbol)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <VehicleFormModal
        open={vehicleFormOpen} onClose={() => setVehicleFormOpen(false)} vehicle={editingVehicle}
        owners={owners} onSaved={loadVehicles}
      />
      <VehicleDetailModal
        open={!!viewingVehicle} onClose={() => setViewingVehicle(null)} vehicle={viewingVehicle}
        onEdit={(v) => { setViewingVehicle(null); setEditingVehicle(v); setVehicleFormOpen(true); }}
      />

      <VehicleOwnerRateModal
        open={!!rateVehicle} onClose={() => setRateVehicle(null)} vehicle={rateVehicle}
        onSaved={loadVehicles}
      />

      <OwnerFormModal open={ownerFormOpen} onClose={() => setOwnerFormOpen(false)} owner={editingOwner} onSaved={loadOwners} />
      <OwnerDetailModal
        open={!!viewingOwner} onClose={() => setViewingOwner(null)} owner={viewingOwner}
        onPayoutComplete={loadOwners}
        onEdit={(o) => { setViewingOwner(null); setEditingOwner(o); setOwnerFormOpen(true); }}
      />
    </div>
  );
}
