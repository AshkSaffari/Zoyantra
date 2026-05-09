import React, { useState, useEffect } from 'react';
import { AlertCircle, Users, RefreshCw, Plus, Save, X, Wrench, Package, Truck } from 'lucide-react';
import AccService from '../services/AccService';
import ResourceService from '../services/ResourceService';
import ZLogo from './ZLogo';

const CrewManagementTab = ({ selectedProject, selectedHub, projects, members, credentials }) => {
  const [crews, setCrews] = useState([]);
  const [localMembers, setLocalMembers] = useState([]);
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberIds: [],
    resourceIds: [], // Add resources to crew
    hourlyRate: 0, // Default crew rate
    extraHoursRate: 0, // Extra hours rate for crew
    workingHoursPerDay: 8
  });
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');
  const [selectedResourceToAdd, setSelectedResourceToAdd] = useState('');
  const [memberRates, setMemberRates] = useState({}); // Store individual member rates within crew
  const [projectMemberRates, setProjectMemberRates] = useState({}); // Store project-wide member hourly rates
  const [editingMemberRate, setEditingMemberRate] = useState(null); // Track which member rate is being edited
  const [newMemberRate, setNewMemberRate] = useState(''); // Store the new rate being entered
  const [newMemberExtraRate, setNewMemberExtraRate] = useState(''); // Store the new extra rate being entered
  const [newRateValidFrom, setNewRateValidFrom] = useState(''); // Store the valid from date
  const [editingExtraRate, setEditingExtraRate] = useState(null); // Track which member extra rate is being edited
  const [newExtraRate, setNewExtraRate] = useState(''); // Store the new extra rate being entered
  const [editingCrew, setEditingCrew] = useState(null); // Track which crew is being edited
  
  // Role-based rate management
  const [selectedRole, setSelectedRole] = useState('');
  const [roleRate, setRoleRate] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [showBulkRateConfirm, setShowBulkRateConfirm] = useState(false);
  const [bulkRateConfirmData, setBulkRateConfirmData] = useState(null);

  // Initialize services
  const resourceService = new ResourceService();

  useEffect(() => {
    if (selectedHub && selectedProject) {
      loadCrews();
      loadMemberRates();
      loadResources();
    }
  }, [selectedHub, selectedProject, members]); // Add members dependency

  // Separate useEffect to load roles after localMembers is set
  useEffect(() => {
    if (localMembers && localMembers.length > 0) {
      console.log('🔄 Loading roles after localMembers updated:', localMembers.length);
      loadAvailableRoles();
    }
  }, [localMembers]);

  // Load member rates from localStorage
  const loadMemberRates = () => {
    if (selectedProject?.id) {
      const savedRates = JSON.parse(localStorage.getItem(`memberRates_${selectedProject.id}`) || '{}');
      setProjectMemberRates(savedRates);
      console.log('💰 Loaded member rates:', savedRates);
    }
  };

  // Get rate valid for a specific date
  const getRateForDate = (memberId, date, rateType = 'regular') => {
    const memberRates = projectMemberRates[memberId];
    if (!memberRates || !Array.isArray(memberRates.rates)) {
      return 0;
    }

    const targetDate = new Date(date);
    const validRates = memberRates.rates
      .filter(rate => new Date(rate.validFrom) <= targetDate)
      .sort((a, b) => new Date(b.validFrom) - new Date(a.validFrom));

    if (validRates.length > 0) {
      return rateType === 'extra' ? validRates[0].extraRate : validRates[0].rate;
    }

    return 0;
  };

  // Helper function to get current rate (handles both old and new structures)
  const getCurrentRate = (memberId) => {
    const memberRates = projectMemberRates[memberId];
    
    // Handle new structure (with rates array)
    if (memberRates && Array.isArray(memberRates.rates)) {
      const rate = getRateForDate(memberId, new Date().toISOString().split('T')[0]);
      const result = typeof rate === 'number' ? rate : 0;
      console.log('🔍 getCurrentRate (new structure):', { memberId, rate, result });
      return result;
    }
    
    // Handle old structure (direct number)
    if (typeof memberRates === 'number') {
      console.log('🔍 getCurrentRate (old structure):', { memberId, memberRates });
      return memberRates;
    }
    
    // Fallback to member's default rate
    const member = localMembers.find(m => m.id === memberId);
    const fallbackRate = member?.rate || 50;
    const result = typeof fallbackRate === 'number' ? fallbackRate : 50;
    console.log('🔍 getCurrentRate (fallback):', { memberId, member, fallbackRate, result });
    return result;
  };

  // Load resources for the project
  const loadResources = () => {
    if (selectedProject?.id) {
      const projectResources = resourceService.getByProject(selectedProject.id);
      setResources(projectResources);
      console.log('📦 Loaded resources for project:', projectResources.length);
    }
  };

  // Save member rates to localStorage
  const saveMemberRates = (rates) => {
    if (selectedProject?.id) {
      localStorage.setItem(`memberRates_${selectedProject.id}`, JSON.stringify(rates));
      setProjectMemberRates(rates);
      console.log('💾 Saved member rates:', rates);
    }
  };

  const handleBulkRateConfirm = () => {
    if (bulkRateConfirmData) {
      const { rate, members } = bulkRateConfirmData;
      const updatedRates = { ...projectMemberRates };
      
      members.forEach(member => {
        // Set the rate using the new structure
        updatedRates[member.id] = {
          rates: [{
            rate: rate,
            extraRate: rate * 1.5, // Default 1.5x for extra hours
            validFrom: new Date().toISOString().split('T')[0]
          }]
        };
      });
      
      saveMemberRates(updatedRates);
      document.getElementById('bulkRate').value = '';
      alert(`✅ Applied rate $${rate}/hr to ${members.length} members`);
    }
    
    setShowBulkRateConfirm(false);
    setBulkRateConfirmData(null);
  };

  const handleBulkRateCancel = () => {
    setShowBulkRateConfirm(false);
    setBulkRateConfirmData(null);
  };

  // Add new rate with date
  const addMemberRate = (memberId, rate, extraRate, validFrom) => {
    const currentRates = { ...projectMemberRates };
    
    if (!currentRates[memberId]) {
      currentRates[memberId] = { rates: [] };
    }

    const newRate = {
      rate: parseFloat(rate) || 0,
      extraRate: parseFloat(extraRate) || 0,
      validFrom: validFrom || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    currentRates[memberId].rates.push(newRate);
    currentRates[memberId].rates.sort((a, b) => new Date(a.validFrom) - new Date(b.validFrom));

    saveMemberRates(currentRates);
    console.log('✅ Added new rate for member:', memberId, newRate);
  };

  // Load available roles from members
  const loadAvailableRoles = () => {
    if (localMembers && localMembers.length > 0) {
      console.log('🔍 All members data for role extraction:', localMembers);
      
      const roles = [...new Set(localMembers
        .map(member => {
          // First try to get roles from the roles array (most common structure)
          if (member.roles && Array.isArray(member.roles) && member.roles.length > 0) {
            // Extract role names from the roles array
            const roleNames = member.roles.map(role => role.name || role.title || role.roleName || role).filter(Boolean);
            console.log(`👤 Member ${member.id} has roles array:`, roleNames);
            return roleNames;
          }
          
          // Try many different possible role fields
          const possibleRole = member.role || 
                 member.attributes?.role || 
                 member.jobTitle || 
                 member.attributes?.jobTitle ||
                 member.title ||
                 member.attributes?.title ||
                 member.position ||
                 member.attributes?.position ||
                 member.department ||
                 member.attributes?.department ||
                 member.roleName ||
                 member.attributes?.roleName ||
                 member.occupation ||
                 member.attributes?.occupation ||
                 member.profession ||
                 member.attributes?.profession ||
                 member.extension?.data?.role ||
                 member.extension?.data?.jobTitle ||
                 member.extension?.data?.title ||
                 member.extension?.data?.position ||
                 member.extension?.data?.department ||
                 member.extension?.data?.roleName ||
                 member.extension?.data?.occupation ||
                 member.extension?.data?.profession ||
                 'No Role';
          
          console.log(`👤 Member ${member.id}:`, {
            name: member.attributes?.name || member.name,
            role: possibleRole,
            roles: member.roles,
            allFields: Object.keys(member),
            attributes: member.attributes,
            extension: member.extension
          });
          
          return possibleRole;
        })
        .flat() // Flatten the array in case we have multiple roles per member
        .filter(role => role && role !== 'No Role')
      )];
      
      setAvailableRoles(roles);
      console.log('👔 Available roles found:', roles);
      console.log('👔 Total members processed:', localMembers.length);
    }
  };

  // Get members with a specific role
  const getMembersByRole = (role) => {
    return localMembers.filter(member => {
      // First check if member has roles array
      if (member.roles && Array.isArray(member.roles) && member.roles.length > 0) {
        return member.roles.some(roleObj => {
          const roleName = roleObj.name || roleObj.title || roleObj.roleName || roleObj;
          return roleName === role;
        });
      }
      
      // Fallback to single role fields
      const memberRole = member.role || 
                        member.attributes?.role || 
                        member.jobTitle || 
                        member.attributes?.jobTitle ||
                        member.title ||
                        member.attributes?.title ||
                        member.position ||
                        member.attributes?.position ||
                        member.department ||
                        member.attributes?.department ||
                        member.roleName ||
                        member.attributes?.roleName ||
                        member.occupation ||
                        member.attributes?.occupation ||
                        member.profession ||
                        member.attributes?.profession ||
                        member.extension?.data?.role ||
                        member.extension?.data?.jobTitle ||
                        member.extension?.data?.title ||
                        member.extension?.data?.position ||
                        member.extension?.data?.department ||
                        member.extension?.data?.roleName ||
                        member.extension?.data?.occupation ||
                        member.extension?.data?.profession ||
                        'No Role';
      return memberRole === role;
    });
  };

  // Handle role rate change
  const handleRoleRateChange = (e) => {
    setRoleRate(e.target.value);
  };

  // Apply rate to all members with selected role
  const applyRateToRole = () => {
    if (!selectedRole || !roleRate || isNaN(parseFloat(roleRate))) {
      alert('Please select a role and enter a valid rate');
      return;
    }

    const rate = parseFloat(roleRate);
    if (rate < 0) {
      alert('Rate cannot be negative');
      return;
    }

    const membersWithRole = getMembersByRole(selectedRole);
    if (membersWithRole.length === 0) {
      alert(`No members found with role: ${selectedRole}`);
      return;
    }

    const updatedRates = { ...projectMemberRates };
    membersWithRole.forEach(member => {
      updatedRates[member.id] = rate;
    });

    saveMemberRates(updatedRates);
    setRoleRate('');
    alert(`Successfully set rate $${rate}/hr for ${membersWithRole.length} member(s) with role: ${selectedRole}`);
  };

  // Handle member rate editing
  const handleEditMemberRate = (memberId) => {
    setEditingMemberRate(memberId);
    setNewMemberRate('');
    setNewMemberExtraRate('');
    setNewRateValidFrom(new Date().toISOString().split('T')[0]);
  };

  const handleSaveMemberRate = (memberId) => {
    const rate = parseFloat(newMemberRate);
    const extraRate = parseFloat(newMemberExtraRate);
    
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid hourly rate (0 or greater)');
      return;
    }

    if (isNaN(extraRate) || extraRate < 0) {
      alert('Please enter a valid extra hours rate (0 or greater)');
      return;
    }

    if (!newRateValidFrom) {
      alert('Please select a valid from date');
      return;
    }

    // Add new rate with date
    addMemberRate(memberId, rate, extraRate, newRateValidFrom);
    
    setEditingMemberRate(null);
    setNewMemberRate('');
    setNewMemberExtraRate('');
    setNewRateValidFrom('');
  };

  const handleCancelEditMemberRate = () => {
    setEditingMemberRate(null);
    setNewMemberRate('');
  };

  const handleDeleteMemberRate = (memberId) => {
    const updatedRates = { ...projectMemberRates };
    delete updatedRates[memberId];
    saveMemberRates(updatedRates);
  };

  // Handle extra hours rate editing
  const handleEditExtraRate = (memberId) => {
    setEditingExtraRate(memberId);
    setNewExtraRate(projectMemberRates[`${memberId}_extra`]?.toString() || '');
  };

  const handleSaveExtraRate = (memberId) => {
    const rate = parseFloat(newExtraRate);
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid extra hours rate (0 or greater)');
      return;
    }

    const updatedRates = {
      ...projectMemberRates,
      [`${memberId}_extra`]: rate
    };
    saveMemberRates(updatedRates);
    setEditingExtraRate(null);
    setNewExtraRate('');
  };

  const handleCancelEditExtraRate = () => {
    setEditingExtraRate(null);
    setNewExtraRate('');
  };

  const handleDeleteExtraRate = (memberId) => {
    const updatedRates = { ...projectMemberRates };
    delete updatedRates[`${memberId}_extra`];
    saveMemberRates(updatedRates);
  };

  const loadCrews = async () => {
    if (!selectedHub || !selectedProject) return;
    
    setIsLoading(true);
    try {
      // Load ACC project members first
      await loadProjectUsers();
      
      // Use members from props (simple approach)
      if (members && members.length > 0) {
        setLocalMembers(members);
        console.log('👥 Using members from props:', members.length);
        console.log('👥 Member data:', members);
      } else {
        console.log('⚠️ No members available from props');
        setLocalMembers([]);
      }
      
      // Load existing crews from localStorage
      const savedCrews = JSON.parse(localStorage.getItem(`crews_${selectedProject?.id}`) || '[]');
      console.log('👥 Loaded crews:', savedCrews);
      setCrews(savedCrews);
    } catch (error) {
      console.error('Error loading crews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectUsers = async () => {
    if (!selectedProject || !selectedHub || !credentials) {
      console.log('❌ Missing required data for loadProjectUsers:', {
        selectedProject: !!selectedProject,
        selectedHub: !!selectedHub,
        credentials: !!credentials
      });
      return;
    }
    
    try {
      console.log('👥 Loading ACC project users for:', selectedProject.name);
      
      // Get project users from ACC with fallback to account users
      const users = await AccService.getProjectMembers(selectedProject.id, selectedHub.id);
      console.log('👥 Loaded ACC project users:', users.length);
      
      // Update local members with ACC data
      if (users && users.length > 0) {
        setLocalMembers(users);
        console.log('👥 Updated local members with ACC data:', users);
      }
    } catch (error) {
      console.error('❌ Error loading ACC project users:', error);
      // Fallback to props members if ACC fails
      if (members && members.length > 0) {
        setLocalMembers(members);
        console.log('👥 Fallback to props members:', members.length);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMember = () => {
    if (selectedMemberToAdd && !formData.memberIds.includes(selectedMemberToAdd)) {
      const member = localMembers.find(m => m.id === selectedMemberToAdd);
      const memberRate = member?.rate || 50; // Use member's rate or default
      
      setFormData(prev => ({
        ...prev,
        memberIds: [...prev.memberIds, selectedMemberToAdd]
      }));
      
      // Set member rate
      setMemberRates(prev => ({
        ...prev,
        [selectedMemberToAdd]: memberRate
      }));
      
      setSelectedMemberToAdd(''); // Reset dropdown
    }
  };

  const handleAddResource = () => {
    if (selectedResourceToAdd && !(formData.resourceIds || []).includes(selectedResourceToAdd)) {
      setFormData(prev => ({
        ...prev,
        resourceIds: [...(prev.resourceIds || []), selectedResourceToAdd]
      }));
      
      setSelectedResourceToAdd(''); // Reset dropdown
    }
  };

  const handleRemoveMember = (memberId) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.filter(id => id !== memberId)
    }));
    
    // Remove member rate
    setMemberRates(prev => {
      const updated = { ...prev };
      delete updated[memberId];
      return updated;
    });
  };

  const handleRemoveResource = (resourceId) => {
    setFormData(prev => ({
      ...prev,
      resourceIds: (prev.resourceIds || []).filter(id => id !== resourceId)
    }));
  };

  const handleMemberRateChange = (memberId, rate) => {
    setMemberRates(prev => ({
      ...prev,
      [memberId]: parseFloat(rate) || 0
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate that at least 1 member or resource is selected
    if (formData.memberIds.length === 0 && (formData.resourceIds || []).length === 0) {
      alert('❌ Please select at least 1 member or resource for the crew');
      return;
    }
    
    // Validate that crew name is provided
    if (!formData.name.trim()) {
      alert('❌ Please enter a crew name');
      return;
    }
    
    // Calculate average crew rate from members and resources
    const crewMemberRates = formData.memberIds.map(memberId => 
      getCurrentRate(memberId)
    );
    const crewResourceRates = (formData.resourceIds || []).map(resourceId => {
      const resource = resources.find(r => r.id === resourceId);
      return resource?.defaultRate || 0;
    });
    
    const allRates = [...crewMemberRates, ...crewResourceRates];
    const averageCrewRate = allRates.length > 0 
      ? (allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length).toFixed(2)
      : 0;

    const newCrew = {
      id: Date.now().toString(),
      ...formData,
      memberRates: { ...memberRates }, // Include individual member rates
      averageRate: parseFloat(averageCrewRate), // Add calculated average rate
      selectedProjectId: selectedProject?.id,
      createdAt: new Date().toISOString()
    };
    
    const updatedCrews = [...crews, newCrew];
    setCrews(updatedCrews);
    
    // Save to localStorage
    localStorage.setItem(`crews_${selectedProject?.id}`, JSON.stringify(updatedCrews));
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('crewUpdated'));
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      memberIds: [],
      resourceIds: [],
      hourlyRate: 0,
      extraHoursRate: 0,
      workingHoursPerDay: 8
    });
    setSelectedMemberToAdd('');
    setMemberRates({});
    setIsCreating(false);
  };

  const handleEditCrew = (crewId) => {
    const crew = crews.find(c => c.id === crewId);
    if (crew) {
      setEditingCrew(crewId);
      setFormData({
        name: crew.name,
        description: crew.description,
        memberIds: crew.memberIds,
        resourceIds: crew.resourceIds || [],
        hourlyRate: crew.hourlyRate || 0,
        extraHoursRate: crew.extraHoursRate || 0,
        workingHoursPerDay: crew.workingHoursPerDay || 8
      });
      setMemberRates(crew.memberRates || {});
      setIsCreating(true);
    }
  };

  const handleUpdateCrew = () => {
    if (!formData.name.trim()) {
      alert('Please enter a crew name');
      return;
    }

    if (formData.memberIds.length === 0) {
      alert('Please add at least one member to the crew');
      return;
    }

    // Calculate average rate for the crew (including members and resources)
    const crewMemberRates = formData.memberIds.map(memberId => 
      getCurrentRate(memberId)
    );
    const crewResourceRates = (formData.resourceIds || []).map(resourceId => {
      const resource = resources.find(r => r.id === resourceId);
      return resource?.defaultRate || 0;
    });
    
    const allRates = [...crewMemberRates, ...crewResourceRates];
    const averageRate = allRates.length > 0 
      ? allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length
      : 0;

    const updatedCrew = {
      id: editingCrew,
      name: formData.name,
      description: formData.description,
      memberIds: formData.memberIds,
      resourceIds: formData.resourceIds,
      memberRates: memberRates,
      hourlyRate: averageRate, // Store the calculated average rate
      extraHoursRate: formData.extraHoursRate,
      workingHoursPerDay: formData.workingHoursPerDay,
      createdAt: crews.find(c => c.id === editingCrew)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedCrews = crews.map(crew => 
      crew.id === editingCrew ? updatedCrew : crew
    );
    
    setCrews(updatedCrews);
    localStorage.setItem(`crews_${selectedProject?.id}`, JSON.stringify(updatedCrews));
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('crewUpdated'));
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      memberIds: [],
      resourceIds: [],
      hourlyRate: 0,
      extraHoursRate: 0,
      workingHoursPerDay: 8
    });
    setSelectedMemberToAdd('');
    setMemberRates({});
    setEditingCrew(null);
    setIsCreating(false);
  };

  const handleDelete = (crewId) => {
    if (window.confirm('Are you sure you want to delete this crew?')) {
      const updatedCrews = crews.filter(crew => crew.id !== crewId);
      setCrews(updatedCrews);
      localStorage.setItem(`crews_${selectedProject?.id}`, JSON.stringify(updatedCrews));
      
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('crewUpdated'));
    }
  };

  const getMemberName = (memberId) => {
    // Try to find member in both localMembers and members prop
    let member = localMembers.find(m => m.id === memberId);
    if (!member) {
      member = members?.find(m => m.id === memberId);
    }
    
    if (!member) {
      console.log('⚠️ Member not found for ID:', memberId);
      console.log('👥 Available member IDs:', [...localMembers.map(m => m.id), ...(members?.map(m => m.id) || [])]);
      return 'Unknown Member';
    }
    
    // Try different name fields in order of preference
    const name = member.attributes?.name || 
                 member.name || 
                 `${member.firstName || ''} ${member.lastName || ''}`.trim() || 
                 member.displayName || 
                 member.attributes?.displayName ||
                 `User ${member.id}`;
    
    return name;
  };

  if (!selectedHub || !selectedProject) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">Please select a selectedHub and selectedProject to view crew management.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Crew Management</h2>
            <p className="text-gray-600">Manage crews for {selectedProject?.name || 'selected project'}</p>
            <p className="text-sm text-gray-500">
              Available members: {localMembers.length} | Props members: {members?.length || 0}
            </p>
          </div>
          <button
            onClick={() => {
              loadCrews();
              loadMemberRates();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>
      </div>

      

      {/* Create Crew Form */}
      {isCreating && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingCrew ? 'Edit Crew' : 'Create New Crew'}
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingCrew(null);
                setFormData({
                  name: '',
                  description: '',
                  memberIds: [],
                  hourlyRate: 0,
                  workingHoursPerDay: 8
                });
                setMemberRates({});
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crew Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra Hours Rate ($/hr)
                </label>
                <input
                  type="number"
                  name="extraHoursRate"
                  value={formData.extraHoursRate}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter extra hours rate"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Rate for extra hours worked (typically 1.5x regular rate)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working Hours Per Day
                </label>
                <input
                  type="number"
                  name="workingHoursPerDay"
                  value={formData.workingHoursPerDay}
                  onChange={handleInputChange}
                  min="1"
                  max="24"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Members
              </label>
              
              {/* Add Member Section */}
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedMemberToAdd}
                  onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="">Choose a member to add...</option>
                  {localMembers
                    .filter(member => !formData.memberIds.includes(member.id))
                    .map(member => {
                      const roles = member.roles?.map(role => role.name).join(', ') || 'No role';
                      return (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email || 'No email'}) - ${getCurrentRate(member.id)}/hr - {roles}
                        </option>
                      );
                    })}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!selectedMemberToAdd}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {/* Add Resource Section */}
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedResourceToAdd}
                  onChange={(e) => setSelectedResourceToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a resource to add...</option>
                  {resources
                    .filter(resource => !(formData.resourceIds || []).includes(resource.id))
                    .map(resource => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name} - ${resource.defaultRate || 0}/{resource.unit || 'unit'} - {resource.type}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddResource}
                  disabled={!selectedResourceToAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              
              {/* Selected Members */}
              <div className="border border-gray-200 rounded-lg p-3 min-h-[100px]">
                <p className="text-sm text-gray-600 mb-2">Selected Members ({formData.memberIds.length}):</p>
                {formData.memberIds.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No members selected yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.memberIds.map(memberId => {
                      const memberName = getMemberName(memberId);
                      const member = localMembers.find(m => m.id === memberId) || members.find(m => m.id === memberId);
                      return (
                        <div key={memberId} className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{memberName}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span>${getCurrentRate(memberId)}/hr</span>
                              {member?.roles && member.roles.length > 0 && (
                                <span className="text-pink-600">
                                  {member.roles.map(role => role.name).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(memberId)}
                            className="text-pink-600 hover:text-pink-800 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Resources */}
              <div className="border border-gray-200 rounded-lg p-3 min-h-[100px] mt-4">
                <p className="text-sm text-gray-600 mb-2">Selected Resources ({(formData.resourceIds || []).length}):</p>
                {(formData.resourceIds || []).length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No resources selected yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(formData.resourceIds || []).map(resourceId => {
                      const resource = resources.find(r => r.id === resourceId);
                      return (
                        <div key={resourceId} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{resource?.name || 'Unknown'}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span>${resource?.defaultRate || 0}/{resource?.unit || 'unit'}</span>
                              <span className="text-blue-600">
                                {resource?.type || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveResource(resourceId)}
                            className="text-blue-600 hover:text-blue-800 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Crew Summary */}
            {(formData.memberIds.length > 0 || (formData.resourceIds || []).length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Crew Summary</h4>
                
                {/* Members Summary */}
                {formData.memberIds.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-blue-800 mb-2">Members ({formData.memberIds.length}):</h5>
                    <div className="space-y-1">
                      {formData.memberIds.map(memberId => {
                        const member = localMembers.find(m => m.id === memberId);
                        const memberRate = getCurrentRate(memberId);
                        return (
                          <div key={memberId} className="flex justify-between text-sm">
                            <span className="text-blue-700">{getMemberName(memberId)}</span>
                            <span className="font-medium text-blue-900">${memberRate}/hr</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resources Summary */}
                {(formData.resourceIds || []).length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-blue-800 mb-2">Resources ({(formData.resourceIds || []).length}):</h5>
                    <div className="space-y-1">
                      {(formData.resourceIds || []).map(resourceId => {
                        const resource = resources.find(r => r.id === resourceId);
                        return (
                          <div key={resourceId} className="flex justify-between text-sm">
                            <span className="text-blue-700">{resource?.name || 'Unknown'}</span>
                            <span className="font-medium text-blue-900">${resource?.defaultRate || 0}/{resource?.unit || 'unit'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Extra Hours Rates Summary */}
                {formData.memberIds.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-blue-800 mb-2">Extra Hours Rates:</h5>
                    <div className="space-y-1">
                      {formData.memberIds.map(memberId => {
                        const member = localMembers.find(m => m.id === memberId);
                        const memberName = getMemberName(memberId);
                        const regularRate = getCurrentRate(memberId);
                        const extraRate = projectMemberRates[`${memberId}_extra`] || regularRate * 1.5; // Default 1.5x regular rate
                        return (
                          <div key={memberId} className="flex justify-between text-sm">
                            <span className="text-blue-700">{memberName}</span>
                            <div className="text-right">
                              <div className="font-medium text-blue-900">Regular: ${regularRate}/hr</div>
                              <div className="text-xs text-blue-600">Extra: ${typeof extraRate === 'number' ? extraRate.toFixed(2) : '0.00'}/hr</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
                      💡 Extra hours rates are typically 1.5x regular rates. You can customize these in member settings.
                    </div>
                  </div>
                )}

                {/* Combined Average Rate */}
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-blue-900">Average Crew Rate:</span>
                    <span className="text-blue-900">
                      ${(() => {
                        const crewMemberRates = formData.memberIds.map(memberId => 
                          getCurrentRate(memberId)
                        );
                        const crewResourceRates = (formData.resourceIds || []).map(resourceId => {
                          const resource = resources.find(r => r.id === resourceId);
                          return resource?.defaultRate || 0;
                        });
                        const allRates = [...crewMemberRates, ...crewResourceRates];
                        return allRates.length > 0 
                          ? (allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length).toFixed(2)
                          : '0.00';
                      })()}/hr
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingCrew(null);
                  setFormData({
                    name: '',
                    description: '',
                    memberIds: [],
                    hourlyRate: 0,
                    workingHoursPerDay: 8
                  });
                  setSelectedMemberToAdd('');
                  setMemberRates({});
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type={editingCrew ? "button" : "submit"}
                onClick={editingCrew ? handleUpdateCrew : undefined}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {editingCrew ? 'Update Crew' : 'Create Crew'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Crew
        </button>

      </div>

      {/* Crews Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Crews</h3>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">Loading crews...</p>
          </div>
        ) : crews.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No crews found. Create your first crew above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crew Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {crews.map((crew) => (
                  <tr key={crew.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {crew.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {crew.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {crew.memberIds.map(memberId => {
                          const member = localMembers.find(m => m.id === memberId);
                          const memberRate = getCurrentRate(memberId);
                          const roles = member?.roles?.map(role => role.name).join(', ') || 'No role';
                          return (
                            <div key={memberId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div>
                                <span className="font-medium text-gray-900">{getMemberName(memberId)}</span>
                                <div className="text-xs text-gray-500">{roles}</div>
                              </div>
                              <div className="text-xs text-green-600 font-medium">
                                ${memberRate}/hr
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {(crew.resourceIds || []).map(resourceId => {
                          const resource = resources.find(r => r.id === resourceId);
                          return (
                            <div key={resourceId} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                              <div>
                                <span className="font-medium text-gray-900">{resource?.name || 'Unknown'}</span>
                                <div className="text-xs text-gray-500">{resource?.type || 'Unknown'}</div>
                              </div>
                              <div className="text-xs text-blue-600 font-medium">
                                ${resource?.defaultRate || 0}/{resource?.unit || 'unit'}
                              </div>
                            </div>
                          );
                        })}
                        {(crew.resourceIds || []).length === 0 && (
                          <div className="text-xs text-gray-400 italic">No resources</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          ${(() => {
                            const crewMemberRates = crew.memberIds.map(memberId => 
                              getCurrentRate(memberId)
                            );
                            const crewResourceRates = (crew.resourceIds || []).map(resourceId => {
                              const resource = resources.find(r => r.id === resourceId);
                              return resource?.defaultRate || 0;
                            });
                            const allRates = [...crewMemberRates, ...crewResourceRates];
                            return allRates.length > 0 
                              ? (allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length).toFixed(2)
                              : '0.00';
                          })()}/hr
                        </div>
                        <div className="text-xs text-gray-500">
                          {crew.memberIds.length} member{crew.memberIds.length !== 1 ? 's' : ''}
                          {(crew.resourceIds || []).length > 0 && `, ${crew.resourceIds.length} resource${crew.resourceIds.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(crew.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditCrew(crew.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(crew.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Hourly Rates Section */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Project Member Hourly Rates
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Set individual hourly rates for each project member in <strong>{selectedProject?.name}</strong>. 
                Each project has its own rate settings - rates set here will only apply to this project's expense calculations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500">
                {Object.keys(projectMemberRates).length} of {localMembers.length} members have rates set
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Bulk Rate Management */}
          {localMembers.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Bulk Rate Management</h4>
                  <p className="text-xs text-blue-600 mt-1">
                    Set the same rate for all members without individual rates
                    {(() => {
                      const membersWithoutRates = localMembers.filter(member => {
                        const memberRates = projectMemberRates[member.id];
                        return !memberRates || 
                               (Array.isArray(memberRates.rates) && memberRates.rates.length === 0) ||
                               (typeof memberRates === 'object' && !memberRates.rates);
                      });
                      return membersWithoutRates.length > 0 ? ` (${membersWithoutRates.length} members need rates)` : ' (All members have rates)';
                    })()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Enter rate"
                    min="0"
                    step="0.01"
                    className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    id="bulkRate"
                  />
                  <span className="text-sm text-blue-600">/hr</span>
                  <button
                    onClick={() => {
                      const bulkRate = parseFloat(document.getElementById('bulkRate').value);
                      if (!isNaN(bulkRate) && bulkRate >= 0) {
                        // Filter for members who don't have rates set in projectMemberRates
                        const membersWithoutRates = localMembers.filter(member => {
                          const memberRates = projectMemberRates[member.id];
                          // Check if member has no rates set (not in projectMemberRates or rates array is empty)
                          return !memberRates || 
                                 (Array.isArray(memberRates.rates) && memberRates.rates.length === 0) ||
                                 (typeof memberRates === 'object' && !memberRates.rates);
                        });
                        
                        console.log('🔍 Members without rates:', membersWithoutRates.length);
                        console.log('🔍 Members without rates details:', membersWithoutRates.map(m => ({ id: m.id, name: m.name })));
                        
                        if (membersWithoutRates.length === 0) {
                          alert('All members already have rates set. No changes needed.');
                          return;
                        }
                        
                        // Show confirmation with member names
                        const memberNames = membersWithoutRates.map(m => m.name).join(', ');
                        setBulkRateConfirmData({
                          rate: bulkRate,
                          members: membersWithoutRates,
                          memberNames: memberNames
                        });
                        setShowBulkRateConfirm(true);
                      } else {
                        alert('Please enter a valid hourly rate (0 or greater)');
                      }
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Apply to All
                  </button>
                </div>
              </div>
            </div>
          )}

          {localMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No project members found. Please ensure members are loaded for this project.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {localMembers.map((member) => {
                const memberId = member.id;
                // Get the current rate using the helper function
                const currentRate = getCurrentRate(memberId);
                
                // Ensure currentRate is always a number
                const safeCurrentRate = typeof currentRate === 'number' ? currentRate : 0;
                const isEditing = editingMemberRate === memberId;
                
                return (
                  <div key={memberId} className={`flex items-center justify-between p-4 rounded-lg border ${
                    safeCurrentRate ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          safeCurrentRate ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <span className={`text-sm font-medium ${
                            safeCurrentRate ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {getMemberName(memberId)}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {member.email || member.id}
                          </p>
                          {currentRate && (
                            <div className="text-xs text-green-600 mt-1">
                              ✓ Rate saved permanently
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white px-3 py-2 border border-gray-300 rounded-lg">
                              <span className="text-sm text-gray-600 font-medium">$</span>
                              <input
                                type="number"
                                value={newMemberRate}
                                onChange={(e) => setNewMemberRate(e.target.value)}
                                className="w-20 px-1 py-0 text-sm border-0 focus:ring-0 focus:outline-none"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                autoFocus
                              />
                              <span className="text-sm text-gray-600 font-medium">/hr</span>
                            </div>
                            <div className="flex items-center gap-1 bg-white px-3 py-2 border border-gray-300 rounded-lg">
                              <span className="text-sm text-gray-600 font-medium">$</span>
                              <input
                                type="number"
                                value={newMemberExtraRate}
                                onChange={(e) => setNewMemberExtraRate(e.target.value)}
                                className="w-20 px-1 py-0 text-sm border-0 focus:ring-0 focus:outline-none"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                              <span className="text-sm text-gray-600 font-medium">/hr extra</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 font-medium">Valid From:</label>
                            <input
                              type="date"
                              value={newRateValidFrom}
                              onChange={(e) => setNewRateValidFrom(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => handleSaveMemberRate(memberId)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Save rate permanently"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEditMemberRate}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancel editing"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {safeCurrentRate ? (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">
                                    ${safeCurrentRate.toFixed(2)}/hr
                                  </div>
                                  <div className="text-xs text-green-500">
                                    Saved permanently
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => handleEditMemberRate(memberId)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                    title="Edit rate"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMemberRate(memberId)}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                    title="Delete rate"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-sm text-gray-500 mb-1">No rate set</div>
                                  <div className="text-xs text-gray-400">Click to set rate</div>
                                </div>
                                <button
                                  onClick={() => handleEditMemberRate(memberId)}
                                  className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  Set Rate
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  
                  {/* Extra Hours Rate Section */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Extra Hours Rate
                      </div>
                      <div className="flex items-center gap-3">
                        {editingExtraRate === memberId ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white px-3 py-2 border border-gray-300 rounded-lg">
                              <span className="text-sm text-gray-600 font-medium">$</span>
                              <input
                                type="number"
                                value={newExtraRate}
                                onChange={(e) => setNewExtraRate(e.target.value)}
                                className="w-20 px-1 py-0 text-sm border-0 focus:ring-0 focus:outline-none"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                autoFocus
                              />
                              <span className="text-sm text-gray-600 font-medium">/hr</span>
                            </div>
                            <button
                              onClick={() => handleSaveExtraRate(memberId)}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Save extra rate"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEditExtraRate}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Cancel editing"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {projectMemberRates[`${memberId}_extra`] ? (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-sm font-bold text-blue-600">
                                    ${typeof projectMemberRates[`${memberId}_extra`] === 'number' ? projectMemberRates[`${memberId}_extra`].toFixed(2) : '0.00'}/hr
                                  </div>
                                  <div className="text-xs text-blue-500">
                                    Extra hours rate
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => handleEditExtraRate(memberId)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                    title="Edit extra rate"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExtraRate(memberId)}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                    title="Delete extra rate"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-sm text-gray-500 mb-1">No extra rate set</div>
                                  <div className="text-xs text-gray-400">Default: 1.5x regular rate</div>
                                </div>
                                <button
                                  onClick={() => handleEditExtraRate(memberId)}
                                  className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  Set Extra Rate
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {Object.keys(projectMemberRates).length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Rate Summary for {selectedProject?.name}</span>
                </div>
                <div className="text-sm text-green-600 font-medium">
                  {Object.keys(projectMemberRates).length} of {localMembers.length} members
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-green-700 mb-2">
                    These rates are <strong>saved permanently</strong> and will be used for expense calculations in the Actual Cost Tracking tab.
                  </p>
                  <div className="text-xs text-green-600">
                    💡 <strong>Tip:</strong> Each project maintains its own rate settings. Switch projects to manage different rate configurations.
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-700 mb-1">Average Rate:</div>
                  <div className="text-lg font-bold text-green-600">
                    ${(() => {
                      const rates = Object.values(projectMemberRates).filter(rate => typeof rate === 'number');
                      const average = rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
                      return typeof average === 'number' ? average.toFixed(2) : '0.00';
                    })()}/hr
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Role-Based Rate Management */}
          {localMembers.length > 0 ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Role-Based Rate Management
                  </h3>
                  <p className="text-sm text-purple-600 mt-1">
                    Set the same hourly rate for all members with a specific role in <strong>{selectedProject?.name}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    console.log('🔍 Debug: Refreshing roles...');
                    loadAvailableRoles();
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Roles
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Select Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Choose a role...</option>
                    {availableRoles.map(role => (
                      <option key={role} value={role}>
                        {role} ({getMembersByRole(role).length} members)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    value={roleRate}
                    onChange={handleRoleRateChange}
                    placeholder="Enter rate..."
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={applyRateToRole}
                    disabled={!selectedRole || !roleRate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <Save className="w-4 h-4" />
                    Apply to Role
                  </button>
                </div>
              </div>

              {selectedRole && (
                <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">
                    Members with role "{selectedRole}":
                  </h4>
                  <div className="space-y-1">
                    {getMembersByRole(selectedRole).map(member => (
                      <div key={member.id} className="flex justify-between items-center text-sm">
                        <span className="text-purple-700">{getMemberName(member.id)}</span>
                        <span className="text-purple-600">
                          Current: ${getCurrentRate(member.id) || 'Not set'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableRoles.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                    No roles detected from member data
                  </h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    The system couldn't find role information in the member data. This might be because:
                  </p>
                  <ul className="text-xs text-yellow-600 space-y-1 mb-3">
                    <li>• Member data doesn't contain role fields</li>
                    <li>• Role information is stored in a different field structure</li>
                    <li>• Members need to be loaded from ACC with proper permissions</li>
                  </ul>
                  <div className="text-xs text-yellow-600">
                    <strong>Debug Info:</strong> Check browser console for detailed member data structure.
                    <br />
                    <strong>Members loaded:</strong> {localMembers.length}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">No Members Loaded</h3>
              <p className="text-sm text-red-700">
                No members are available for role-based rate management. This could be because:
              </p>
              <ul className="text-xs text-red-600 mt-2 space-y-1">
                <li>• Members are not being passed from the parent component</li>
                <li>• ACC API is not returning member data</li>
                <li>• Project or hub selection is not working properly</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Rate Confirmation Dialog */}
      {showBulkRateConfirm && bulkRateConfirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Bulk Rate Assignment
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Apply rate <span className="font-semibold text-blue-600">${bulkRateConfirmData.rate}/hr</span> to{' '}
                  <span className="font-semibold text-blue-600">{bulkRateConfirmData.members.length}</span> members?
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Members:</p>
                  <p className="text-sm text-gray-600">{bulkRateConfirmData.memberNames}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkRateCancel}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkRateConfirm}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Rate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrewManagementTab;