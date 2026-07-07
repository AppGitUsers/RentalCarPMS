import { useEffect, useState } from 'react';
import { Gauge, Fuel, Users as UsersIcon, Cog, Phone, Calendar, Pencil } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Feedback';
import * as vehiclesApi from '../../api/vehicles';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function VehicleDetailModal({ open, onClose, vehicle, onEdit }) {
  const { settings } = useSettings();
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (open && vehicle) {
      vehiclesApi.getVehicleRentalHistory(vehicle.id).then(setHistory);
    } else {
      setHistory(null);
    }
  }, [open, vehicle]);

  if (!vehicle) return null;
  const symbol = settings?.currency_symbol || '₹';

  return (
    <Modal open={open} onClose={onClose} title={`${vehicle.make} ${vehicle.model}`} subtitle={vehicle.registration_number} size="lg">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {vehicle.primary_photo ? (
            <img src={vehicle.primary_photo} alt="" className="w-full sm:w-32 h-40 sm:h-24 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-full sm:w-32 h-32 sm:h-24 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0">
              <Gauge className="w-8 h-8 text-navy-300" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm flex-1">
            <div className="flex items-center gap-1.5 text-navy-500"><Gauge className="w-3.5 h-3.5" /> {vehicle.current_odometer?.toLocaleString()} km</div>
            <div className="flex items-center gap-1.5 text-navy-500 capitalize"><Fuel className="w-3.5 h-3.5" /> {vehicle.fuel_type}</div>
            <div className="flex items-center gap-1.5 text-navy-500"><UsersIcon className="w-3.5 h-3.5" /> {vehicle.seating_capacity} seats</div>
            <div className="flex items-center gap-1.5 text-navy-500 capitalize"><Cog className="w-3.5 h-3.5" /> {vehicle.transmission}</div>
            <div className="col-span-2 mt-1">
              <Badge variant={vehicle.status}>{vehicle.status}</Badge>
            </div>
          </div>
        </div>

        <div className="bg-navy-50/60 rounded-xl p-4">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2.5">Owner Details</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy-900">{vehicle.owner_detail?.name}</p>
              <p className="text-xs text-navy-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {vehicle.owner_detail?.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-navy-400">Owner Share</p>
              <p className="text-base font-semibold text-navy-900">{vehicle.effective_owner_share_percent}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <PricingMini label="Daily Rate" value={formatCurrency(vehicle.daily_rate, symbol)} />
          <PricingMini label="Insurance Expiry" value={vehicle.insurance_expiry || 'Not set'} icon={Calendar} />
          <PricingMini label="Permit Expiry" value={vehicle.permit_expiry || 'Not set'} icon={Calendar} />
        </div>

        {onEdit && (
          <div className="flex justify-end">
            <Button variant="secondary" icon={Pencil} size="sm" onClick={() => onEdit(vehicle)}>Edit Vehicle</Button>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-navy-800 mb-3">Rental History</h4>
          {!history ? (
            <div className="py-6 flex justify-center"><Spinner /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-navy-400 py-4 text-center">No rental history for this vehicle yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {history.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-navy-100 hover:bg-navy-50/50">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{r.invoice_number} · {r.customer}</p>
                    <p className="text-xs text-navy-400">{formatDateTime(r.scheduled_start)}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-sm font-semibold text-navy-900 tabular-nums">{formatCurrency(r.total_amount, symbol)}</span>
                    <Badge variant={r.status}>{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function PricingMini({ label, value, icon: Icon }) {
  return (
    <div className="bg-white border border-navy-100 rounded-lg px-3.5 py-3">
      <p className="text-xs text-navy-400 flex items-center gap-1">{Icon && <Icon className="w-3 h-3" />}{label}</p>
      <p className="text-sm font-semibold text-navy-900 mt-0.5">{value}</p>
    </div>
  );
}
