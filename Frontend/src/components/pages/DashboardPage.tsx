import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  TrendingUp,
  Target,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { ChatLog, ChatLogStats } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}


function truncate(text: string, len = 100) {
  return text.length > len ? text.slice(0, len) + '…' : text;
}

// ── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}> = ({ label, value, icon, accent, sub }) => (
  <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20 flex items-center gap-4`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Keyword Bar ──────────────────────────────────────────────────────────────

const KeywordBar: React.FC<{ word: string; count: number; max: number; rank: number }> = ({
  word, count, max, rank,
}) => {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
    'bg-sky-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500',
    'bg-pink-500', 'bg-rose-500',
  ];
  const color = colors[rank % colors.length];

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm font-medium text-gray-700 dark:text-gray-200 capitalize truncate">{word}</span>
      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{count}</span>
    </div>
  );
};

// ── Conversation Row ─────────────────────────────────────────────────────────

const ConversationRow: React.FC<{
  log: ChatLog;
  onDelete: (id: string) => void;
  deleting: boolean;
}> = ({ log, onDelete, deleting }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 border border-white/30 dark:border-gray-700/30 rounded-xl overflow-hidden transition-all">
      {/* Row header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
      >
        <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${log.status === 'ANSWERED' ? 'bg-green-100 dark:bg-green-900/40' : log.status === 'ERROR' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
          {log.status === 'ANSWERED'
            ? <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            : log.status === 'UNANSWERED' 
            ? <Search className="w-3.5 h-3.5 text-amber-500" />
            : <XCircle className="w-3.5 h-3.5 text-red-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{truncate(log.user_message, 120)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(log.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {log.status === 'ANSWERED'
            ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">Answered</span>
            : log.status === 'UNANSWERED'
            ? <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">Unanswered</span>
            : <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">Error</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700/50 px-4 py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1.5 uppercase tracking-wide">User asked</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{log.user_message}</p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-violet-500 dark:text-violet-400 mb-1.5 uppercase tracking-wide">Bot answered</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{log.bot_response}</p>
            </div>
          </div>
          {log.status === 'ERROR' && log.error_message && (
             <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-900/30">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5 uppercase tracking-wide">Error Details</p>
                <p className="text-xs text-red-500 dark:text-red-300 font-mono break-words">{log.error_message}</p>
             </div>
          )}
          {log.session_id && (
            <p className="text-xs text-gray-400">Session: <code className="font-mono">{log.session_id}</code></p>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => onDelete(log.id)}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<ChatLogStats | null>(null);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Date helpers
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const daysAgoStr = (n: number) => {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const [dateFrom, setDateFrom] = useState(todayStr);   // default = today
  const [dateTo, setDateTo] = useState(todayStr);
  const [datePreset, setDatePreset] = useState<'today' | '7d' | '30d' | 'all' | 'custom'>('today');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ANSWERED' | 'UNANSWERED' | 'ERROR'>('all');

  const applyPreset = (preset: typeof datePreset) => {
    setDatePreset(preset);
    setShowCustomRange(false);
    if (preset === 'today') { setDateFrom(todayStr()); setDateTo(todayStr()); }
    if (preset === '7d') { setDateFrom(daysAgoStr(6)); setDateTo(todayStr()); }
    if (preset === '30d') { setDateFrom(daysAgoStr(29)); setDateTo(todayStr()); }
    if (preset === 'all') { setDateFrom(''); setDateTo(''); }
    if (preset === 'custom') { setShowCustomRange(true); }
  };

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const s = await apiService.getChatLogStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params: Parameters<typeof apiService.getChatLogs>[0] = {
        page,
        page_size: PAGE_SIZE,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await apiService.getChatLogs(params);
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  }, [page, debouncedSearch, dateFrom, dateTo, statusFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo, statusFilter]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this conversation entry?')) return;
    setDeletingId(id);
    try {
      await apiService.deleteChatLog(id);
      setLogs(prev => prev.filter(l => l.id !== id));
      setTotal(prev => prev - 1);
      fetchStats(); // refresh stats after deletion
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  // CSV Export
  const handleExport = async () => {
    try {
      // Fetch all (no pagination) for export
      const all = await apiService.getChatLogs({
        page: 1, page_size: 10000,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      const header = ['Date', 'User Message', 'Bot Response', 'Status', 'Session ID', 'Error Details'];
      const rows = all.items.map(l => [
        new Date(l.created_at).toISOString(),
        `"${l.user_message.replace(/"/g, '""')}"`,
        `"${l.bot_response.replace(/"/g, '""')}"`,
        l.status,
        l.session_id || '',
        l.error_message ? `"${l.error_message.replace(/"/g, '""')}"` : ''
      ]);
      const csv = [header, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const maxKeywordCount = stats?.top_keywords?.[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-violet-500" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analyse what your users are asking — real public chat logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchStats(); fetchLogs(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Messages"
          value={loadingStats ? '—' : (stats?.total_messages ?? 0).toLocaleString()}
          icon={<MessageSquare className="w-6 h-6 text-violet-600 dark:text-violet-400" />}
          accent="bg-violet-100 dark:bg-violet-900/30"
        />
        <StatCard
          label="Messages Today"
          value={loadingStats ? '—' : (stats?.today_messages ?? 0).toLocaleString()}
          icon={<Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          accent="bg-blue-100 dark:bg-blue-900/30"
          sub="Conversations started today"
        />
        <StatCard
          label="Answer Rate"
          value={loadingStats ? '—' : `${stats?.rag_hit_rate ?? 0}%`}
          icon={<Target className="w-6 h-6 text-green-600 dark:text-green-400" />}
          accent="bg-green-100 dark:bg-green-900/30"
          sub="Questions answered from your documents"
        />
      </div>

      {/* Top Keywords */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Topics Users Ask About</h2>
        </div>
        {loadingStats ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : stats?.top_keywords && stats.top_keywords.length > 0 ? (
          <div className="space-y-3">
            {stats.top_keywords.map((kw, i) => (
              <KeywordBar key={kw.word} word={kw.word} count={kw.count} max={maxKeywordCount} rank={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No conversations yet. Keywords will appear once users start chatting.
          </p>
        )}
      </div>

      {/* Conversation List */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20">
        {/* Filter bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          {/* Date preset buttons */}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400 mr-1" />
            {(['today', '7d', '30d', 'all', 'custom'] as const).map(p => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${datePreset === p
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : p === 'all' ? 'All Time' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Custom range — only shown when Custom is selected */}
          {showCustomRange && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                className="text-sm bg-transparent text-gray-900 dark:text-white focus:outline-none"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
                className="text-sm bg-transparent text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          )}

          {/* Answer status filter */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 ml-auto">
            {(['all', 'ANSWERED', 'UNANSWERED', 'ERROR'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${statusFilter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
              >
                {f === 'all' ? 'All' : f === 'ANSWERED' ? 'Answered' : f === 'UNANSWERED' ? 'Unanswered' : 'Error'}
              </button>
            ))}
          </div>
        </div>

        {/* Log count */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {loadingLogs ? 'Loading…' : `${total.toLocaleString()} conversation${total !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Rows */}
        <div className="p-4 space-y-2">
          {loadingLogs ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl h-16" />
            ))
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">No conversations found</p>
              {(search || dateFrom || dateTo || statusFilter !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); }}
                  className="mt-2 text-xs text-violet-500 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            logs.map(log => (
              <ConversationRow
                key={log.id}
                log={log}
                onDelete={handleDelete}
                deleting={deletingId === log.id}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pageNum = start + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${pageNum === page
                      ? 'bg-violet-600 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;