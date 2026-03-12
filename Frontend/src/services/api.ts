import {
  AuthTokens, User, Document, HRDocument, UserProfile,
  ChatDocumentItem, ChatDocumentUploadResponse,
  MasterSettings, MasterSettingsCreate, MasterSettingsUpdate,
  AIConfig, AIConfigUpdate,
  WidgetConfig, WidgetConfigUpdate,
  AdminUserView, PlanOverviewEntry,
  ChatLogListResponse, ChatLogStats
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

class APIService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warnin': 'ngrok-skip-browser-warning',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the request with new token
        config.headers = {
          ...config.headers,
          ...this.getAuthHeaders(),
        };
        return this.request(endpoint, options);
      } else {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.message || 'API request failed');
    }

    const result = await response.json();
    // Return result.data if it exists (i.e. standard APIResponse envelope), otherwise return result
    return result.data !== undefined ? result.data : result;
  }

  // Auth endpoints
  async register(
    username: string,
    fullname: string,
    email: string,
    phone: string,
    password: string,
    organization_name?: string,
    company_url?: string
  ): Promise<{ message: string }> {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ username, fullname, email, phone, password, organization_name, company_url }),
    });
  }

  async login(username: string, password: string): Promise<AuthTokens> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.message || 'Login failed');
    }

    const result = await response.json();
    const tokens: AuthTokens = result.data !== undefined ? result.data : result;
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    return tokens;
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const tokens: AuthTokens = result.data !== undefined ? result.data : result;
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // Document RAG endpoints
  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async getDocuments(): Promise<Document[]> {
    return this.request('/documents');
  }

  async askDocument(documentId: string, question: string, queryType: string = 'question'): Promise<{ response: string }> {
    return this.request('/ask', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        question,
        query_type: queryType,
      }),
    });
  }

  // HR endpoints
  async uploadHRDocument(file: File): Promise<HRDocument> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/hr/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'HR upload failed');
    }

    return response.json();
  }

  async getHRDocuments(): Promise<HRDocument[]> {
    return this.request('/hr/documents');
  }

  async activateHRDocument(docId: string): Promise<{ message: string }> {
    return this.request(`/hr/documents/${docId}/activate`, {
      method: 'POST',
    });
  }

  async deactivateHRDocument(docId: string): Promise<{ message: string }> {
    return this.request(`/hr/documents/${docId}/deactivate`, {
      method: 'POST',
    });
  }

  async askHR(question: string): Promise<{ response: string }> {
    return this.request('/hr/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // Public Chat — no login required
  async chat(message: string, sessionId?: string): Promise<{ response: string; documents_searched: string[]; rag_found: boolean }> {
    const params = new URLSearchParams({ query: message });
    if (sessionId) params.set('session_id', sessionId);
    const url = `${API_BASE_URL}/chat?${params.toString()}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Chat request failed');
    }
    const result = await response.json();
    return result.data !== undefined ? result.data : result;
  }

  // Admin test chat
  async adminTestChat(message: string): Promise<{ response: string; documents_searched: string[]; rag_found: boolean }> {
    const params = new URLSearchParams({ query: message });
    return this.request(`/admin/chat/test?${params.toString()}`, { method: 'POST' });
  }

  // User profile
  async getCurrentUser(): Promise<User> {
    return this.request('/profile');
  }

  async getUserProfile(): Promise<UserProfile> {
    return this.request('/profile');
  }

  async updateUserProfile(profileData: {
    fullname?: string;
    email?: string;
    phone?: string;
    password?: string;
  }): Promise<{ message: string }> {
    return this.request('/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  // Admin Document endpoints
  async uploadChatDocument(file: File): Promise<ChatDocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/admin/documents/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Document upload failed');
    }

    return response.json();
  }

  async downloadChatDocument(docId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/admin/documents/${docId}/download`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorDetail = 'Download failed';
      try {
        const error = await response.json();
        if (error.detail) errorDetail = error.detail;
      } catch (e) {
        // Not a JSON response
      }
      throw new Error(errorDetail);
    }

    return response.blob();
  }

  async listChatDocuments(): Promise<ChatDocumentItem[]> {
    return this.request('/admin/documents');
  }

  async updateChatDocumentStatus(docId: string, isActive: boolean): Promise<{ message: string; document_id: string; is_active: boolean }> {
    return this.request(`/admin/documents/${docId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async deleteChatDocument(docId: string): Promise<{ message: string }> {
    return this.request(`/admin/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  async processChatDocument(docId: string): Promise<{
    message: string;
    document_id: string;
    filename: string;
    is_processed: boolean;
    vector_namespace: string;
  }> {
    return this.request(`/admin/documents/${docId}/process`, {
      method: 'POST',
    });
  }

  // ── Master Settings (API Keys) ──────────────────────────────────────────────

  async getMasterSettings(includeInactive = false): Promise<MasterSettings[]> {
    return this.request(`/admin/master-settings?include_inactive=${includeInactive}`);
  }

  async createMasterSetting(data: MasterSettingsCreate): Promise<MasterSettings> {
    return this.request('/admin/master-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMasterSetting(name: string, data: MasterSettingsUpdate): Promise<MasterSettings> {
    return this.request(`/admin/master-settings/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMasterSetting(name: string): Promise<{ message: string }> {
    return this.request(`/admin/master-settings/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  async activateMasterSetting(name: string): Promise<MasterSettings> {
    return this.request(`/admin/master-settings/${encodeURIComponent(name)}/activate`, {
      method: 'POST',
    });
  }

  // ── AI Config (Model + Prompts) ─────────────────────────────────────────────

  async getAIConfig(): Promise<AIConfig> {
    return this.request('/admin/ai-config');
  }

  async updateAIConfig(data: AIConfigUpdate): Promise<AIConfig> {
    return this.request('/admin/ai-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ── Widget Config ─────────────────────────────────────────────────────────────

  async getWidgetConfig(): Promise<WidgetConfig> {
    return this.request('/admin/widget-config');
  }

  async updateWidgetConfig(data: WidgetConfigUpdate): Promise<WidgetConfig> {
    return this.request('/admin/widget-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ── Super Admin ─────────────────────────────────────────────────────────────

  async listUsers(includeDeleted = false): Promise<AdminUserView[]> {
    return this.request(`/super-admin/users?include_deleted=${includeDeleted}`);
  }

  async getAdminUser(userId: string): Promise<AdminUserView> {
    return this.request(`/super-admin/users/${userId}`);
  }

  async activateUser(userId: string): Promise<{ message: string }> {
    return this.request(`/super-admin/users/${userId}/activate`, {
      method: 'PATCH',
    });
  }

  async deactivateUser(userId: string): Promise<{ message: string }> {
    return this.request(`/super-admin/users/${userId}/deactivate`, {
      method: 'PATCH',
    });
  }

  async softDeleteUser(userId: string): Promise<{ message: string }> {
    return this.request(`/super-admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateUserTrial(userId: string, days: number): Promise<{ message: string }> {
    return this.request(`/super-admin/users/${userId}/trial`, {
      method: 'PATCH',
      body: JSON.stringify({ days }),
    });
  }

  async getPlansOverview(): Promise<PlanOverviewEntry[]> {
    return this.request('/super-admin/plans/overview');
  }

  // ── Logs ────────────────────────────────────────────────────────────────────

  async getAppLogs(lines = 100, level?: string, startTime?: string, endTime?: string): Promise<any> {
    const params = new URLSearchParams({ lines: lines.toString() });
    if (level) params.append('level', level);
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    return this.request(`/logs/app?${params.toString()}`);
  }

  async getErrorLogs(lines = 100, startTime?: string, endTime?: string): Promise<any> {
    const params = new URLSearchParams({ lines: lines.toString() });
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    return this.request(`/logs/error?${params.toString()}`);
  }

  async getAccessLogs(lines = 100, startTime?: string, endTime?: string): Promise<any> {
    const params = new URLSearchParams({ lines: lines.toString() });
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    return this.request(`/logs/access?${params.toString()}`);
  }

  async getLogSummary(hours = 24): Promise<any> {
    return this.request(`/logs/summary?hours=${hours}`);
  }

  async getLogFilesInfo(): Promise<any> {
    return this.request('/logs/files');
  }

  // ── Chat Log Analytics ──────────────────────────────────────────────────────

  async getChatLogs(params: {
    page?: number;
    page_size?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
    rag_found?: boolean;
    status?: string | null;
  } = {}): Promise<ChatLogListResponse> {
    const p = new URLSearchParams();
    if (params.page) p.set('page', String(params.page));
    if (params.page_size) p.set('page_size', String(params.page_size));
    if (params.search) p.set('search', params.search);
    if (params.date_from) p.set('date_from', params.date_from);
    if (params.date_to) p.set('date_to', params.date_to);
    if (params.rag_found !== undefined) p.set('rag_found', String(params.rag_found));
    if (params.status) p.set('status', params.status);
    return this.request(`/admin/chat-logs?${p.toString()}`);
  }

  async getChatLogStats(): Promise<ChatLogStats> {
    return this.request('/admin/chat-logs/stats');
  }

  async deleteChatLog(logId: string): Promise<{ message: string }> {
    return this.request(`/admin/chat-logs/${logId}`, { method: 'DELETE' });
  }
}

export const apiService = new APIService();