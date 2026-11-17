const BASE_URL = '/api';

export const api = {
  // Batch
  async processBatch(file, csvData, policyVersion) {
    const url = policyVersion
      ? `${BASE_URL}/process-batch?policyVersion=${encodeURIComponent(policyVersion)}`
      : `${BASE_URL}/process-batch`;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(url, { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to process batch');
      return res.json();
    } else {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to process batch');
      return res.json();
    }
  },

  async exportDecisions(records) {
    const res = await fetch(`${BASE_URL}/export-decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    if (!res.ok) throw new Error('Failed to export decisions CSV');
    return res.blob();
  },

  // Chat
  async sendChatMessage(message, currentState) {
    const res = await fetch(`${BASE_URL}/chat/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, currentState }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to process chat message');
    return res.json();
  },

  async createPRFromChat(state, requester) {
    const res = await fetch(`${BASE_URL}/chat/create-pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...state, requester }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create PR');
    return res.json();
  },

  // Policies
  async getPolicies() {
    const res = await fetch(`${BASE_URL}/policies`);
    if (!res.ok) throw new Error('Failed to fetch policies');
    return res.json();
  },

  async getPolicy(version) {
    const res = await fetch(`${BASE_URL}/policies/${version}`);
    if (!res.ok) throw new Error('Failed to fetch policy');
    return res.json();
  },

  async uploadPolicyAmendment(file, text) {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_URL}/policies/upload-amendment`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to parse amendment');
      return res.json();
    } else {
      const res = await fetch(`${BASE_URL}/policies/upload-amendment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to parse amendment');
      return res.json();
    }
  },

  async approvePolicy(version, user, reason) {
    const res = await fetch(`${BASE_URL}/policies/${version}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to approve policy');
    return res.json();
  },

  async rejectPolicy(version, user, reason) {
    const res = await fetch(`${BASE_URL}/policies/${version}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to reject policy');
    return res.json();
  },

  // Contracts
  async getContracts() {
    const res = await fetch(`${BASE_URL}/contracts`);
    if (!res.ok) throw new Error('Failed to fetch contracts');
    return res.json();
  },

  async uploadContractPDF(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/contracts/upload-pdf`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to upload contract PDF');
    return res.json();
  },

  async createContract(contractData) {
    const res = await fetch(`${BASE_URL}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractData),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create contract');
    return res.json();
  },

  // Suppliers
  async getSuppliers(params) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    const res = await fetch(`${BASE_URL}/suppliers?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    return res.json();
  },

  async getPreferredRanking(itemCode, asOfDate) {
    const query = asOfDate ? `?asOfDate=${encodeURIComponent(asOfDate)}` : '';
    const res = await fetch(`${BASE_URL}/suppliers/preferred/${itemCode}${query}`);
    if (!res.ok) throw new Error('Failed to fetch preferred ranking');
    return res.json();
  },

  // Buyer
  async getDashboardStats() {
    const res = await fetch(`${BASE_URL}/buyer/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  async getRequirements(filters) {
    const query = new URLSearchParams();
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== '') query.append(k, String(v));
      }
    }
    const res = await fetch(`${BASE_URL}/buyer/requirements?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch requirements');
    return res.json();
  },

  async getRequirementDetail(id) {
    const res = await fetch(`${BASE_URL}/buyer/requirements/${id}`);
    if (!res.ok) throw new Error('Failed to fetch requirement details');
    return res.json();
  },

  async approveRequirement(id, user, reason) {
    const res = await fetch(`${BASE_URL}/buyer/requirements/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to approve requirement');
    return res.json();
  },

  async overrideRequirement(id, payload) {
    const res = await fetch(`${BASE_URL}/buyer/requirements/${id}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to override requirement');
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${BASE_URL}/buyer/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Data
  async seedData() {
    const res = await fetch(`${BASE_URL}/data/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed data');
    return res.json();
  },

  async getDataStatus() {
    const res = await fetch(`${BASE_URL}/data/status`);
    if (!res.ok) throw new Error('Failed to fetch data status');
    return res.json();
  },
};
