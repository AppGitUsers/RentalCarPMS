import { useEffect, useState } from 'react';
import { QrCode, RefreshCw } from 'lucide-react';
import { Spinner } from './Feedback';
import { formatCurrency } from '../../utils/format';

/**
 * Displays a dynamic UPI QR. `fetchQr` is an async function(amount) => { qr_image, amount }.
 * Re-fetches whenever `amount` changes so the QR always reflects the live total.
 */
export default function PaymentQRDisplay({ fetchQr, amount, symbol = '₹', label = 'Scan to pay', recipientName }) {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (amount === undefined || amount === null) return;
    setLoading(true);
    setError(null);
    fetchQr(amount)
      .then((data) => setQr(data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not generate QR'))
      .finally(() => setLoading(false));
  }, [amount]);

  return (
    <div className="flex flex-col items-center bg-navy-50/60 border border-navy-100 rounded-xl p-5">
      <p className="text-xs font-medium text-navy-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-navy-900 tabular-nums mb-3">{formatCurrency(amount, symbol)}</p>

      <div className="w-44 h-44 bg-white rounded-lg border border-navy-100 flex items-center justify-center overflow-hidden">
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="text-center px-3">
            <QrCode className="w-8 h-8 text-navy-200 mx-auto mb-1" />
            <p className="text-xs text-danger-500">{error}</p>
          </div>
        ) : qr?.qr_image ? (
          <img src={qr.qr_image} alt="Payment QR" className="w-full h-full object-contain p-2" />
        ) : (
          <QrCode className="w-10 h-10 text-navy-200" />
        )}
      </div>
      {recipientName && <p className="text-xs text-navy-400 mt-3">Pay to <span className="font-medium text-navy-600">{recipientName}</span></p>}
      <p className="text-[11px] text-navy-300 mt-1 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Updates automatically with amount</p>
    </div>
  );
}
