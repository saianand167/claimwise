import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import api from '../services/api';
import { User } from '../types';

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'officer', department: 'Claims Review' });

  const loadUsers = () => {
    api.get('/admin/users').then((res) => setUsers(res.data.users || []));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/users', form);
    setModalOpen(false);
    setForm({ name: '', email: '', password: '', role: 'officer', department: 'Claims Review' });
    loadUsers();
  };

  const toggleActive = async (u: User) => {
    await api.patch(`/admin/users/${u._id}`, { isActive: !u.isActive });
    loadUsers();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Users & Claims Officers</h2>
          <p className="text-sm text-slate-600">Manage customer accounts, officers, and administrators.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy-800 text-white text-sm font-semibold rounded-lg"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff / User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5 font-semibold text-navy-900">{u.name}</td>
                <td className="px-5 py-3.5 text-slate-600">{u.email}</td>
                <td className="px-5 py-3.5 capitalize">{u.role}</td>
                <td className="px-5 py-3.5 text-slate-500">{u.department || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => toggleActive(u)} className="text-xs font-semibold text-navy-600 hover:underline">
                    {u.isActive ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900">Create User Account</h3>
            <input
              type="text"
              required
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="officer">Claims Officer</option>
                <option value="admin">Administrator</option>
                <option value="customer">Customer</option>
              </select>
              <input
                type="text"
                placeholder="Department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-semibold bg-navy-800 text-white rounded-lg">
                Create User
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

