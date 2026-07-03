import { useEffect, useState } from 'react';
import { Save, Building2, Percent, Receipt, ImageIcon } from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import Card, { CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import PhotoUpload from '../../components/ui/PhotoUpload';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Feedback';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/ui/Toast';
import * as settingsApi from '../../api/settings';

export default function SettingsPage() {
  const { settings, loading, refresh } = useSettings();
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (loading || !form) return <PageLoader />;

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'id' || k === 'updated_at' || k === 'company_logo') return;
        formData.append(k, v ?? '');
      });
      if (logoFile) formData.append('company_logo', logoFile);

      await settingsApi.updateSettings(formData);
      showToast('Settings saved — changes are now reflected app-wide');
      refresh();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Settings"
        subtitle="Business rules, charges and invoice configuration"
        actions={<Button icon={Save} onClick={handleSave} loading={saving}>Save Changes</Button>}
      />

      <div className="p-8 space-y-6 max-w-4xl">
        <Card>
          <CardHeader icon={Building2} title="Company Details" subtitle="Shown on invoices and rental agreements" />
          <div className="space-y-4">
            <div className="flex gap-4">
              <PhotoUpload label="Company Logo" existingUrl={form.company_logo} onChange={setLogoFile} />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Company Name" value={form.company_name} onChange={(e) => update('company_name', e.target.value)} />
                <Input label="Invoice Prefix" value={form.invoice_prefix} onChange={(e) => update('invoice_prefix', e.target.value)} hint="e.g. INV → INV-00001" />
                <Input label="Phone" value={form.company_phone} onChange={(e) => update('company_phone', e.target.value)} />
                <Input label="Email" type="email" value={form.company_email} onChange={(e) => update('company_email', e.target.value)} />
              </div>
            </div>
            <TextArea label="Company Address" value={form.company_address} onChange={(e) => update('company_address', e.target.value)} rows={2} />
            <Input
              label="Company UPI ID" value={form.company_upi_id} onChange={(e) => update('company_upi_id', e.target.value)}
              placeholder="company@upi" hint="Used to generate the dynamic QR shown to customers for payment"
            />
          </div>
        </Card>

        <Card>
          <CardHeader icon={Percent} title="Pricing & Charges" subtitle="Applied automatically across all new bookings" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GST (%)" type="number" min="0" max="100" step="0.01"
              value={form.gst_percent} onChange={(e) => update('gst_percent', e.target.value)}
              hint="Applied on top of the base rental amount. Default 0%."
            />
            <Input
              label="Grace Period (minutes)" type="number" value={form.grace_period_minutes}
              onChange={(e) => update('grace_period_minutes', e.target.value)}
              hint="No late fee applies within this window after scheduled end time"
            />
            <Input
              label="Extra KM Charge (per km, ₹)" type="number" value={form.extra_km_charge_per_km}
              onChange={(e) => update('extra_km_charge_per_km', e.target.value)}
            />
            <Input
              label="Free KM (per booked day)" type="number" value={form.free_km_per_day}
              onChange={(e) => update('free_km_per_day', e.target.value)}
              hint="e.g. 200 km/day included free before extra charges apply"
            />
            <Input
              label="Standard Shift Hours (staff)" type="number" step="0.5" value={form.standard_shift_hours}
              onChange={(e) => update('standard_shift_hours', e.target.value)}
              hint="Used to pro-rate monthly salary from hours worked"
            />
            <Input
              label="Currency Symbol" value={form.currency_symbol}
              onChange={(e) => update('currency_symbol', e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <CardHeader icon={Receipt} title="Invoice Content" subtitle="Terms and footer note printed on every invoice" />
          <div className="space-y-4">
            <TextArea label="Terms & Conditions" value={form.invoice_terms} onChange={(e) => update('invoice_terms', e.target.value)} rows={5} />
            <TextArea label="Footer Note" value={form.invoice_footer_note} onChange={(e) => update('invoice_footer_note', e.target.value)} rows={2} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={ImageIcon} title="Session" subtitle="Admin login behaviour" />
          <Input
            label="Session Timeout (hours)" type="number" value={form.session_timeout_hours}
            onChange={(e) => update('session_timeout_hours', e.target.value)}
            hint="Admin will be asked to log in again after this many hours"
          />
        </Card>

        <div className="flex justify-end pb-4">
          <Button icon={Save} onClick={handleSave} loading={saving} size="lg">Save All Changes</Button>
        </div>
      </div>
    </div>
  );
}
