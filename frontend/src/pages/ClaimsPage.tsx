import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, FilePlus2 } from 'lucide-react';
import api from '../services/api';
import { Claim, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';

export function ClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [riskLevel, setRiskLevel] = useState('All');

  const loadClaims = async () => {
    const { data } = await api.get('/claims', { params: { search, status, riskLevel } });
    setClaims(data.claims || []);
  };

  useEffect(() => {
    loadClaims();
    if (user?.role === 'admin') {
      api.get('/admin/users', { params: { role: 'officer' } }).then((res) => setOfficers(res.data.users || []));
    }
  }, [search, status, riskLevel]);

  const handleAssign = async (claimId: string, officerId: string) => {
    if (!officerId) return;
    await api.patch(`/claims/${claimId}/assign`, { officerId });
    loadClaims();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Claims Registry</h2>
          <p className="text-sm text-slate-600">Track claims, policy validation, and ML fraud risk scores.</p>
        </div>
        {user?.role === 'customer' && (
          <Link
            to="/claims/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold rounded-lg"
          >
            <FilePlus2 className="w-4 h-4" />
            Submit Claim
          </Link>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Claim ID, Policy #, or Type..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
          <option value="All">All Statuses</option>
          <option>Under Review</option>
          <option>Pending Documents</option>
          <option>Additional Information Required</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>
        <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
          <option value="All">All Risk Levels</option>
          <option value="Low">Low Risk</option>
          <option value="Medium">Medium Risk</option>
          <option value="High">High Risk</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Claim ID</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Policy #</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">ML Risk</th>
              <th className="px-5 py-3">Status</th>
              {user?.role === 'admin' && <th className="px-5 py-3">Assigned Officer</th>}
              <th className="px-5 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5 font-semibold text-navy-800">{c.claimId}</td>
                <td className="px-5 py-3.5 text-slate-700">{c.customerId?.name || 'Customer'}</td>
                <td className="px-5 py-3.5 text-slate-600">{c.policyNumber}</td>
                <td className="px-5 py-3.5 font-medium">${c.claimAmount.toLocaleString()}</td>
                <td className="px-5 py-3.5">
                  <RiskBadge level={c.prediction?.riskLevel} score={c.prediction?.riskScore} />
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={c.status} />
                </td>
                {user?.role === 'admin' && (
                  <td className="px-5 py-3.5">
                    <select
                      value={c.assignedOfficerId?._id || ''}
                      onChange={(e) => handleAssign(c._id, e.target.value)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                    >
                      <option value="">Unassigned</option>
                      {officers.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-5 py-3.5 text-right">
                  <Link to={`/claims/${c._id}`} className="text-xs font-semibold text-navy-600 hover:underline">
                    Open Workspace
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

