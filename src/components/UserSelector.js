import React, { useState, useEffect } from 'react';
import { User, ChevronDown, Search } from 'lucide-react';
import AccService from '../services/AccService_old';

const UserSelector = ({ 
  selectedUserId, 
  onUserChange, 
  selectedProject, 
  selectedHub, 
  placeholder = "Select a user...",
  showSearch = true 
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load users when project or hub changes
  useEffect(() => {
    const loadUsers = async () => {
      if (!selectedProject || !selectedHub) {
        setUsers([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        console.log('👥 Loading users for project:', selectedProject.id, 'hub:', selectedHub.id);
        
        // Try the enhanced user fetching method
        const fetchedUsers = await AccService.getProjectUsersReliable(selectedProject.id, selectedHub.id);
        
        console.log('✅ Loaded users:', fetchedUsers.length);
        setUsers(fetchedUsers);
        
      } catch (err) {
        console.error('❌ Failed to load users:', err);
        setError(`Failed to load users: ${err.message}`);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [selectedProject, selectedHub]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected user details
  const selectedUser = users.find(user => user.id === selectedUserId);

  const handleUserSelect = (user) => {
    onUserChange(user.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Responsible Member
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          disabled={loading}
        >
          <div className="flex items-center">
            <User className="h-4 w-4 text-gray-400 mr-2" />
            {selectedUser ? (
              <div>
                <div className="text-sm font-medium text-gray-900">{selectedUser.name}</div>
                <div className="text-xs text-gray-500">{selectedUser.email}</div>
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {showSearch && (
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                <div className="mt-2 text-sm">Loading users...</div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600 text-sm">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? 'No users found matching your search.' : 'No users available.'}
              </div>
            ) : (
              <div className="py-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {user.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt={user.name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                        {user.jobTitle && (
                          <div className="text-xs text-gray-400">{user.jobTitle}</div>
                        )}
                        {user.role && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                            {user.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User count info */}
      {users.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          {filteredUsers.length} of {users.length} users
        </div>
      )}
    </div>
  );
};

export default UserSelector;
