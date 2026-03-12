import React, { useState, useEffect } from 'react';
import { Terminal, AlertCircle, Clock, Activity, FileText } from 'lucide-react';
import { apiService } from '../../services/api';
import { LogSummary, LogFileInfo } from '../../types';

const LogsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'app' | 'error' | 'access'>('app');
    const [logs, setLogs] = useState<any[]>([]);
    const [summary, setSummary] = useState<LogSummary | null>(null);
    const [filesInfo, setFilesInfo] = useState<LogFileInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let res: any;
            if (activeTab === 'app') {
                res = await apiService.getAppLogs(100);
            } else if (activeTab === 'error') {
                res = await apiService.getErrorLogs(100);
            } else if (activeTab === 'access') {
                res = await apiService.getAccessLogs(100);
            }
            // Backend returns { logs: [...], ... } inside data
            setLogs(res.logs || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load logs');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const [summaryRes, filesRes] = await Promise.all([
                apiService.getLogSummary(24),
                apiService.getLogFilesInfo()
            ]);
            // Backend returns { summary: { ... } } and { files: [ ... ] }
            setSummary(summaryRes.summary || null);
            setFilesInfo(filesRes.files || []);
        } catch (err) {
            console.error('Failed to load log metadata', err);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [activeTab]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Terminal className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        System Logs
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Monitor application health, errors, and system activity
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium border border-indigo-200 dark:border-indigo-800"
                >
                    Refresh Logs
                </button>
            </div>

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400 mb-2">
                            <Activity className="h-5 w-5" />
                            <span className="font-medium">Total Requests (24h)</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {(summary.total_requests || 0).toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-red-500 dark:text-red-400 mb-2">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">Error Counts</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {summary.error_counts ? Object.values(summary.error_counts).reduce((a: any, b: any) => a + b, 0) : 0}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-yellow-500 dark:text-yellow-400 mb-2">
                            <Clock className="h-5 w-5" />
                            <span className="font-medium">Slow Requests (&gt;2s)</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {summary.slow_requests || 0}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-blue-500 dark:text-blue-400 mb-2">
                            <FileText className="h-5 w-5" />
                            <span className="font-medium">Storage Used</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {filesInfo && filesInfo.length > 0
                                ? (filesInfo.reduce((acc, file) => acc + (file.size_bytes || 0), 0) / (1024 * 1024)).toFixed(2) + ' MB'
                                : '0 MB'}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {[
                        { id: 'app', label: 'App Logs' },
                        { id: 'error', label: 'Error Logs' },
                        { id: 'access', label: 'Access Logs' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-gray-50 dark:bg-gray-900/50 border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-4 bg-gray-900 dark:bg-[#0d1117] min-h-[500px] max-h-[700px] overflow-y-auto font-mono text-sm">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">
                            Loading logs...
                        </div>
                    ) : error ? (
                        <div className="text-red-400 p-4">{error}</div>
                    ) : logs.length === 0 ? (
                        <div className="text-gray-500 p-4">No logs found.</div>
                    ) : (
                        <div className="space-y-1">
                            {logs.map((log, index) => {
                                let colorClass = 'text-gray-300'; // Default INFO/DEBUG
                                if (log.level === 'ERROR' || log.level === 'CRITICAL' || (log.status_code && log.status_code >= 500)) colorClass = 'text-red-400';
                                if (log.level === 'WARNING' || (log.status_code && log.status_code >= 400 && log.status_code < 500)) colorClass = 'text-yellow-400';

                                return (
                                    <div key={index} className={`break-all py-1 border-b border-gray-800/50 ${colorClass}`}>
                                        <span className="text-gray-500 mr-2">[{log.timestamp || log.time}]</span>
                                        {log.level && <span className="font-bold mr-2">[{log.level}]</span>}
                                        {log.status_code && <span className="font-bold mr-2">[{log.method} {log.path} {log.status_code}]</span>}
                                        <span className="opacity-90">{log.message || JSON.stringify(log)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogsPage;
