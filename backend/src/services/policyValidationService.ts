import { IPolicy } from '../models/Policy';
import { IValidationResult } from '../models/Claim';

export function validatePolicyForClaim(params: {
  policy: IPolicy | null;
  customerId: string;
  incidentDate: Date;
  claimAmount: number;
}): IValidationResult {
  const { policy, customerId, incidentDate, claimAmount } = params;
  const warnings: string[] = [];

  if (!policy) {
    return {
      isValid: false,
      policyExists: false,
      belongsToCustomer: false,
      activeOnIncidentDate: false,
      withinCoverage: false,
      warnings: ['Policy number was not found in the registry.'],
    };
  }

  const belongsToCustomer = policy.customerId.toString() === customerId;
  if (!belongsToCustomer) {
    warnings.push('Policy does not belong to the submitting customer.');
  }

  const activeStatus = policy.status === 'Active';
  const inDateRange = incidentDate >= policy.startDate && incidentDate <= policy.expiryDate;
  const activeOnIncidentDate = activeStatus && inDateRange;

  if (!activeStatus) {
    warnings.push(`Policy status is currently ${policy.status}.`);
  }
  if (!inDateRange) {
    warnings.push('Incident date falls outside the policy coverage period.');
  }

  const withinCoverage = claimAmount <= policy.coverageAmount;
  if (!withinCoverage) {
    warnings.push(
      `Claim amount ($${claimAmount.toLocaleString()}) exceeds policy coverage ($${policy.coverageAmount.toLocaleString()}).`
    );
  }

  const isValid = belongsToCustomer && activeOnIncidentDate && withinCoverage;
  return {
    isValid,
    policyExists: true,
    belongsToCustomer,
    activeOnIncidentDate,
    withinCoverage,
    warnings,
  };
}

