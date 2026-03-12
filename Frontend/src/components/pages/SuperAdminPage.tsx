import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    ShieldCheck,
    PowerIcon,
    Trash2,
    ShieldX,
    Calendar,
    Search,
    ExternalLink,
    Info,
    Mail,
    Building2,
    CalendarDays,
    Clock,
    UserCircle,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    X
} from 'lucide-react';
import { apiService } from '../../services/api';
import { AdminUserView, PlanOverviewEntry } from '../../types';

interface DetailModalProps {
    user: AdminUserView;
    onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ user, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-indigo-600" />
                        User Details
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Username</label>
                            <p className="text-gray-900 dark:text-gray-200 font-medium">{user.username}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</label>
                            <p className="text-gray-900 dark:text-gray-200 font-medium">{user.fullname || 'N/A'}</p>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email Address</label>
                            <p className="text-gray-900 dark:text-gray-200 font-medium flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                {user.email}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Organization</label>
                            <p className="text-gray-900 dark:text-gray-200 font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                {user.organization_name || 'N/A'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Website</label>
                            {user.company_url ? (
                                <a href={user.company_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                                    Visit <ExternalLink className="h-3 w-3" />
                                </a>
                            ) : <p className="text-gray-500">N/A</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Created At</label>
                            <p className="text-gray-900 dark:text-gray-200 font-medium flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-gray-400" />
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Trial Ends</label>
                            <p className="text-gray-900 dark:text-gray-200 font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                {user.trial_ends_at ? new Date(user.trial_ends_at).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

const SuperAdminPage: React.FC = () => {
    const [usersList, setUsersList] = useState<AdminUserView[]>([]);
    const [plansList, setPlansList] = useState<PlanOverviewEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'users' | 'trials'>('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'super_admin' | 'user'>('all');

    const [selectedUser, setSelectedUser] = useState<AdminUserView | null>(null);
    const [trialDays, setTrialDays] = useState<number>(30);
    const [updatingTrialId, setUpdatingTrialId] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [uList, pList] = await Promise.all([
                apiService.listUsers(true), // include deleted for full overview
                apiService.getPlansOverview()
            ]);
            setUsersList(uList);
            setPlansList(pList);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch Super Admin data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const stats = useMemo(() => {
        const total = usersList.length;
        const active = usersList.filter(u => u.is_active && !u.deleted_at).length;
        const activeTrials = plansList.filter(p => p.trial_status === 'active').length;
        const expiredTrials = plansList.filter(p => p.trial_status === 'expired').length;
        return { total, active, activeTrials, expiredTrials };
    }, [usersList, plansList]);

    const filteredUsers = useMemo(() => {
        return usersList.filter(u => {
            const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.organization_name && u.organization_name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && u.is_active) ||
                (statusFilter === 'inactive' && !u.is_active);

            const matchesRole = roleFilter === 'all' || u.user_type === roleFilter;

            return matchesSearch && matchesStatus && matchesRole;
        });
    }, [usersList, searchTerm, statusFilter, roleFilter]);

    const handleAction = async (actionFn: () => Promise<any>) => {
        try {
            await actionFn();
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Action failed');
        }
    };

    const handleUpdateTrial = async (userId: string) => {
        setUpdatingTrialId(userId);
        try {
            await apiService.updateUserTrial(userId, trialDays);
            await loadData();
        } catch (err: any) {
            alert(err.message || 'Trial update failed');
        } finally {
            setUpdatingTrialId(null);
        }
    };

    const renderStats = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
                { label: 'Total Users', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Active Status', value: stats.active, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'Active Trials', value: stats.activeTrials, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Expired Trials', value: stats.expiredTrials, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
            ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-[#0c0c0c] p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderUsersTable = () => (
        <div className="bg-white dark:bg-[#0c0c0c] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-gray-50 dark:border-white/5 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by username, email, organization..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-900 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <select
                            className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                            <option value="user">User</option>
                        </select>
                        <button
                            onClick={loadData}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors border border-gray-200 dark:border-white/10"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`h-4 w-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 bg-gray-50/50 dark:bg-white/5 dark:text-gray-400 uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-6 py-4">User Details</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Organization</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {filteredUsers.map((usr) => (
                            <tr key={usr.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                            {usr.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{usr.username}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{usr.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight ${usr.user_type === 'super_admin' ? 'bg-purple-100/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                        usr.user_type === 'admin' ? 'bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            'bg-gray-100/50 text-gray-700 dark:bg-white/10 dark:text-gray-400'
                                        }`}>
                                        {usr.user_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-gray-600 dark:text-gray-300 font-medium">{usr.organization_name || 'Individual'}</p>
                                </td>
                                <td className="px-6 py-4">
                                    {usr.deleted_at ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-xs font-bold uppercase">
                                            <Trash2 className="h-3 w-3" /> Deleted
                                        </span>
                                    ) : usr.is_active ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-xs font-bold uppercase">
                                            <ShieldCheck className="h-3 w-3" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 dark:bg-white/10 dark:text-gray-400 text-xs font-bold uppercase">
                                            <ShieldX className="h-3 w-3" /> Inactive
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => setSelectedUser(usr)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                                            title="View Details"
                                        >
                                            <Info className="h-4 w-4" />
                                        </button>
                                        {!usr.deleted_at && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(() => usr.is_active ? apiService.deactivateUser(usr.id) : apiService.activateUser(usr.id))}
                                                    className={`p-2 rounded-lg transition-colors ${usr.is_active
                                                        ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                        }`}
                                                    title={usr.is_active ? "Deactivate" : "Activate"}
                                                >
                                                    <PowerIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Are you sure you want to soft delete ${usr.username}? This cannot be easily undone.`)) {
                                                            handleAction(() => apiService.softDeleteUser(usr.id))
                                                        }
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Soft Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Users className="h-10 w-10 text-gray-300" />
                                        <p>No users found matching your search</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderTrialsTable = () => (
        <div className="bg-white dark:bg-[#0c0c0c] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 bg-gray-50/50 dark:bg-white/5 dark:text-gray-400 uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Trial Status</th>
                            <th className="px-6 py-4">Expiration Date</th>
                            <th className="px-6 py-4 text-right">Extend Trial</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {plansList.map((plan) => (
                            <tr key={plan.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-gray-900 dark:text-white">{plan.username}</p>
                                    <p className="text-xs text-gray-500">{plan.organization_name || 'Individual'}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight ${plan.trial_status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                        plan.trial_status === 'expired' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400'
                                        }`}>
                                        {plan.trial_status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        {plan.trial_ends_at ? new Date(plan.trial_ends_at).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        }) : 'No Trial'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="flex bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-1">
                                            {[7, 14, 30].map(days => (
                                                <button
                                                    key={days}
                                                    onClick={() => {
                                                        setTrialDays(days);
                                                        handleUpdateTrial(plan.id);
                                                    }}
                                                    disabled={updatingTrialId === plan.id}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${trialDays === days && updatingTrialId === plan.id
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                        }`}
                                                >
                                                    {days}d
                                                </button>
                                            ))}
                                            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 self-center mx-1" />
                                            <div className="flex items-center px-2">
                                                <input
                                                    type="number"
                                                    className="w-12 bg-transparent text-xs font-bold outline-none text-gray-900 dark:text-white text-center"
                                                    placeholder="Custom"
                                                    min="1"
                                                    onChange={(e) => setTrialDays(Number(e.target.value))}
                                                />
                                                <button
                                                    onClick={() => handleUpdateTrial(plan.id)}
                                                    disabled={updatingTrialId === plan.id}
                                                    className="p-1 hover:text-indigo-600 transition-colors"
                                                >
                                                    {updatingTrialId === plan.id ?
                                                        <RefreshCw className="h-3 w-3 animate-spin" /> :
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (isLoading && usersList.length === 0) return (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-gray-500 animate-pulse">
            <RefreshCw className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
            <p className="font-medium">Loading Administrative Suite...</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="bg-white dark:bg-[#0c0c0c] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldCheck size={120} className="text-indigo-600" />
                </div>
                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-xl">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            Control Center
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl font-medium">
                        Comprehensive management for users, access permissions, and subscription lifecycle. Monitor platform health and administrative actions.
                    </p>
                </div>
            </div>

            {renderStats()}

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-3 font-medium">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* TAB Navigation */}
            <div className="flex border-b border-gray-200 dark:border-white/10 space-x-8 px-2">
                {[
                    { id: 'users', label: 'User Directory', icon: Users },
                    { id: 'trials', label: 'Trial Management', icon: Clock }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 py-4 px-1 text-sm font-bold transition-all relative ${activeTab === tab.id
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="min-h-[500px]">
                {activeTab === 'users' ? renderUsersTable() : renderTrialsTable()}
            </div>

            {/* Modals */}
            {selectedUser && (
                <DetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
};

export default SuperAdminPage;

