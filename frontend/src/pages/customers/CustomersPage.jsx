import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Phone, CreditCard, UserCircle2 } from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import { PageLoader, EmptyState } from '../../components/ui/Feedback';
import * as customersApi from '../../api/customers';
import CustomerFormModal from './CustomerFormModal';
import CustomerDetailModal from './CustomerDetailModal';
import { useDebounce } from '../../hooks/useDebounce';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    customersApi.listCustomers({ search: debouncedSearch || undefined })
      .then((data) => setCustomers(data.results || data))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Topbar
        title="Customers"
        subtitle="Renter profiles, ID details and rental history"
        actions={
          <Button icon={Plus} onClick={() => { setEditingCustomer(null); setFormOpen(true); }}>
            Add Customer
          </Button>
        }
      />

      <div className="p-8">
        <div className="mb-5 max-w-sm">
          <Input
            icon={Search}
            placeholder="Search by name, phone, or ID number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <PageLoader />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={UserCircle2}
            title="No customers yet"
            description="Add your first customer to start creating rentals."
            action={<Button icon={Plus} onClick={() => setFormOpen(true)}>Add Customer</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customers.map((c) => (
              <Card key={c.id} hover onClick={() => setViewingCustomer(c)} className="group">
                <div className="flex items-center gap-3 mb-3">
                  {c.customer_photo ? (
                    <img src={c.customer_photo} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-base font-semibold text-navy-500 flex-shrink-0">
                      {c.full_name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{c.full_name}</p>
                    <p className="text-xs text-navy-400">{c.rental_count ?? 0} rental(s)</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-navy-500">
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-navy-300" /> {c.phone}</div>
                  {c.id_proof_number && (
                    <div className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-navy-300" /> {c.id_proof_number}</div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); setFormOpen(true); }}
                  className="mt-3 text-xs font-medium text-navy-500 hover:text-navy-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit details
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editingCustomer}
        onSaved={load}
      />
      <CustomerDetailModal
        open={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        customer={viewingCustomer}
      />
    </div>
  );
}
