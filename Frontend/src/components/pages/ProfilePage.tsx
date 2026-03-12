import React, { useState } from 'react';
import { LogOut, Edit3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EditProfile from './EditProfile';

const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);

  const handleProfileUpdateSuccess = async () => {
    setShowEditProfile(false);
    await refreshUser();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your account and view your activity</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Information */}
        <div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile Information</h2>

            <div className="space-y-6">
              {/* Profile Picture and Basic Info */}
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.username}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Account Actions */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setShowEditProfile(true)}
            className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Edit3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Edit Profile</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center space-x-3 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Logout</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {
        showEditProfile && (
          <EditProfile
            onClose={() => setShowEditProfile(false)}
            onSuccess={handleProfileUpdateSuccess}
          />
        )
      }
    </div >
  );
};

export default ProfilePage;