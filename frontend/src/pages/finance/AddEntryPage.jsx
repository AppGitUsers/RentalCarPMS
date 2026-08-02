import { useEffect, useState, useCallback } from 'react';
import { Plus, Receipt } from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import Button from '../../components/ui/Button';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PageLoader, EmptyState } from '../../components/ui/Feedback';
import * as financeApi from '../../api/finance';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDate } from '../../utils/format';
import FinanceEntryModal from './FinanceEntryModal';

export default function AddEntryPage() {
  const { settings } = useSettings();
  const symbol = settings?.currency_symbol || '₹';

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    financeApi.listFinanceEntries({ mine: true, ordering: '-date' })
      .then((e) => setEntries((e.results || e).slice(0, 20)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Topbar
        title="Add Entry"
        subtitle="Log income or expense entries such as fuel, maintenance or misc costs"
        actions={<Button icon={Plus} onClick={() => setEntryModalOpen(true)}>Add Entry</Button>}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader title="My Recent Entries" subtitle="Entries you've logged" />
          {loading ? (
            <PageLoader />
          ) : entries.length === 0 ? (
            <EmptyState icon={Receipt} title="No entries yet" description="Add fuel costs, maintenance, or other income/expenses here." />
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-navy-100">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{e.title}</p>
                    <p className="text-xs text-navy-400">{formatDate(e.date)} · <span className="capitalize">{e.category.replace('_', ' ')}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold tabular-nums ${e.entry_type === 'income' ? 'text-success-600' : 'text-danger-500'}`}>
                      {e.entry_type === 'income' ? '+' : '-'}{formatCurrency(e.amount, symbol)}
                    </span>
                    <Badge variant={e.entry_type === 'income' ? 'paid' : 'pending'} dot={false}>{e.entry_type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <FinanceEntryModal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} onSaved={load} />
    </div>
  );
}
