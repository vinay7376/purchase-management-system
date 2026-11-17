import React from 'react';

export const Badge = ({ type, value }) => {
  if (!value) return null;

  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotClass = 'bg-slate-400';

  if (type === 'decision') {
    if (value === 'PO') {
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs font-semibold';
      dotClass = 'bg-emerald-500';
    } else if (value === 'SOURCING_REQUEST') {
      bgClass = 'bg-amber-50 text-amber-800 border-amber-200/80 shadow-2xs font-semibold';
      dotClass = 'bg-amber-500';
    }
  } else if (type === 'route') {
    switch (value) {
      case 'CONTRACT_PO':
        bgClass = 'bg-blue-50 text-blue-700 border-blue-200/80 font-semibold';
        dotClass = 'bg-blue-500';
        break;
      case 'EMERGENCY_PO':
        bgClass = 'bg-rose-50 text-rose-700 border-rose-300 font-bold';
        dotClass = 'bg-rose-500 animate-pulse';
        break;
      case 'SPOT_PO':
        bgClass = 'bg-indigo-50 text-indigo-700 border-indigo-200/80 font-semibold';
        dotClass = 'bg-indigo-500';
        break;
      case 'RFQ':
        bgClass = 'bg-amber-50 text-amber-700 border-amber-200/80 font-semibold';
        dotClass = 'bg-amber-500';
        break;
      case 'RFP':
        bgClass = 'bg-purple-50 text-purple-700 border-purple-200/80 font-semibold';
        dotClass = 'bg-purple-500';
        break;
      case 'CAPEX_SOURCING':
        bgClass = 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/80 font-bold';
        dotClass = 'bg-fuchsia-500';
        break;
      case 'NEW_ITEM_SOURCING':
        bgClass = 'bg-teal-50 text-teal-700 border-teal-200/80 font-semibold';
        dotClass = 'bg-teal-500';
        break;
      case 'NOT_PROCESSED':
        bgClass = 'bg-red-50 text-red-700 border-red-300 font-bold';
        dotClass = 'bg-red-500';
        break;
      default:
        bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
        dotClass = 'bg-slate-400';
    }
  } else if (type === 'status') {
    switch (value) {
      case 'Active':
      case 'APPROVED':
        bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
        dotClass = 'bg-emerald-500';
        break;
      case 'Blocked':
      case 'REJECTED':
        bgClass = 'bg-red-50 text-red-700 border-red-300 font-bold';
        dotClass = 'bg-red-500';
        break;
      case 'Inactive':
      case 'SUPERSEDED':
        bgClass = 'bg-slate-100 text-slate-500 border-slate-200';
        dotClass = 'bg-slate-400';
        break;
      case 'OVERRIDDEN':
        bgClass = 'bg-violet-50 text-violet-700 border-violet-200 font-bold';
        dotClass = 'bg-violet-500';
        break;
      case 'DECIDED':
      case 'PENDING':
      case 'PENDING_APPROVAL':
        bgClass = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
        dotClass = 'bg-amber-500';
        break;
      default:
        bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
        dotClass = 'bg-slate-400';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border tracking-tight ${bgClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`}></span>
      <span>{value}</span>
    </span>
  );
};
