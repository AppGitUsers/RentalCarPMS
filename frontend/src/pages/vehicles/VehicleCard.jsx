import { Gauge } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/format';

export default function VehicleCard({ vehicle, symbol, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-navy-100 shadow-card hover:shadow-card-hover cursor-pointer transition-shadow overflow-hidden group"
    >
      <div className="h-32 bg-navy-50 relative overflow-hidden">
        {vehicle.primary_photo ? (
          <img src={vehicle.primary_photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gauge className="w-8 h-8 text-navy-200" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={vehicle.status} className="bg-white/95 backdrop-blur-sm">{vehicle.status}</Badge>
        </div>
      </div>
      <div className="p-3.5">
        <p className="text-sm font-semibold text-navy-900 truncate">{vehicle.make} {vehicle.model}</p>
        <p className="text-xs text-navy-400 mt-0.5">{vehicle.registration_number}</p>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs text-navy-400">{vehicle.owner_name}</span>
          <span className="text-sm font-semibold text-navy-800 tabular-nums">{formatCurrency(vehicle.daily_rate, symbol)}/day</span>
        </div>
      </div>
    </div>
  );
}
