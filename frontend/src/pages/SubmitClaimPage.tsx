import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { Policy, ValidationResult } from '../types';

export function SubmitClaimPage() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyNumber, setPolicyNumber] = useState('');
  const [claimType, setClaimType] = useState('Accident');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [claimAmount, setClaimAmount] = useState('');
  const [incidentHour, setIncidentHour] = useState('14');
  const [witnessesCount, setWitnessesCount] = useState('1');
  const [policeReportFiled, setPoliceReportFiled] = useState(false);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/policies').then((res) => {
      const list = res.data.policies || [];
      setPolicies(list);
      if (list[0]) setPolicyNumber(list[0].policyNumber);
    });
  }, []);

  const runPreCheck = async () => {
    if (!policyNumber || !claimAmount) return;
    try {
      const { data } = await api.post('/policies/validate', {
        policyNumber,
        incidentDate,
        claimAmount: Number(claimAmount),
      });
      setValidation(data.validation);
    } catch {
      setValidation(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('policyNumber', policyNumber);
      formData.append('claimType', claimType);
      formData.append('incidentDate', incidentDate);
      formData.append('claimAmount', claimAmount);
      formData.append('incidentHour', incidentHour);
      formData.append('witnessesCount', witnessesCount);
      formData.append('policeReportFiled', String(policeReportFiled));
      formData.append('description', description);
      if (files) {
        Array.from(files).forEach((f) => formData.append('documents', f));
      }

      const { data } = await api.post('/claims', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/claims/${data.claim._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Submit Insurance Claim</h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Your claim is automatically validated against your policy and scored by our risk intelligence engine.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Policy Number</label>
            <select
              required
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {policies.map((p) => (
                <option key={p._id} value={p.policyNumber}>
                  {p.policyNumber} — {p.policyType} (${p.coverageAmount.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Claim Type</label>
            <select
              value={claimType}
              onChange={(e) => setClaimType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option>Accident</option>
              <option>Medical</option>
              <option>Theft</option>
              <option>Fire</option>
              <option>Natural Disaster</option>
              <option>Liability</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Incident Date</label>
            <input
              type="date"
              required
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              onBlur={runPreCheck}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Claim Amount ($)</label>
            <input
              type="number"
              required
              min={1}
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              onBlur={runPreCheck}
              placeholder="5000"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Incident Hour (0–23)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={incidentHour}
              onChange={(e) => setIncidentHour(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {validation && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
              validation.isValid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {validation.isValid ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                {validation.isValid
                  ? 'Policy Pre-Check Passed'
                  : 'Policy Validation Notice (Claim will be routed for officer review)'}
              </p>
              {validation.warnings.length > 0 && (
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Witnesses Count</label>
            <input
              type="number"
              min={0}
              value={witnessesCount}
              onChange={(e) => setWitnessesCount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 pt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={policeReportFiled}
              onChange={(e) => setPoliceReportFiled(e.target.checked)}
              className="rounded border-slate-300"
            />
            Police / Official Incident Report Filed
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Incident Description</label>
          <textarea
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, location, damages, and any relevant details..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Supporting Documents (PDF, JPG, PNG — max 5MB each)
          </label>
          <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:bg-slate-50 transition">
            <UploadCloud className="w-8 h-8 text-navy-600 mb-2" />
            <span className="text-sm font-medium text-slate-700">
              {files && files.length > 0
                ? `${files.length} file(s) selected`
                : 'Click to upload bills, photos, or reports'}
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={runPreCheck}
            className="px-4 py-2.5 text-sm font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Validate Policy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-semibold bg-navy-800 hover:bg-navy-900 text-white rounded-lg disabled:opacity-60"
          >
            {submitting ? 'Submitting & Analyzing...' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}

