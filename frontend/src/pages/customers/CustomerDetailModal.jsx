import { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Feedback';
import * as customersApi from '../../api/customers';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function CustomerDetailModal({ open, onClose, customer }) {
  const { settings } = useSettings();
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (open && customer) {
      customersApi.getCustomerRentalHistory(customer.id).then(setHistory);
    } else {
      setHistory(null);
    }
  }, [open, customer]);

  if (!customer) return null;
  const symbol = settings?.currency_symbol || '₹';

  return (
    <Modal open={open} onClose={onClose} title={customer.full_name} subtitle="Customer profile & rental history" size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {customer.customer_photo ? (
            <img src={customer.customer_photo} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-navy-100 flex items-center justify-center text-xl font-semibold text-navy-500">
              {customer.full_name[0]}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-1.5 text-navy-500"><Phone className="w-3.5 h-3.5" /> {customer.phone}</div>
            {customer.email && <div className="flex items-center gap-1.5 text-navy-500"><Mail className="w-3.5 h-3.5" /> {customer.email}</div>}
            {customer.id_proof_number && <div className="flex items-center gap-1.5 text-navy-500"><CreditCard className="w-3.5 h-3.5" /> {customer.id_proof_number}</div>}
            {customer.address && <div className="flex items-center gap-1.5 text-navy-500 col-span-2"><MapPin className="w-3.5 h-3.5" /> {customer.address}</div>}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-navy-800 mb-3">Rental History</h4>
          {!history ? (
            <div className="py-6 flex justify-center"><Spinner /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-navy-400 py-4 text-center">No rentals yet for this customer.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-navy-100 hover:bg-navy-50/50">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{r.invoice_number} · {r.vehicle}</p>
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
