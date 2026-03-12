import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, Trash, Eye, Zap, Clock, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';
import { ChatDocumentItem } from '../../types';

const DocumentsPage: React.FC = () => {
  const [chatDocs, setChatDocs] = useState<ChatDocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  // Poll for updates if any document is currently in the "processing" state
  useEffect(() => {
    const isAnyDocProcessing = chatDocs.some((doc) => doc.status === 'processing');
    let interval: ReturnType<typeof setInterval>;

    if (isAnyDocProcessing) {
      interval = setInterval(() => {
        fetchDocs();
      }, 3000); // poll every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [chatDocs]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchDocs = async () => {
    try {
      const docs = await apiService.listChatDocuments();
      docs.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      setChatDocs(docs);
    } catch (e) {
      console.error('Failed to load documents', e);
    }
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      await apiService.uploadChatDocument(file);
      await fetchDocs();
      showToast('success', `"${file.name}" uploaded. Click Process to embed it.`);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async (doc: ChatDocumentItem) => {
    if (doc.status === 'processing') return;

    setProcessingDocId(doc.id);
    try {
      const result = await apiService.processChatDocument(doc.id);
      // Wait for polling to update the full state, but update optimistic state here
      setChatDocs(prev =>
        prev.map(d => d.id === doc.id
          ? { ...d, status: 'processing' as const, is_processed: result.is_processed || false, vector_namespace: result.vector_namespace }
          : d
        )
      );
      showToast('success', `Processing started for "${doc.filename}" in the background!`);
    } catch (e: any) {
      showToast('error', e.message || 'Failed to start processing. Please try again.');
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleToggleStatus = async (doc: ChatDocumentItem, newStatus: boolean) => {
    if (newStatus && !doc.is_processed) {
      showToast('error', 'Please process this document first before activating it.');
      return;
    }
    try {
      const res = await apiService.updateChatDocumentStatus(doc.id, newStatus);
      setChatDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_active: res.is_active } : d));
      showToast('success', res.message);
    } catch (e: any) {
      showToast('error', e.message || `Failed to ${newStatus ? 'activate' : 'deactivate'} document`);
    }
  };

  const handleDelete = async (doc: ChatDocumentItem) => {
    if (!window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return;
    try {
      await apiService.deleteChatDocument(doc.id);
      setChatDocs(prev => prev.filter(d => d.id !== doc.id));
      showToast('success', 'Document deleted.');
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete document');
    }
  };

  const handleView = async (doc: ChatDocumentItem) => {
    try {
      setDownloadingDocId(doc.id);
      const blob = await apiService.downloadChatDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      
      // ONLY open PDFs in the browser natively
      const isPdf = blob.type === 'application/pdf';

      if (isPdf) {
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      } else {
        // Otherwise, force download with correct filename
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = doc.filename || 'document';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
      }
    } catch (e) {
      showToast('error', 'Failed to open document.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const activeCount = chatDocs.filter(d => d.is_active).length;
  const processedCount = chatDocs.filter(d => d.is_processed).length;

  const getDocStatus = (doc: ChatDocumentItem) => {
    if (doc.is_active) return 'active';
    if (doc.status === 'failed') return 'failed';
    if (doc.status === 'processing' || processingDocId === doc.id) return 'processing';
    if (doc.is_processed || doc.status === 'completed') return 'processed';
    return 'pending';
  };

  return (
    <div className="space-y-6 relative">

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all ${toastMsg.type === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
          }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Documents</h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['Upload', 'Process', 'Activate', 'Chat'].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-gray-300 dark:text-gray-600 text-sm">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {processedCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                <Zap className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{processedCount} processed</span>
              </div>
            )}
            {activeCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-300">{activeCount} active in chat</span>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Upload Area */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Document</h2>
        <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-blue-300 dark:border-blue-700/50 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all bg-white dark:bg-gray-800/50 group">
          <div className="flex flex-col items-center justify-center">
            {isUploading ? (
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-3" />
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              </div>
            )}
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              {isUploading ? 'Uploading...' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs text-gray-400">PDF, TXT, DOCX, MD, RTF, CSV, JSON, HTML (Max limit: 50MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.txt,.doc,.docx,.md,.rtf,.csv,.json,.html"
            onChange={(e) => handleUpload(e.target.files?.[0])}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Documents Grid */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Uploaded Documents
          {chatDocs.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({chatDocs.length})</span>
          )}
        </h2>

        {chatDocs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
              <FileText className="h-8 w-8 text-gray-300 dark:text-gray-500" />
            </div>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">No documents yet</p>
            <p className="text-sm text-gray-400">Upload your first document to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chatDocs.map((doc) => {
              const status = getDocStatus(doc);
              return (
                <div
                  key={doc.id}
                  className={`relative flex flex-col p-5 rounded-2xl border transition-all ${status === 'active'
                    ? 'border-green-400 dark:border-green-500/60 bg-green-50/40 dark:bg-green-900/10 shadow-md shadow-green-100 dark:shadow-none'
                    : status === 'processed'
                      ? 'border-blue-200 dark:border-blue-700/50 bg-blue-50/20 dark:bg-blue-900/5 hover:shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  {/* Status badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {status === 'active' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Active
                      </span>
                    )}
                    {status === 'processed' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        <Zap className="h-2.5 w-2.5" /> Ready
                      </span>
                    )}
                    {status === 'processing' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Processing
                      </span>
                    )}
                    {status === 'failed' && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide cursor-help"
                        title={doc.error_message || 'Processing failed'}
                      >
                        <AlertCircle className="h-2.5 w-2.5" /> Failed
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        <Clock className="h-2.5 w-2.5" /> Pending
                      </span>
                    )}
                  </div>

                  {/* File icon + name */}
                  <div className="flex items-start gap-3 mb-4 pr-16 mt-2">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${status === 'active' ? 'bg-green-100 dark:bg-green-900/30'
                      : status === 'processed' ? 'bg-blue-100 dark:bg-blue-900/30'
                        : status === 'failed' ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-gray-100 dark:bg-gray-700/50'
                      }`}>
                      <FileText className={`h-5 w-5 ${status === 'active' ? 'text-green-600 dark:text-green-400'
                        : status === 'processed' ? 'text-blue-600 dark:text-blue-400'
                          : status === 'failed' ? 'text-red-500 dark:text-red-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 break-words line-clamp-2" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(doc.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/60">

                    {/* Process button — shown only if not yet processed */}
                    {status !== 'processed' && status !== 'active' && (
                      <button
                        onClick={() => handleProcess(doc)}
                        disabled={processingDocId === doc.id || status === 'processing'}
                        className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-sm ${status === 'failed'
                          ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                          : 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 disabled:opacity-60'
                          }`}
                      >
                        {processingDocId === doc.id || status === 'processing' ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Processing Background...
                          </>
                        ) : status === 'failed' ? (
                          <>
                            <AlertCircle className="h-3.5 w-3.5" />
                            Retry Processing
                          </>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5" />
                            Process Document
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      {/* View button */}
                      <button
                        onClick={() => handleView(doc)}
                        disabled={downloadingDocId === doc.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {downloadingDocId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                        View
                      </button>

                      {/* Activate / Deactivate — always visible */}
                      {doc.is_active ? (
                        <button
                          onClick={() => handleToggleStatus(doc, false)}
                          className="flex-1 py-2 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(doc, true)}
                          title={!doc.is_processed ? 'Process this document first' : ''}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${doc.is_processed
                            ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40'
                            : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
                            }`}
                        >
                          Use in Chat
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;