import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Plus, Edit2, Trash2,
  Save, X, Eye, EyeOff, Cpu, MessageSquare, Key,
  Bot, Sparkles, Search, ChevronDown
} from 'lucide-react';
import { apiService } from '../../services/api';
import {
  MasterSettings, MasterSettingsCreate, MasterSettingsUpdate,
  AIConfigUpdate,
} from '../../types';

// ── Supported models ──────────────────────────────────────────────────────────

const SUPPORTED_MODELS = [
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic', description: 'Latest Anthropic Sonnet' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'OpenAI flagship model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Fast & cost-effective' },
];

const API_KEY_PROVIDERS = [
  { value: 'OPENAI_API_KEY', label: 'OpenAI', icon: Bot },
  { value: 'ANTHROPIC_API_KEY', label: 'Anthropic', icon: Cpu },
  { value: 'GOOGLE_API_KEY', label: 'Google', icon: Search },
  { value: 'GEMINI_API_KEY', label: 'Gemini', icon: Sparkles },
];

// ── API Keys Tab ──────────────────────────────────────────────────────────────

const APIKeysTab: React.FC = () => {
  const [settings, setSettings] = useState<MasterSettings[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSetting, setEditingSetting] = useState<MasterSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCustomKey, setIsCustomKey] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<MasterSettingsCreate>({
    name: '',
    value: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSettings();
  }, [includeInactive]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProvider = (value: string) => {
    if (value === 'CUSTOM') {
      setIsCustomKey(true);
      setFormData({ ...formData, name: '' });
    } else {
      setIsCustomKey(false);
      setFormData({ ...formData, name: value });
    }
    setIsDropdownOpen(false);
  };

  const selectedProvider = API_KEY_PROVIDERS.find(p => p.value === formData.name);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getMasterSettings(includeInactive);
      setSettings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.value.trim()) {
      setError('Name and value are required');
      return;
    }
    setError(null);
    try {
      const newSetting = await apiService.createMasterSetting(formData);
      setSettings([...settings, newSetting]);
      setFormData({ name: '', value: '', is_active: true });
      setShowCreateForm(false);
      setIsCustomKey(false);
      setIsDropdownOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create setting');
    }
  };

  const handleUpdate = async () => {
    if (!editingSetting) return;
    const update: MasterSettingsUpdate = { value: formData.value, is_active: formData.is_active };
    setError(null);
    try {
      const updated = await apiService.updateMasterSetting(editingSetting.name, update);
      setSettings(settings.map(s => s.id === updated.id ? updated : s));
      setEditingSetting(null);
      setFormData({ name: '', value: '', is_active: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to update setting');
    }
  };

  const handleDelete = async (settingName: string) => {
    if (!confirm(`Delete setting "${settingName}"?`)) return;
    setError(null);
    try {
      await apiService.deleteMasterSetting(settingName);
      setSettings(settings.filter(s => s.name !== settingName));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete setting');
    }
  };

  const handleToggleStatus = async (setting: MasterSettings) => {
    setError(null);
    try {
      const update: MasterSettingsUpdate = { value: setting.value, is_active: !setting.is_active };
      const updated = await apiService.updateMasterSetting(setting.name, update);
      setSettings(settings.map(s => s.id === updated.id ? updated : s));
    } catch (err: any) {
      setError(err?.message || 'Failed to update setting status');
    }
  };

  const startEdit = (setting: MasterSettings) => {
    setEditingSetting(setting);
    setFormData({ name: setting.name, value: setting.value, is_active: setting.is_active });
    setShowCreateForm(false);
    const isStandard = API_KEY_PROVIDERS.some(p => p.value === setting.name);
    setIsCustomKey(!isStandard);
  };

  const cancelEdit = () => {
    setEditingSetting(null);
    setFormData({ name: '', value: '', is_active: true });
    setShowCreateForm(false);
    setIsCustomKey(false);
    setIsDropdownOpen(false);
  };

  const maskValue = (value: string) => {
    if (value.length <= 4) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Show inactive</span>
        </label>
        <button
          onClick={() => {
            cancelEdit();
            if (!showCreateForm) {
              const availableProviders = API_KEY_PROVIDERS.filter(p => !settings.some(s => s.name === p.value));
              const defaultName = availableProviders.length > 0 ? availableProviders[0].value : 'CUSTOM';
              setFormData(prev => ({ ...prev, name: defaultName === 'CUSTOM' ? '' : defaultName }));
              setIsCustomKey(defaultName === 'CUSTOM');
            }
            setShowCreateForm(!showCreateForm);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New API Key</span>
        </button>
      </div>

      {/* Create / Edit Form */}
      {(showCreateForm || editingSetting) && (
        <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {editingSetting ? 'Edit Setting' : 'Add New API Key'}
          </h3>
          <div className="space-y-4">
            {!editingSetting ? (
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider / Key Name</label>
                {!isCustomKey ? (
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors shadow-sm cursor-pointer"
                  >
                    {selectedProvider ? (
                      <div className="flex items-center space-x-2">
                        {React.createElement(selectedProvider.icon, { className: "w-4 h-4 text-blue-500" })}
                        <span className="font-medium">{selectedProvider.label}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">Select a provider...</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., MY_CUSTOM_API_KEY"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomKey(false);
                        setFormData({ ...formData, name: '' });
                      }}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {isDropdownOpen && !isCustomKey && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg  max-h-60 overflow-auto">
                    <div className="p-1">
                      {API_KEY_PROVIDERS.filter(p => !settings.some(s => s.name === p.value)).map(provider => (
                        <button
                          key={provider.value}
                          type="button"
                          onClick={() => handleSelectProvider(provider.value)}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors"
                        >
                          {React.createElement(provider.icon, { className: "w-4 h-4 text-gray-400" })}
                          <span className="font-medium">{provider.label}</span>
                        </button>
                      ))}
                      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                      <button
                        type="button"
                        onClick={() => handleSelectProvider('CUSTOM')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors"
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Custom Key...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Name</label>
                <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 text-sm cursor-not-allowed flex items-center space-x-2">
                  {selectedProvider ? (
                    <>
                      {React.createElement(selectedProvider.icon, { className: "w-4 h-4" })}
                      <span>{selectedProvider.label}</span>
                    </>
                  ) : (
                    <span>{editingSetting?.name}</span>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
              <textarea
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                placeholder="Paste your API key here"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Active (used for API calls)</label>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={editingSetting ? handleUpdate : handleCreate}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{editingSetting ? 'Update' : 'Save'}</span>
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      ) : settings.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <Key className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No API keys configured yet. Add your first key above.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">Provider / Key Name</th>
                  <th scope="col" className="px-6 py-3 font-medium">Value</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {settings.map(setting => {
                  const provider = API_KEY_PROVIDERS.find(p => p.value === setting.name);
                  return (
                    <tr
                      key={setting.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${setting.is_active ? '' : 'opacity-70 bg-gray-50/50 dark:bg-gray-800/50'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${setting.is_active ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                            {provider ? React.createElement(provider.icon, { className: "w-4 h-4" }) : <Key className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {provider ? provider.label : setting.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-0.5 mt-0.5">
                              <span>Updated {new Date(setting.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded font-mono text-gray-800 dark:text-gray-200">
                            {showValues[setting.id] ? setting.value : maskValue(setting.value)}
                          </code>
                          <button
                            onClick={() => setShowValues(prev => ({ ...prev, [setting.id]: !prev[setting.id] }))}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            title={showValues[setting.id] ? "Hide value" : "Show value"}
                          >
                            {showValues[setting.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <label className="relative inline-flex items-center cursor-pointer" title={setting.is_active ? "Active (Click to deactivate)" : "Inactive (Click to activate)"}>
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={setting.is_active}
                            onChange={() => handleToggleStatus(setting)}
                          />
                          <div className={`w-9 h-5 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 transition-colors ${setting.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${setting.is_active ? 'after:translate-x-full after:border-white' : ''}`}></div>
                        </label>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => startEdit(setting)}
                            title="Edit"
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(setting.name)}
                            title="Delete"
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── AI Settings Tab ───────────────────────────────────────────────────────────

const RAG_DEFAULT_PERSONAS = [
  "You are a professional company chatbot."
];

const DEFAULT_GENERAL_PROMPTS = [
  "You are a helpful and friendly assistant. Answer the user's question clearly and concisely."
];

const DEFAULT_NOT_FOUND_MESSAGES = [
  "I'm sorry, I couldn't find relevant information about that in our documents. Please try rephrasing your question, or contact our support team for assistance."
];

const DEFAULT_AI_CONFIG: AIConfigUpdate = {
  model_name: 'claude-sonnet-4-5-20250929',
  model_provider: 'anthropic',
  max_tokens: 1000,
  temperature: 0.7,
  rag_system_prompt:
    'You are a professional company chatbot.\n\nRules:\n- Answer briefly (maximum 4-5 lines).\n- Keep responses clear and simple.\n- Do not give detailed explanations.\n- Do not format in large sections.\n- Give direct answers only.\n\nUse this context to answer:\n{rag_context}',
  general_system_prompt:
    'You are a helpful and friendly assistant. Answer the user\'s question clearly and concisely.',
  rag_not_found_message:
    "I'm sorry, I couldn't find relevant information about that in our documents. Please try rephrasing your question, or contact our support team for assistance.",
};

const RAG_DEFAULT_OPTIONS = [
  "Answer briefly (maximum 4-5 lines).",
  "Keep responses clear and simple.",
  "Do not give detailed explanations.",
  "Do not format in large sections.",
  "Give direct answers only."
];

const AISettingsTab: React.FC = () => {
  const [config, setConfig] = useState<AIConfigUpdate>(DEFAULT_AI_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(RAG_DEFAULT_PERSONAS);
  const [customPersonas, setCustomPersonas] = useState<string[]>([]);
  const [newPersonaInput, setNewPersonaInput] = useState('');

  const [selectedRules, setSelectedRules] = useState<string[]>(RAG_DEFAULT_OPTIONS);
  const [customRules, setCustomRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState('');

  const [selectedGeneralPrompts, setSelectedGeneralPrompts] = useState<string[]>(DEFAULT_GENERAL_PROMPTS);
  const [customGeneralPrompts, setCustomGeneralPrompts] = useState<string[]>([]);
  const [newGeneralPromptInput, setNewGeneralPromptInput] = useState('');

  const [selectedNotFoundMessages, setSelectedNotFoundMessages] = useState<string[]>(DEFAULT_NOT_FOUND_MESSAGES);
  const [customNotFoundMessages, setCustomNotFoundMessages] = useState<string[]>([]);
  const [newNotFoundMessageInput, setNewNotFoundMessageInput] = useState('');

  const [ragTail, setRagTail] = useState('Use this context to answer:\n{rag_context}');

  const CUSTOM_PERSONAS_KEY = 'rag_custom_personas';
  const CUSTOM_RULES_KEY = 'rag_custom_rules';
  const CUSTOM_GENERAL_PROMPTS_KEY = 'rag_custom_general_prompts';
  const CUSTOM_NOT_FOUND_MESSAGES_KEY = 'rag_custom_not_found_messages';

  useEffect(() => {
    loadConfig();
  }, []);

  const parseStringList = (
    prompt: string,
    defaultOptions: string[],
    customKey: string,
    setSelected: (selected: string[]) => void,
    setCustom: (custom: string[]) => void
  ) => {
    if (!prompt) {
      setSelected([]);
      return;
    }
    const lines = prompt.split('\n').map(p => p.trim()).filter(Boolean);
    const savedCustom: string[] = JSON.parse(localStorage.getItem(customKey) || '[]');
    
    if (lines.length > 0) {
      const selectedArr: string[] = [];
      const checkedCustomArr: string[] = [];

      lines.forEach((p: string) => {
        if (defaultOptions.includes(p)) {
          selectedArr.push(p);
        } else {
          checkedCustomArr.push(p);
        }
      });

      const mergedCustom = [...new Set([...savedCustom, ...checkedCustomArr])];
      setCustom(mergedCustom);
      setSelected([...selectedArr, ...checkedCustomArr]);
    } else {
      setCustom(savedCustom);
      setSelected([]);
    }
  };

  const parseRagPrompt = (prompt: string) => {
    if (!prompt) return;

    let personaStr = 'You are a professional company chatbot.';
    let tail = 'Use this context to answer:\n{rag_context}';
    let rulesList: string[] = [];

    const rulesMatch = prompt.match(/Rules:\n([\s\S]*?)(?=\n\nUse this context to answer:|\n\n\{rag_context\}|$)/);
    const tailMatch = prompt.match(/(Use this context to answer:[\s\S]*)/);

    if (rulesMatch) {
      personaStr = prompt.substring(0, rulesMatch.index).trim();
      const rulesStr = rulesMatch[1];
      rulesList = rulesStr.split('\n').map((r: string) => r.trim()).filter((r: string) => r.startsWith('-')).map((r: string) => r.substring(1).trim());
    } else if (tailMatch) {
      personaStr = prompt.substring(0, tailMatch.index).trim();
    } else {
      personaStr = prompt.trim();
    }

    if (tailMatch) {
      tail = tailMatch[1].trim();
    }

    setRagTail(tail);

    const personaLines = personaStr.split('\n').map(p => p.trim()).filter(Boolean);
    const savedCustomPersonas: string[] = JSON.parse(localStorage.getItem(CUSTOM_PERSONAS_KEY) || '[]');
    
    if (personaLines.length > 0) {
      const selectedP: string[] = [];
      const checkedCustomP: string[] = [];

      personaLines.forEach((p: string) => {
        if (RAG_DEFAULT_PERSONAS.includes(p)) {
          selectedP.push(p);
        } else {
          checkedCustomP.push(p);
        }
      });

      const mergedCustomP = [...new Set([...savedCustomPersonas, ...checkedCustomP])];
      setCustomPersonas(mergedCustomP);
      setSelectedPersonas([...selectedP, ...checkedCustomP]);
    } else {
      setCustomPersonas(savedCustomPersonas);
      setSelectedPersonas([]);
    }

    if (rulesList.length > 0) {
      const selected: string[] = [];
      const checkedCustom: string[] = [];

      rulesList.forEach((r: string) => {
        if (RAG_DEFAULT_OPTIONS.includes(r)) {
          selected.push(r);
        } else {
          checkedCustom.push(r);
        }
      });

      // Restore full custom rules list from localStorage (includes unchecked ones too)
      const savedCustomRules: string[] = JSON.parse(localStorage.getItem(CUSTOM_RULES_KEY) || '[]');
      // Merge: localStorage rules + any new custom rules found in prompt
      const mergedCustom = [...new Set([...savedCustomRules, ...checkedCustom])];

      setCustomRules(mergedCustom);
      // Only the rules present in prompt are "checked"
      setSelectedRules([...selected, ...checkedCustom]);
    } else {
      // No rules in prompt — but still restore custom rule list from localStorage (all unchecked)
      const savedCustomRules: string[] = JSON.parse(localStorage.getItem(CUSTOM_RULES_KEY) || '[]');
      setCustomRules(savedCustomRules);
      setSelectedRules([]);
    }
  };

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getAIConfig();
      setConfig({
        model_name: data.model_name,
        model_provider: data.model_provider,
        max_tokens: data.max_tokens,
        temperature: data.temperature,
        rag_system_prompt: data.rag_system_prompt,
        general_system_prompt: data.general_system_prompt,
        rag_not_found_message: data.rag_not_found_message,
      });
      parseRagPrompt(data.rag_system_prompt);
      parseStringList(data.general_system_prompt, DEFAULT_GENERAL_PROMPTS, CUSTOM_GENERAL_PROMPTS_KEY, setSelectedGeneralPrompts, setCustomGeneralPrompts);
      parseStringList(data.rag_not_found_message, DEFAULT_NOT_FOUND_MESSAGES, CUSTOM_NOT_FOUND_MESSAGES_KEY, setSelectedNotFoundMessages, setCustomNotFoundMessages);
    } catch (err: any) {
      setError(err?.message || 'Failed to load AI config');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    let assembled = '';
    
    const allPersonas = [
      ...RAG_DEFAULT_PERSONAS.filter(p => selectedPersonas.includes(p)),
      ...customPersonas.filter(p => selectedPersonas.includes(p))
    ];
    
    if (allPersonas.length > 0) {
      assembled = allPersonas.join('\n');
    }

    if (assembled) assembled += '\n\n';

    const allRules = [
      ...RAG_DEFAULT_OPTIONS.filter(r => selectedRules.includes(r)),
      ...customRules.filter(r => selectedRules.includes(r))
    ];

    if (allRules.length > 0) {
      assembled += 'Rules:\n';
      allRules.forEach(r => {
        assembled += `- ${r}\n`;
      });
      assembled += '\n';
    }

    assembled += ragTail;

    const allGeneral = [
      ...DEFAULT_GENERAL_PROMPTS.filter(p => selectedGeneralPrompts.includes(p)),
      ...customGeneralPrompts.filter(p => selectedGeneralPrompts.includes(p))
    ];
    const generalStr = allGeneral.join('\n');

    const allNotFound = [
      ...DEFAULT_NOT_FOUND_MESSAGES.filter(p => selectedNotFoundMessages.includes(p)),
      ...customNotFoundMessages.filter(p => selectedNotFoundMessages.includes(p))
    ];
    const notFoundStr = allNotFound.join('\n');

    setConfig(prev => {
      if (prev.rag_system_prompt === assembled && prev.general_system_prompt === generalStr && prev.rag_not_found_message === notFoundStr) return prev;
      return { ...prev, rag_system_prompt: assembled, general_system_prompt: generalStr, rag_not_found_message: notFoundStr };
    });
  }, [selectedPersonas, customPersonas, selectedRules, customRules, ragTail, selectedGeneralPrompts, customGeneralPrompts, selectedNotFoundMessages, customNotFoundMessages, isLoading]);

  const handleModelChange = (modelId: string) => {
    const model = SUPPORTED_MODELS.find(m => m.id === modelId);
    setConfig(prev => ({
      ...prev,
      model_name: modelId,
      model_provider: model?.provider || 'openai',
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiService.updateAIConfig(config);
      // Persist full custom rules list (including unchecked) to localStorage
      localStorage.setItem(CUSTOM_RULES_KEY, JSON.stringify(customRules));
      localStorage.setItem(CUSTOM_PERSONAS_KEY, JSON.stringify(customPersonas));
      localStorage.setItem(CUSTOM_GENERAL_PROMPTS_KEY, JSON.stringify(customGeneralPrompts));
      localStorage.setItem(CUSTOM_NOT_FOUND_MESSAGES_KEY, JSON.stringify(customNotFoundMessages));
      setSuccess('AI settings saved successfully. Changes take effect on the next chat request.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save AI config');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading AI config...</p>
      </div>
    );
  }

  const selectedModel = SUPPORTED_MODELS.find(m => m.id === config.model_name);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
        </div>
      )}

      {/* Model Selection */}
      <div className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Model Configuration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI Model</label>
            <select
              value={config.model_name}
              onChange={e => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <optgroup label="Anthropic">
                {SUPPORTED_MODELS.filter(m => m.provider === 'anthropic').map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {m.description}</option>
                ))}
              </optgroup>
              <optgroup label="OpenAI">
                {SUPPORTED_MODELS.filter(m => m.provider === 'openai').map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {m.description}</option>
                ))}
              </optgroup>
            </select>
            {selectedModel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Provider: <span className="font-medium capitalize">{selectedModel.provider}</span>
                {' — '}requires <span className="font-mono">
                  {selectedModel.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}
                </span> in API Keys
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Tokens <span className="text-gray-400 font-normal">(100–8000)</span>
            </label>
            <input
              type="number"
              min={100}
              max={8000}
              value={config.max_tokens}
              onChange={e => setConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 1000 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temperature: <span className="text-blue-600 dark:text-blue-400 font-semibold">{Number(config.temperature).toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={config.temperature}
              onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.0 — Deterministic</span>
              <span>1.0 — Balanced</span>
              <span>2.0 — Creative</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Prompts */}
      <div className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">System Prompts</h3>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              General Assistant Prompt
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Used when no RAG documents are active — the AI acts as a general assistant.
            </p>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="space-y-3 pl-1">
                {DEFAULT_GENERAL_PROMPTS.map(prompt => (
                  <label key={prompt} className="flex items-start space-x-3 cursor-pointer group">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedGeneralPrompts.includes(prompt)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGeneralPrompts([...selectedGeneralPrompts, prompt]);
                          } else {
                            setSelectedGeneralPrompts(selectedGeneralPrompts.filter(p => p !== prompt));
                          }
                        }}
                        className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{prompt}</span>
                    </div>
                  </label>
                ))}

                {customGeneralPrompts.map((prompt, idx) => (
                  <div key={`custom-general-${idx}`} className="flex items-start space-x-3 group">
                    <label className="flex items-start space-x-3 cursor-pointer flex-1">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={selectedGeneralPrompts.includes(prompt)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGeneralPrompts([...selectedGeneralPrompts, prompt]);
                            } else {
                              setSelectedGeneralPrompts(selectedGeneralPrompts.filter(p => p !== prompt));
                            }
                          }}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{prompt}</span>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomGeneralPrompts(customGeneralPrompts.filter((_, i) => i !== idx));
                        setSelectedGeneralPrompts(selectedGeneralPrompts.filter(p => p !== prompt));
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      title="Remove custom prompt"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newGeneralPromptInput}
                      onChange={(e) => setNewGeneralPromptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newGeneralPromptInput.trim()) {
                          e.preventDefault();
                          const p = newGeneralPromptInput.trim();
                          if (!customGeneralPrompts.includes(p) && !DEFAULT_GENERAL_PROMPTS.includes(p)) {
                            setCustomGeneralPrompts([...customGeneralPrompts, p]);
                            setSelectedGeneralPrompts([...selectedGeneralPrompts, p]);
                          }
                          setNewGeneralPromptInput('');
                        }
                      }}
                      placeholder="Add a new custom general prompt..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newGeneralPromptInput.trim()) {
                          const p = newGeneralPromptInput.trim();
                          if (!customGeneralPrompts.includes(p) && !DEFAULT_GENERAL_PROMPTS.includes(p)) {
                            setCustomGeneralPrompts([...customGeneralPrompts, p]);
                            setSelectedGeneralPrompts([...selectedGeneralPrompts, p]);
                          }
                          setNewGeneralPromptInput('');
                        }
                      }}
                      disabled={!newGeneralPromptInput.trim()}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deserve Output (Persona & Rules)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Used when RAG context is found. Define the persona and rules for answering.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Base Persona
              </label>
              <div className="space-y-3 pl-1 pb-4 border-b border-gray-200 dark:border-gray-700">
                {RAG_DEFAULT_PERSONAS.map(persona => (
                  <label key={persona} className="flex items-start space-x-3 cursor-pointer group">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedPersonas.includes(persona)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPersonas([...selectedPersonas, persona]);
                          } else {
                            setSelectedPersonas(selectedPersonas.filter(p => p !== persona));
                          }
                        }}
                        className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{persona}</span>
                    </div>
                  </label>
                ))}

                {customPersonas.map((persona, idx) => (
                  <div key={`custom-persona-${idx}`} className="flex items-start space-x-3 group">
                    <label className="flex items-start space-x-3 cursor-pointer flex-1">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={selectedPersonas.includes(persona)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPersonas([...selectedPersonas, persona]);
                            } else {
                              setSelectedPersonas(selectedPersonas.filter(p => p !== persona));
                            }
                          }}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{persona}</span>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPersonas(customPersonas.filter((_, i) => i !== idx));
                        setSelectedPersonas(selectedPersonas.filter(p => p !== persona));
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      title="Remove custom persona"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="pt-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newPersonaInput}
                      onChange={(e) => setNewPersonaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newPersonaInput.trim()) {
                          e.preventDefault();
                          const p = newPersonaInput.trim();
                          if (!customPersonas.includes(p) && !RAG_DEFAULT_PERSONAS.includes(p)) {
                            setCustomPersonas([...customPersonas, p]);
                            setSelectedPersonas([...selectedPersonas, p]);
                          }
                          setNewPersonaInput('');
                        }
                      }}
                      placeholder="Add a new custom persona..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newPersonaInput.trim()) {
                          const p = newPersonaInput.trim();
                          if (!customPersonas.includes(p) && !RAG_DEFAULT_PERSONAS.includes(p)) {
                            setCustomPersonas([...customPersonas, p]);
                            setSelectedPersonas([...selectedPersonas, p]);
                          }
                          setNewPersonaInput('');
                        }
                      }}
                      disabled={!newPersonaInput.trim()}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-900 dark:text-white mt-4 mb-3">
                Rules
              </label>
              <div className="space-y-3 pl-1">
                {RAG_DEFAULT_OPTIONS.map(rule => (
                  <label key={rule} className="flex items-start space-x-3 cursor-pointer group">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedRules.includes(rule)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRules([...selectedRules, rule]);
                          } else {
                            setSelectedRules(selectedRules.filter(r => r !== rule));
                          }
                        }}
                        className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{rule}</span>
                    </div>
                  </label>
                ))}

                {customRules.map((rule, idx) => (
                  <div key={`custom-${idx}`} className="flex items-start space-x-3 group">
                    <label className="flex items-start space-x-3 cursor-pointer flex-1">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={selectedRules.includes(rule)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRules([...selectedRules, rule]);
                            } else {
                              setSelectedRules(selectedRules.filter(r => r !== rule));
                            }
                          }}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{rule}</span>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomRules(customRules.filter((_, i) => i !== idx));
                        setSelectedRules(selectedRules.filter(r => r !== rule));
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      title="Remove custom rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newRuleInput}
                      onChange={(e) => setNewRuleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newRuleInput.trim()) {
                          e.preventDefault();
                          const rule = newRuleInput.trim();
                          if (!customRules.includes(rule) && !RAG_DEFAULT_OPTIONS.includes(rule)) {
                            setCustomRules([...customRules, rule]);
                            setSelectedRules([...selectedRules, rule]);
                          }
                          setNewRuleInput('');
                        }
                      }}
                      placeholder="Add a new custom rule..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newRuleInput.trim()) {
                          const rule = newRuleInput.trim();
                          if (!customRules.includes(rule) && !RAG_DEFAULT_OPTIONS.includes(rule)) {
                            setCustomRules([...customRules, rule]);
                            setSelectedRules([...selectedRules, rule]);
                          }
                          setNewRuleInput('');
                        }
                      }}
                      disabled={!newRuleInput.trim()}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Context Injection is always appended internally — not shown to user */}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Not-Found Message
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Shown to users when their question has no match in the active documents (no LLM call is made).
            </p>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="space-y-3 pl-1">
                {DEFAULT_NOT_FOUND_MESSAGES.map(msg => (
                  <label key={msg} className="flex items-start space-x-3 cursor-pointer group">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedNotFoundMessages.includes(msg)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNotFoundMessages([...selectedNotFoundMessages, msg]);
                          } else {
                            setSelectedNotFoundMessages(selectedNotFoundMessages.filter(m => m !== msg));
                          }
                        }}
                        className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{msg}</span>
                    </div>
                  </label>
                ))}

                {customNotFoundMessages.map((msg, idx) => (
                  <div key={`custom-notfound-${idx}`} className="flex items-start space-x-3 group">
                    <label className="flex items-start space-x-3 cursor-pointer flex-1">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={selectedNotFoundMessages.includes(msg)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNotFoundMessages([...selectedNotFoundMessages, msg]);
                            } else {
                              setSelectedNotFoundMessages(selectedNotFoundMessages.filter(m => m !== msg));
                            }
                          }}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{msg}</span>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomNotFoundMessages(customNotFoundMessages.filter((_, i) => i !== idx));
                        setSelectedNotFoundMessages(selectedNotFoundMessages.filter(m => m !== msg));
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      title="Remove custom message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newNotFoundMessageInput}
                      onChange={(e) => setNewNotFoundMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newNotFoundMessageInput.trim()) {
                          e.preventDefault();
                          const m = newNotFoundMessageInput.trim();
                          if (!customNotFoundMessages.includes(m) && !DEFAULT_NOT_FOUND_MESSAGES.includes(m)) {
                            setCustomNotFoundMessages([...customNotFoundMessages, m]);
                            setSelectedNotFoundMessages([...selectedNotFoundMessages, m]);
                          }
                          setNewNotFoundMessageInput('');
                        }
                      }}
                      placeholder="Add a new custom not-found message..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newNotFoundMessageInput.trim()) {
                          const m = newNotFoundMessageInput.trim();
                          if (!customNotFoundMessages.includes(m) && !DEFAULT_NOT_FOUND_MESSAGES.includes(m)) {
                            setCustomNotFoundMessages([...customNotFoundMessages, m]);
                            setSelectedNotFoundMessages([...selectedNotFoundMessages, m]);
                          }
                          setNewNotFoundMessageInput('');
                        }
                      }}
                      disabled={!newNotFoundMessageInput.trim()}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium text-sm"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save AI Settings'}</span>
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'ai-settings' | 'api-keys';

const MasterSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('ai-settings');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'ai-settings', label: 'AI Settings', icon: <Cpu className="h-4 w-4" /> },
    { id: 'api-keys', label: 'API Keys', icon: <Key className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage API keys and customize AI model behaviour
            </p>
          </div>
          <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-5 border-b border-gray-200 dark:border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        {activeTab === 'ai-settings' && <AISettingsTab />}
        {activeTab === 'api-keys' && <APIKeysTab />}
      </div>
    </div>
  );
};

export default MasterSettingsPage;
