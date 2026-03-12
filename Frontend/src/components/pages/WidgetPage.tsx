import React, { useState, useEffect, useRef } from 'react';
import {
  Code2, Copy, CheckCheck, Plus, X, Bot, Send,
  LayoutTemplate, Palette, MessageSquare, ChevronDown,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { WidgetConfig, WidgetConfigUpdate } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// ── Live Preview Component ────────────────────────────────────────────────────

interface PreviewProps {
  config: WidgetConfigUpdate & { bot_name: string; welcome_message: string; primary_color: string; button_position: string; quick_replies: string[] };
}

const WidgetPreview: React.FC<PreviewProps> = ({ config }) => {
  const [messages, setMessages] = useState<{ text: string; role: 'bot' | 'user' }[]>([]);
  const [input, setInput] = useState('');
  const [quickRepliesVisible, setQuickRepliesVisible] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ text: config.welcome_message, role: 'bot' }]);
    setQuickRepliesVisible(true);
    setInitialized(true);
  }, [config.welcome_message]);

  useEffect(() => {
    if (initialized) {
      setQuickRepliesVisible(true);
    }
  }, [config.quick_replies]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setQuickRepliesVisible(false);
    setMessages(prev => [...prev, { text, role: 'user' }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { text: 'This is a preview — real responses come from your AI backend!', role: 'bot' }]);
    }, 800);
  };

  const color = config.primary_color || '#7c3aed';

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" style={{ width: 320, height: 480 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: color }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm">🤖</div>
          <span className="font-semibold text-sm">{config.bot_name}</span>
        </div>
        <ChevronDown className="w-4 h-4 opacity-80" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-white dark:bg-gray-900">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'bot' && (
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs flex-shrink-0">🤖</div>
            )}
            <div
              className="max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-snug"
              style={
                msg.role === 'bot'
                  ? { background: color, color: '#fff', borderBottomLeftRadius: 4 }
                  : { background: '#f3f4f6', color: '#111', borderBottomRightRadius: 4 }
              }
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {quickRepliesVisible && config.quick_replies.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pb-2 bg-white dark:bg-gray-900">
          {config.quick_replies.map((label, i) => (
            <button
              key={i}
              onClick={() => { setQuickRepliesVisible(false); handleSend(label); }}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{ borderColor: color, color: color }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = color; (e.target as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = color; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend(input)}
          placeholder="Type here and press enter.."
          className="flex-1 text-xs outline-none bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400"
        />
        <button
          onClick={() => handleSend(input)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ background: color }}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#7c3aed', '#6d28d9', '#4f46e5', '#2563eb',
  '#0891b2', '#059669', '#d97706', '#dc2626',
  '#db2777', '#7c3aed',
];

const WidgetPage: React.FC = () => {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [form, setForm] = useState<WidgetConfigUpdate>({});
  const [newChip, setNewChip] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await apiService.getWidgetConfig();
      setConfig(data);
      setForm({
        bot_name: data.bot_name,
        welcome_message: data.welcome_message,
        primary_color: data.primary_color,
        button_position: data.button_position,
        quick_replies: [...data.quick_replies],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load widget configuration');
    } finally {
      setLoading(false);
    }
  };

  const previewConfig = {
    bot_name: form.bot_name || config?.bot_name || 'Customer Support',
    welcome_message: form.welcome_message || config?.welcome_message || 'Hi! How can we help?',
    primary_color: form.primary_color || config?.primary_color || '#7c3aed',
    button_position: form.button_position || config?.button_position || 'bottom-right',
    quick_replies: form.quick_replies || config?.quick_replies || [],
  };

  const handleSave = async () => {
    const payload: WidgetConfigUpdate = {};
    if (form.bot_name !== config?.bot_name) payload.bot_name = form.bot_name;
    if (form.welcome_message !== config?.welcome_message) payload.welcome_message = form.welcome_message;
    if (form.primary_color !== config?.primary_color) payload.primary_color = form.primary_color;
    if (form.button_position !== config?.button_position) payload.button_position = form.button_position;
    if (JSON.stringify(form.quick_replies) !== JSON.stringify(config?.quick_replies)) payload.quick_replies = form.quick_replies;

    if (Object.keys(payload).length === 0) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updated = await apiService.updateWidgetConfig(payload);
      setConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const addChip = () => {
    const trimmed = newChip.trim();
    if (!trimmed) return;
    const current = form.quick_replies || [];
    if (current.includes(trimmed)) return;
    setForm(f => ({ ...f, quick_replies: [...(f.quick_replies || []), trimmed] }));
    setNewChip('');
  };

  const removeChip = (index: number) => {
    setForm(f => ({ ...f, quick_replies: (f.quick_replies || []).filter((_, i) => i !== index) }));
  };

  const embedScript = `<script src="${API_BASE_URL}/widget/widget.js?token=${config?.widget_token || 'YOUR_WIDGET_TOKEN'}" async></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <LayoutTemplate className="w-6 h-6 text-violet-600" />
          Chat Widget
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure your embeddable chatbot widget and copy the script to add it to any website.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Config Form ── */}
        <div className="space-y-5">
          {/* Appearance card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-violet-500" /> Appearance
            </h2>

            {/* Bot name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bot Name</label>
              <input
                type="text"
                value={form.bot_name || ''}
                onChange={e => setForm(f => ({ ...f, bot_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Customer Support"
              />
            </div>

            {/* Welcome message */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Welcome Message</label>
              <input
                type="text"
                value={form.welcome_message || ''}
                onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Hi! How can we help?"
              />
            </div>

            {/* Primary color */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Primary Color</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, primary_color: c }))}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: (form.primary_color || config?.primary_color) === c ? '#1f2937' : 'transparent',
                    }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color || '#7c3aed'}
                  onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  className="w-9 h-9 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={form.primary_color || ''}
                  onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  placeholder="#7c3aed"
                />
              </div>
            </div>

            {/* Button position */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Button Position</label>
              <div className="flex gap-2">
                {(['bottom-right', 'bottom-left'] as const).map(pos => (
                  <button
                    key={pos}
                    onClick={() => setForm(f => ({ ...f, button_position: pos }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${(form.button_position || 'bottom-right') === pos
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    {pos === 'bottom-right' ? '↘ Bottom Right' : '↙ Bottom Left'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick replies card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-500" /> Quick Reply Buttons
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Shown as clickable chips when the chat first opens.
            </p>

            {/* Chips list */}
            <div className="flex flex-wrap gap-2 min-h-[36px]">
              {(form.quick_replies || []).map((chip, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border"
                  style={{ borderColor: previewConfig.primary_color, color: previewConfig.primary_color }}
                >
                  {chip}
                  <button onClick={() => removeChip(i)} className="ml-1 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(form.quick_replies || []).length === 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">No quick replies yet</span>
              )}
            </div>

            {/* Add chip input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newChip}
                onChange={e => setNewChip(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChip()}
                placeholder="Add a quick reply..."
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={addChip}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1"
                style={{ background: previewConfig.primary_color }}
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: previewConfig.primary_color }}
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Saving…</>
            ) : saveSuccess ? (
              <><CheckCheck className="w-4 h-4" /> Saved!</>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        {/* ── Preview + Embed Script ── */}
        <div className="space-y-5">
          {/* Live preview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-violet-500" /> Live Preview
            </h2>
            <div className="flex justify-center">
              <WidgetPreview config={previewConfig} />
            </div>

            {/* Floating button preview */}
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md"
                style={{ background: previewConfig.primary_color }}
              >
                <Bot className="w-5 h-5" />
              </div>
              <span>
                Floating button appears at the <strong>{previewConfig.button_position}</strong> of your website.
              </span>
            </div>
          </div>

          {/* Embed script */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <Code2 className="w-4 h-4 text-violet-500" /> Embed Script
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Paste this single line inside the <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">&lt;body&gt;</code> tag of your website.
            </p>

            <div className="relative group">
              <pre className="bg-gray-950 dark:bg-gray-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all border border-gray-800">
                {embedScript}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl text-xs text-violet-700 dark:text-violet-300 space-y-1">
              <p className="font-semibold">How to use:</p>
              <ol className="list-decimal list-inside space-y-0.5 pl-1">
                <li>Copy the script above</li>
                <li>Paste it just before <code className="font-mono">&lt;/body&gt;</code> in your HTML</li>
                <li>The chat button will appear automatically on your site</li>
                <li>Save config here first — the widget reads your settings live</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetPage;
