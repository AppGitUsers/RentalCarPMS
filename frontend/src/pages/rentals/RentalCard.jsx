import { MapPin, Gauge } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function RentalCard({ rental, symbol, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-navy-100 shadow-card hover:shadow-card-hover cursor-pointer transition-shadow p-4"
    >
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <p className="text-sm font-semibold text-navy-900">{rental.invoice_number}</p>
          <p className="text-xs text-navy-400">{rental.customer_name} · {rental.customer_phone}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={rental.status}>{rental.status}</Badge>
          <Badge variant={rental.payment_status} dot={false} className="text-[10px] px-2 py-0.5">{rental.payment_status}</Badge>
        </div>
      </div>
      <div className="text-xs text-navy-500 space-y-1">
        <p className="font-medium text-navy-700">{rental.vehicle_registration} · {rental.vehicle_display}</p>
        {rental.destination && (
          <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {rental.destination}</p>
        )}
        <p>Due {formatDateTime(rental.scheduled_end)}</p>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy-100">
        <span className="text-xs text-navy-400">Total</span>
        <span className="text-sm font-semibold text-navy-900 tabular-nums">{formatCurrency(rental.total_amount, symbol)}</span>
      </div>
    </div>
  );
}
