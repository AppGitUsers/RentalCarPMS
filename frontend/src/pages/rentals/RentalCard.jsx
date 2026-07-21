import { MapPin } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../../utils/format';

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function toWaPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

export default function RentalCard({ rental, symbol, onClick }) {
  const handleWhatsApp = (e) => {
    e.stopPropagation();
    const waPhone = toWaPhone(rental.customer_phone);
    const invoiceUrl = `${window.location.origin}/invoice/${rental.id}`;
    const lines = [
      `Hello ${rental.customer_name}! 👋`,
      '',
      `Your car rental booking:`,
      `📋 Invoice: ${rental.invoice_number}`,
      `🚗 Vehicle: ${rental.vehicle_registration} · ${rental.vehicle_display}`,
      `📅 Pickup: ${formatDateTime(rental.scheduled_start)}`,
      `📅 Return: ${formatDateTime(rental.scheduled_end)}`,
    ];
    if (rental.destination) lines.push(`📍 Destination: ${rental.destination}`);
    lines.push(
      `💰 Total: ${formatCurrency(rental.total_amount, symbol)}`,
      `💳 Payment: ${rental.payment_status}`,
      '',
      `🔗 View your invoice:`,
      invoiceUrl,
    );
    const msg = lines.join('\n');
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

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
          {rental.status === 'booked' && new Date(rental.scheduled_start) > new Date() && (
            <Badge variant="partial" dot={false} className="text-[10px] px-2 py-0.5">Reserved</Badge>
          )}
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
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-navy-400">Total</span>
          <span className="text-sm font-semibold text-navy-900 tabular-nums">{formatCurrency(rental.total_amount, symbol)}</span>
        </div>
        <button
          onClick={handleWhatsApp}
          title="Send invoice on WhatsApp"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#25D366] hover:bg-green-50 transition-colors text-xs font-medium"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
