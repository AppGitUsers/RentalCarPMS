import { useEffect, useState, useCallback } from 'react';
import { Save, Building2, Percent, Receipt, ImageIcon, Users, Plus, Trash2, KeyRound } from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import Card, { CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import PhotoUpload from '../../components/ui/PhotoUpload';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { PageLoader } from '../../components/ui/Feedback';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/ui/Toast';
import * as settingsApi from '../../api/settings';
import * as authApi from '../../api/auth';
import * as staffApi from '../../api/staff';

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

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
        <Card>
          <CardHeader icon={Building2} title="Company Details" subtitle="Shown on invoices and rental agreements" />
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
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

        <StaffLoginsCard />

        <div className="flex justify-end pb-4">
          <Button icon={Save} onClick={handleSave} loading={saving} size="lg">Save All Changes</Button>
        </div>
      </div>
    </div>
  );
}

function StaffLoginsCard() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [staffMemberId, setStaffMemberId] = useState('');
  const [creating, setCreating] = useState(false);
  const [changingPwId, setChangingPwId] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    const [accs, staff] = await Promise.all([
      authApi.listStaffAccounts(),
      staffApi.listStaff({ is_active: true }),
    ]);
    setAccounts(accs);
    setStaffList(staff.results || staff);
  }, []);

  useEffect(() => { load(); }, [load]);

  const staffOptions = [
    { value: '', label: 'Common (All Staff)' },
    ...staffList.map((s) => ({ value: String(s.id), label: s.full_name })),
  ];

  const handleCreate = async () => {
    if (!username.trim()) { showToast('Username is required', 'error'); return; }
    if (password.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }
    setCreating(true);
    try {
      await authApi.createStaffAccount({
        username: username.trim(),
        password,
        staff_member: staffMemberId ? Number(staffMemberId) : null,
      });
      showToast('Staff login created');
      setUsername(''); setPassword(''); setStaffMemberId('');
      load();
    } catch (err) {
      const data = err.response?.data;
      showToast(data?.username?.[0] || data?.detail || 'Could not create login', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await authApi.deleteStaffAccount(id);
      showToast('Staff login removed');
      load();
    } catch {
      showToast('Could not delete login', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangePw = async (id) => {
    if (newPw.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }
    try {
      await authApi.changeStaffPassword(id, newPw);
      showToast('Password updated');
      setChangingPwId(null);
      setNewPw('');
    } catch {
      showToast('Could not update password', 'error');
    }
  };

  return (
    <Card>
      <CardHeader icon={Users} title="Staff Logins" subtitle="Create login credentials for staff members to access the app" />

      {/* Existing accounts */}
      {accounts.length > 0 && (
        <div className="space-y-2 mb-5">
          {accounts.map((acc) => (
            <div key={acc.id} className="border border-navy-100 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-navy-800">{acc.username}</p>
                  <p className="text-xs text-navy-400">{acc.staff_member_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setChangingPwId(changingPwId === acc.id ? null : acc.id); setNewPw(''); }}
                    className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors"
                    title="Change password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    disabled={deletingId === acc.id}
                    className="p-1.5 rounded-lg text-danger-400 hover:text-danger-600 hover:bg-danger-50 transition-colors disabled:opacity-40"
                    title="Delete login"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {changingPwId === acc.id && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password (min 4 chars)"
                    className="flex-1 text-sm border border-navy-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300"
                  />
                  <Button size="sm" onClick={() => handleChangePw(acc.id)}>Set</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setChangingPwId(null); setNewPw(''); }}>Cancel</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create new */}
      <div className="border-t border-navy-100 pt-4 space-y-3">
        <p className="text-xs font-semibold text-navy-600 uppercase tracking-wide">Create New Staff Login</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. staff1 or driver_rajan"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 4 characters"
          />
        </div>
        <Select
          label="Linked to Staff Member"
          options={staffOptions}
          value={staffMemberId}
          onChange={(e) => setStaffMemberId(e.target.value)}
          hint="Choose a specific staff or leave as Common so any staff can use this login"
        />
        <div className="flex justify-end">
          <Button icon={Plus} onClick={handleCreate} loading={creating}>Create Login</Button>
        </div>
      </div>
    </Card>
  );
}
