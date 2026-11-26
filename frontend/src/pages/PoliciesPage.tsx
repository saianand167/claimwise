import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Edit3 } from 'lucide-react';
import api from '../services/api';
import { Policy, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export function PoliciesPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [form, setForm] = useState({
    customerId: '',
    policyType: 'Auto',
    coverageAmount: 50000,
    premium: 1200,
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    status: 'Active',
  });

  const loadPolicies = async () => {
    const { data } = await api.get('/policies', { params: { search, status: statusFilter } });
    setPolicies(data.policies || []);
  };

  useEffect(() => {
    loadPolicies();
    if (user?.role === 'admin') {
      api.get('/admin/users', { params: { role: 'customer' } }).then((res) => setCustomers(res.data.users || []));
    }
  }, [search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      customerId: customers[0]?._id || '',
      policyType: 'Auto',
      coverageAmount: 50000,
      premium: 1200,
      startDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      status: 'Active',
    });
    setModalOpen(true);
  };

  const openEdit = (p: Policy) => {
    setEditing(p);
    setForm({
      customerId: typeof p.customerId === 'string' ? p.customerId : p.customerId?._id || '',
      policyType: p.policyType,
      coverageAmount: p.coverageAmount,
      premium: p.premium,
      startDate: p.startDate.slice(0, 10),
      expiryDate: p.expiryDate.slice(0, 10),
      status: p.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await api.put(`/policies/${editing._id}`, form);
    } else {
      await api.post('/policies', form);
    }
    setModalOpen(false);
    loadPolicies();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this policy?')) return;
    await api.delete(`/policies/${id}`);
    loadPolicies();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Insurance Policies</h2>
          <p className="text-sm text-slate-600">Manage coverage terms, validity dates, and policy status.</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold rounded-lg"
          >
            <Plus className="w-4 h-4" />
            New Policy
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by policy number..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Suspended">Suspended</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Policy Number</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Coverage</th>
              <th className="px-5 py-3">Premium</th>
              <th className="px-5 py-3">Validity</th>
              <th className="px-5 py-3">Status</th>
              {user?.role === 'admin' && <th className="px-5 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {policies.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5 font-semibold text-navy-800">{p.policyNumber}</td>
                <td className="px-5 py-3.5 text-slate-700">
                  {typeof p.customerId === 'object' ? p.customerId.name : p.customerId}
                </td>
                <td className="px-5 py-3.5">{p.policyType}</td>
                <td className="px-5 py-3.5 font-medium">${p.coverageAmount.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-slate-600">${p.premium.toLocaleString()}/yr</td>
                <td className="px-5 py-3.5 text-xs text-slate-500">
                  {new Date(p.startDate).toLocaleDateString()} – {new Date(p.expiryDate).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={p.status} />
                </td>
                {user?.role === 'admin' && (
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button onClick={() => openEdit(p)} className="text-slate-600 hover:text-navy-700">
                      <Edit3 className="w-4 h-4 inline" />
                    </button>
                    <button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900">{editing ? 'Edit Policy' : 'Create Policy'}</h3>
            {!editing && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Customer</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Policy Type</label>
                <select
                  value={form.policyType}
                  onChange={(e) => setForm({ ...form, policyType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option>Auto</option>
                  <option>Health</option>
                  <option>Property</option>
                  <option>Life</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option>Active</option>
                  <option>Expired</option>
                  <option>Suspended</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Coverage ($)</label>
                <input
                  type="number"
                  required
                  value={form.coverageAmount}
                  onChange={(e) => setForm({ ...form, coverageAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Premium ($)</label>
                <input
                  type="number"
                  required
                  value={form.premium}
                  onChange={(e) => setForm({ ...form, premium: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-semibold bg-navy-800 text-white rounded-lg">
                Save Policy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

