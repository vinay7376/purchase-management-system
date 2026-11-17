import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar.jsx';
import { Header } from './components/Header.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { ChatIntakeView } from './views/ChatIntakeView.jsx';
import { BatchProcessingView } from './views/BatchProcessingView.jsx';
import { RequirementsView } from './views/RequirementsView.jsx';
import { PolicyManagementView } from './views/PolicyManagementView.jsx';
import { ContractsView } from './views/ContractsView.jsx';
import { SuppliersView } from './views/SuppliersView.jsx';
import { AuditLogView } from './views/AuditLogView.jsx';

export const App = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getHeaderInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Executive Procurement Dashboard', subtitle: 'Corvo Engineering Pvt Ltd — Bhosari (PUN1) & Chakan (CHK1)' };
      case 'chat':
        return { title: 'Employee PR Intake', subtitle: 'Conversational PR Assistant' };
      case 'batch':
        return { title: 'Batch Processing & Export', subtitle: 'Deterministic decision evaluation & CSV output' };
      case 'requirements':
        return { title: 'Buyer Requirements Workspace', subtitle: 'Clubbed line evaluation, approvals & overrides' };
      case 'policies':
        return { title: 'Policy Management & Versioning', subtitle: 'Data-driven rule engine (Corvo Procurement Policy v5.0)' };
      case 'contracts':
        return { title: 'Contract Ceilings & PDF Register', subtitle: 'Ceiling governance & PDF-only contract extraction' };
      case 'suppliers':
        return { title: 'Supplier Directory & Preferred Rankings', subtitle: '548-day history scoring formula & category suggestions' };
      case 'audit':
        return { title: 'Audit Trail & Overrides', subtitle: 'Immutable governance log' };
      default:
        return { title: 'Corvo Procurement Engine' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
          activePolicyVersion="5.0"
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} key={refreshTrigger} />}
          {currentTab === 'chat' && <ChatIntakeView />}
          {currentTab === 'batch' && <BatchProcessingView key={refreshTrigger} />}
          {currentTab === 'requirements' && <RequirementsView key={refreshTrigger} />}
          {currentTab === 'policies' && <PolicyManagementView key={refreshTrigger} />}
          {currentTab === 'contracts' && <ContractsView key={refreshTrigger} />}
          {currentTab === 'suppliers' && <SuppliersView key={refreshTrigger} />}
          {currentTab === 'audit' && <AuditLogView key={refreshTrigger} />}
        </main>
      </div>
    </div>
  );
};

export default App;
