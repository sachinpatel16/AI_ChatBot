export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  fullname?: string;
  phone?: string;
  user_type?: string;
  organization_name?: string;
  company_url?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  username: string;
  fullname: string;
  email: string;
  phone: string;
  user_type: string;
}

export interface Document {
  id: string;
  filename: string;
  upload_date: string;
  user_id: string;
  file_path: string;
}

export interface HRDocument {
  id: string;
  filename: string;
  upload_date: string;
  user_id: string;
  file_path: string;
  is_active: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  type?: 'text' | 'tool_response';
  tool_used?: string[];
}

export interface BackendChatHistory {
  message: string;
  response: string;
  tool_used: string[];
  timestamp: string;
}

export interface ChatHistory {
  id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface APIResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface ChatDocumentItem {
  id: string;
  filename: string;
  is_active: boolean;
  is_processed: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  vector_namespace?: string | null;
  created_at: string;
}
export interface ChatDocumentUploadResponse {
  message: string;
  document_id: string;
  filename: string;
  is_processed: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ── Master Settings (API Keys) ────────────────────────────────────────────────

export interface MasterSettings {
  id: string;
  name: string;
  value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MasterSettingsCreate {
  name: string;
  value: string;
  is_active: boolean;
}

export interface MasterSettingsUpdate {
  value?: string;
  is_active?: boolean;
}

// ── AI Config (Model + Prompts) ───────────────────────────────────────────────

export interface AIConfig {
  id: string;
  model_name: string;
  model_provider: string;
  max_tokens: number;
  temperature: number;
  rag_system_prompt: string;
  general_system_prompt: string;
  rag_not_found_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIConfigUpdate {
  model_name?: string;
  model_provider?: string;
  max_tokens?: number;
  temperature?: number;
  rag_system_prompt?: string;
  general_system_prompt?: string;
  rag_not_found_message?: string;
}

// ── Widget Config ─────────────────────────────────────────────────────────────

export interface WidgetConfig {
  id: string;
  user_id: string;
  widget_token: string;
  bot_name: string;
  welcome_message: string;
  primary_color: string;
  button_position: 'bottom-right' | 'bottom-left';
  quick_replies: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WidgetConfigUpdate {
  bot_name?: string;
  welcome_message?: string;
  primary_color?: string;
  button_position?: 'bottom-right' | 'bottom-left';
  quick_replies?: string[];
}

// ── Super Admin ───────────────────────────────────────────────────────────────

export interface AdminUserView {
  id: string;
  username: string;
  fullname?: string | null;
  email: string;
  user_type: string;
  organization_name?: string | null;
  company_url?: string | null;
  is_active: boolean;
  created_at?: string | null;
  trial_ends_at?: string | null;
  deleted_at?: string | null;
}

export interface PlanOverviewEntry {
  id: string;
  username: string;
  email: string;
  organization_name?: string | null;
  is_active: boolean;
  trial_ends_at?: string | null;
  trial_status: string; // "active", "expired", "no_trial"
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export interface LogFileInfo {
  name: string;
  size_bytes: number;
  size_formatted: string;
  modified: string;
}

export interface LogSummary {
  period_hours: number;
  total_requests: number;
  status_codes: Record<string, number>;
  error_counts: Record<string, number>;
  slow_requests: number;
}

// ── Chat Log Analytics ────────────────────────────────────────────────────────

export interface ChatLog {
  id: string;
  user_id: string;
  session_id?: string | null;
  user_message: string;
  bot_response: string;
  rag_found: boolean;
  status: 'ANSWERED' | 'UNANSWERED' | 'ERROR';
  error_message?: string | null;
  created_at: string;
}

export interface ChatLogListResponse {
  items: ChatLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TopKeyword {
  word: string;
  count: number;
}

export interface ChatLogStats {
  total_messages: number;
  today_messages: number;
  rag_hit_rate: number;
  top_keywords: TopKeyword[];
}
