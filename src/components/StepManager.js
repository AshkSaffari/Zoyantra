import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  Upload,
  Download,
  File,
  User
} from 'lucide-react';

const StepManager = ({ 
  steps, 
  onAddStep, 
  onUpdateStep, 
  onRemoveStep, 
  onAddFileToStep, 
  onRemoveFileFromStep,
  onOpenFolderBrowser,
  projectMembers,
}) => {
  const [editingStep, setEditingStep] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const [quickAddName, setQuickAddName] = useState('');

  const toggleStepExpansion = (stepId) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleQuickAdd = () => {
    if (quickAddName.trim()) {
      const newStep = {
        id: `step-${Date.now()}`,
        name: quickAddName.trim(),
        description: '',
        status: 'pending',
        files: [],
      };
      onAddStep(newStep);
      setQuickAddName('');
    }
  };

  const handleEdit = (step) => {
    setEditingStep(step);
  };

  const handleSave = () => {
    if (editingStep) {
      onUpdateStep(editingStep.id, 'name', editingStep.name);
      onUpdateStep(editingStep.id, 'description', editingStep.description);
      onUpdateStep(editingStep.id, 'status', editingStep.status);
      onUpdateStep(editingStep.id, 'assignedTo', editingStep.assignedTo);
      setEditingStep(null);
    }
  };

  const handleCancel = () => {
    setEditingStep(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'pending': return '⏳';
      case 'blocked': return '🚫';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Add Step */}
      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
        <input
          type="text"
          value={quickAddName}
          onChange={(e) => setQuickAddName(e.target.value)}
          placeholder="Quick add step..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === 'Enter' && handleQuickAdd()}
        />
        <button
          onClick={handleQuickAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </button>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isExpanded = expandedSteps.has(step.id);
          const isEditing = editingStep?.id === step.id;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border border-gray-200 rounded-lg bg-white"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleStepExpansion(step.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-500">
                          {index + 1}.
                        </span>
                        <span className="font-medium text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingStep.name}
                              onChange={(e) => setEditingStep({...editingStep, name: e.target.value})}
                              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            step.name || `Step ${index + 1}`
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {step.files.length > 0 && `${step.files.length} file${step.files.length !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getStatusColor(step.status || 'pending')}`}>
                        {getStatusIcon(step.status || 'pending')}
                        <span>{(step.status || 'pending').replace('-', ' ')}</span>
                      </span>
                      
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={handleSave}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEdit(step)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Edit Step"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onRemoveStep(step.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Step"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4"
                    >
                      {/* Step Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          {isEditing ? (
                            <textarea
                              value={editingStep.description || ''}
                              onChange={(e) => setEditingStep({...editingStep, description: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows="3"
                            />
                          ) : (
                            <p className="text-sm text-gray-600">
                              {step.description || 'No description provided'}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          {isEditing ? (
                            <select
                              value={editingStep.status || 'pending'}
                              onChange={(e) => setEditingStep({...editingStep, status: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="blocked">Blocked</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(step.status || 'pending')}`}>
                              {getStatusIcon(step.status || 'pending')}
                              <span className="ml-1">{(step.status || 'pending').replace('-', ' ')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Assigned To */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                        {isEditing ? (
                          <select
                            value={editingStep.assignedTo || ''}
                            onChange={(e) => setEditingStep({...editingStep, assignedTo: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select assignee</option>
                            {projectMembers.map(member => (
                              <option key={member.id} value={member.id}>
                                {member.name || member.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="w-4 h-4 mr-2" />
                            {step.assignedTo ? (
                              projectMembers.find(m => m.id === step.assignedTo)?.name || 
                              projectMembers.find(m => m.id === step.assignedTo)?.email || 
                              'Unknown'
                            ) : (
                              'Unassigned'
                            )}
                          </div>
                        )}
                      </div>

                      {/* Files Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="font-medium text-gray-700">Files</h6>
                          <button
                            onClick={() => onOpenFolderBrowser(step.id)}
                            className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            Add Files
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {step.files && step.files.length > 0 ? (
                            step.files.map((file, fileIndex) => (
                              <div key={fileIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                <div className="flex items-center space-x-2">
                                  <File className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-700">{file.name}</span>
                                  {file.version && (
                                    <span className="text-xs text-gray-500">(v{file.version})</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => onRemoveFileFromStep(step.id, fileIndex)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                  title="Remove file"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 italic">No files attached to this step</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {steps.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No steps added yet. Use the quick add above to create your first step.</p>
        </div>
      )}
    </div>
  );
};

export default StepManager;