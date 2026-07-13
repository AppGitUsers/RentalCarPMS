import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../api/client';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/format';

const publicClient = axios.create({ baseURL: API_BASE_URL });

async function fetchPublicInvoice(rentalId) {
  const resp = await publicClient.get(`/public/invoice/${rentalId}/`);
  return resp.data;
}

export default function PublicInvoicePage() {
  const { rentalId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPublicInvoice(rentalId)
      .then(setData)
      .catch(() => setError('Invoice not found or unavailable.'));
  }, [rentalId]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-3">🚗</p>
          <p className="text-lg font-semibold text-gray-700">Invoice Not Found</p>
          <p className="text-sm text-gray-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  const { company } = data;
  const sym = company?.currency_symbol || '₹';
  const customer = data.customer_detail || {};
  const vehicle = data.vehicle_detail || {};

  const statusColors = {
    booked: 'bg-blue-100 text-blue-700',
    active: 'bg-amber-100 text-amber-700',
    closed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const paymentColors = {
    pending: 'bg-red-100 text-red-700',
    partial: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
  };

  const hasExtra = Number(data.late_fee_amount) > 0 || Number(data.extra_km_amount) > 0 || Number(data.damage_charge_amount) > 0 || Number(data.driver_delivery_charge) > 0;
  const balanceDue = Number(data.total_amount) - Number(data.amount_paid);

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 print:bg-white print:py-0">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">

        {/* Header */}
        <div className="bg-[#0F3D63] text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company?.logo ? (
                <img src={company.logo} alt="Logo" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {(company?.name || 'D')[0]}
                </div>
              )}
              <div>
                <p className="font-semibold text-base leading-tight">{company?.name || 'DrivePilot'}</p>
                {company?.phone && <p className="text-xs text-blue-200">{company.phone}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200 uppercase tracking-wider">Invoice</p>
              <p className="font-bold text-lg">{data.invoice_number}</p>
            </div>
          </div>
          {(company?.address || company?.email) && (
            <p className="text-xs text-blue-200 mt-2">
              {[company.address, company.email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Status row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Date</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDate(data.closed_at || data.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[data.status] || 'bg-gray-100 text-gray-600'}`}>
                {data.status}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${paymentColors[data.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                {data.payment_status?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Customer + Vehicle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Customer</p>
              <p className="text-sm font-semibold text-gray-800">{customer.full_name || '-'}</p>
              {customer.phone && <p className="text-xs text-gray-500 mt-0.5">{customer.phone}</p>}
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1.5">Vehicle</p>
              <p className="text-sm font-semibold text-gray-800">{vehicle.registration_number || '-'}</p>
              {vehicle.make && <p className="text-xs text-gray-500 mt-0.5">{vehicle.make} {vehicle.model}</p>}
            </div>
          </div>

          {/* Rental Period */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-3">Rental Period</p>
            <div className="space-y-2">
              <Row label="Pickup" value={formatDateTime(data.scheduled_start)} />
              <Row label="Return" value={formatDateTime(data.scheduled_end)} />
              {data.booked_days && <Row label="Duration" value={`${data.booked_days} day${data.booked_days !== 1 ? 's' : ''}`} />}
              {data.destination && <Row label="Destination" value={data.destination} />}
              {data.assigned_staff_name && <Row label="Driver" value={data.assigned_staff_name} />}
            </div>
          </div>

          {/* Charges */}
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Charges</p>
            <div className="space-y-2">
              <ChargeRow
                label={`Base Rental (${data.booked_days} day${data.booked_days !== 1 ? 's' : ''} × ${sym}${Number(data.daily_rate_snapshot).toLocaleString('en-IN')})`}
                value={formatCurrency(data.base_amount, sym)}
              />
              {Number(data.late_fee_amount) > 0 && (
                <ChargeRow label={`Late Fee (${data.late_fee_type || 'Late Return'})`} value={formatCurrency(data.late_fee_amount, sym)} highlight />
              )}
              {Number(data.extra_km_amount) > 0 && (
                <ChargeRow label="Extra KM Charge" value={formatCurrency(data.extra_km_amount, sym)} highlight />
              )}
              {Number(data.damage_charge_amount) > 0 && (
                <ChargeRow label="Damage Charge" value={formatCurrency(data.damage_charge_amount, sym)} highlight />
              )}
              {Number(data.driver_delivery_charge) > 0 && (
                <ChargeRow
                  label={data.assigned_staff_name ? `Driver Delivery (${data.assigned_staff_name})` : 'Driver Delivery Charge'}
                  value={formatCurrency(data.driver_delivery_charge, sym)}
                />
              )}
              {Number(data.gst_amount) > 0 && (
                <ChargeRow label={`GST (${data.gst_percent_snapshot}%)`} value={formatCurrency(data.gst_amount, sym)} />
              )}
            </div>

            <div className="border-t border-gray-200 mt-3 pt-3 space-y-2">
              <ChargeRow label="Total" value={formatCurrency(data.total_amount, sym)} bold />
              <ChargeRow label="Amount Paid" value={formatCurrency(data.amount_paid, sym)} />
              {balanceDue < 0 ? (
                <ChargeRow label="Refund Due" value={formatCurrency(Math.abs(balanceDue), sym)} bold highlight />
              ) : balanceDue > 0 ? (
                <ChargeRow label="Balance Due" value={formatCurrency(balanceDue, sym)} bold highlight />
              ) : (
                <ChargeRow label="Balance Due" value={formatCurrency(0, sym)} bold green />
              )}
            </div>
          </div>

          {/* Payment History */}
          {data.payments?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Payment History</p>
              <div className="space-y-1.5">
                {data.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-green-50 rounded-lg px-3.5 py-2.5">
                    <div>
                      <span className="text-xs font-medium text-green-800 capitalize">{p.method.replace('_', ' ')}</span>
                      <span className="text-xs text-green-600 ml-2">{formatDate(p.paid_at)}</span>
                    </div>
                    <span className="text-sm font-semibold text-green-800 tabular-nums">{formatCurrency(p.amount, sym)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">{company?.footer_note || 'Thank you for choosing us. Drive safe!'}</p>
          <p className="text-[10px] text-gray-300 mt-2">Powered by DrivePilot</p>
        </div>

      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-blue-500 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

function ChargeRow({ label, value, bold, highlight, green }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-sm ${bold ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm tabular-nums flex-shrink-0 ${bold ? 'font-bold' : 'font-medium'} ${highlight ? 'text-red-600' : green ? 'text-green-600' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}
