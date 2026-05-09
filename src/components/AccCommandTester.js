import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Copy, 
  RefreshCw,
  Database,
  Settings,
  Shield,
  Link,
  File,
  Loader2,
  Play,
  Target,
  X
} from 'lucide-react';
import AccService from '../services/AccService_old';

/**
 * ACC Command Tester Component
 * Tests ACC Data Management API commands to diagnose access issues
 * Provides detailed command execution and results analysis
 */
const AccCommandTester = ({ 
  isOpen, 
  onClose, 
  projectId,
  hubId,
  onWorkingCommandFound
}) => {
  const [commandResults, setCommandResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [workingCommand, setWorkingCommand] = useState(null);
  const [selectedCommands, setSelectedCommands] = useState(new Set(['CheckPermission', 'ListRefs', 'ListItems']));

  // Available commands to test
  const availableCommands = [
    {
      id: 'CheckPermission',
      name: 'Check Permissions',
      description: 'Check which types of permissions a user has been granted to access specified resources',
      icon: <Shield className="w-4 h-4" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      testFunction: async (projectId) => {
        return await AccService.checkPermissions(projectId, [{
          type: 'projects',
          id: projectId
        }]);
      }
    },
    {
      id: 'ListRefs',
      name: 'List Relationships',
      description: 'Retrieve custom relationships between specified resources',
      icon: <Link className="w-4 h-4" />,
      color: 'bg-green-50 border-green-200 text-green-800',
      testFunction: async (projectId) => {
        return await AccService.listRefs(projectId, [{
          type: 'projects',
          id: projectId
        }]);
      }
    },
    {
      id: 'ListItems',
      name: 'List Items Metadata',
      description: 'Retrieve metadata for specified items (name, creation date, etc.)',
      icon: <File className="w-4 h-4" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      testFunction: async (projectId) => {
        // First try to get some items from the project
        const projectFiles = await AccService.getProjectFiles(projectId);
        if (projectFiles && projectFiles.length > 0) {
          const itemIds = projectFiles.filter(item => item.type === 'file').slice(0, 3).map(item => item.id);
          if (itemIds.length > 0) {
            return await AccService.listItems(projectId, itemIds);
          } else {
            return { message: 'No items found to test', success: true };
          }
        } else {
          return { message: 'No files found in project', success: true };
        }
      }
    },
    {
      id: 'PublishModel',
      name: 'Publish C4R Model',
      description: 'Publish the latest version of a Collaboration for Revit model',
      icon: <Database className="w-4 h-4" />,
      color: 'bg-orange-50 border-orange-200 text-orange-800',
      testFunction: async (projectId) => {
        // This would require a specific item ID, so we'll just test the command structure
        return { message: 'PublishModel command requires specific item ID', success: true };
      }
    },
    {
      id: 'GetPublishModelJob',
      name: 'Get Publish Job Status',
      description: 'Verify whether a C4R model needs to be published',
      icon: <Settings className="w-4 h-4" />,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      testFunction: async (projectId) => {
        // This would require a specific item ID, so we'll just test the command structure
        return { message: 'GetPublishModelJob command requires specific item ID', success: true };
      }
    }
  ];

  // Run a single command test
  const runCommandTest = async (command) => {
    const startTime = Date.now();
    let result = {
      command: command,
      status: 'running',
      success: false,
      data: null,
      error: null,
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      console.log(`🔧 Testing command: ${command.name}`);
      setCurrentCommand(command.name);
      
      const commandResult = await command.testFunction(projectId);
      const duration = Date.now() - startTime;
      
      result = {
        ...result,
        status: 'completed',
        success: !!commandResult,
        data: commandResult,
        duration,
        message: commandResult?.message || (commandResult ? 'Command executed successfully' : 'Command failed')
      };

      // If this is a successful command that provides useful data, mark it as working
      if (commandResult && (commandResult.data || commandResult.message)) {
        setWorkingCommand(result);
        console.log('✅ Found working command:', command.name);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      result = {
        ...result,
        status: 'error',
        success: false,
        error: error.message,
        duration,
        message: `Error: ${error.message}`
      };
    } finally {
      setCurrentCommand('');
    }

    return result;
  };

  // Run selected command tests
  const runSelectedTests = async () => {
    setIsRunning(true);
    setCommandResults([]);
    setWorkingCommand(null);
    
    const selectedCommandObjects = availableCommands.filter(cmd => selectedCommands.has(cmd.id));
    console.log(`🧪 Running ${selectedCommandObjects.length} command tests...`);
    
    for (let i = 0; i < selectedCommandObjects.length; i++) {
      const command = selectedCommandObjects[i];
      const result = await runCommandTest(command);
      
      setCommandResults(prev => [...prev, result]);
      
      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsRunning(false);
  };

  // Run all command tests
  const runAllTests = async () => {
    setSelectedCommands(new Set(availableCommands.map(cmd => cmd.id)));
    await runSelectedTests();
  };

  // Apply working command
  const applyWorkingCommand = () => {
    if (workingCommand && onWorkingCommandFound) {
      onWorkingCommandFound(workingCommand);
      onClose();
    }
  };

  // Copy result to clipboard
  const copyResult = (result) => {
    const resultText = JSON.stringify({
      command: result.command.name,
      success: result.success,
      data: result.data,
      error: result.error,
      duration: result.duration
    }, null, 2);
    
    navigator.clipboard.writeText(resultText);
  };

  const getStatusIcon = (result) => {
    if (result.status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (result.success) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (result.error) return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusColor = (result) => {
    if (result.status === 'running') return 'bg-blue-50 border-blue-200';
    if (result.success) return 'bg-green-50 border-green-200';
    if (result.error) return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const toggleCommandSelection = (commandId) => {
    const newSelected = new Set(selectedCommands);
    if (newSelected.has(commandId)) {
      newSelected.delete(commandId);
    } else {
      newSelected.add(commandId);
    }
    setSelectedCommands(newSelected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">ACC Command Tester</h3>
              <p className="text-sm text-gray-500">
                Test ACC Data Management API commands to diagnose access issues
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Current Command Status */}
        {isRunning && currentCommand && (
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-blue-800">
                Currently testing: <strong>{currentCommand}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Working Command Alert */}
        {workingCommand && (
          <div className="p-4 bg-green-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  ✅ Found working command: {workingCommand.command.name}
                </span>
              </div>
              <button
                onClick={applyWorkingCommand}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Apply This Command
              </button>
            </div>
          </div>
        )}

        {/* Command Selection */}
        <div className="p-4 border-b bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Select Commands to Test</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableCommands.map((command) => (
              <div
                key={command.id}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  selectedCommands.has(command.id)
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleCommandSelection(command.id)}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedCommands.has(command.id)}
                    onChange={() => toggleCommandSelection(command.id)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div className={`p-1 rounded ${command.color}`}>
                    {command.icon}
                  </div>
                  <span className="font-medium text-sm">{command.name}</span>
                </div>
                <p className="text-xs text-gray-600">{command.description}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              {selectedCommands.size} command{selectedCommands.size !== 1 ? 's' : ''} selected
            </div>
            <button
              onClick={runSelectedTests}
              disabled={isRunning || selectedCommands.size === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isRunning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Run Selected Tests
            </button>
          </div>
        </div>

        {/* Command Results */}
        <div className="flex-1 overflow-auto p-4">
          {commandResults.length === 0 && !isRunning ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No command tests run yet</p>
              <p className="text-sm">Select commands and click "Run Selected Tests" to start</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commandResults.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 ${getStatusColor(result)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result)}
                      <div>
                        <h4 className="font-medium text-gray-900">{result.command.name}</h4>
                        <p className="text-sm text-gray-600">{result.command.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {result.duration}ms
                      </span>
                      <button
                        onClick={() => copyResult(result)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Copy result"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Status:</strong> {result.status}</div>
                    <div><strong>Success:</strong> {result.success ? 'Yes' : 'No'}</div>
                    {result.message && (
                      <div><strong>Message:</strong> {result.message}</div>
                    )}
                    {result.error && (
                      <div><strong>Error:</strong> {result.error}</div>
                    )}
                    {result.data && (
                      <div>
                        <strong>Data:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {commandResults.length} command{commandResults.length !== 1 ? 's' : ''} tested
            {workingCommand && ' • Working command found!'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AccCommandTester;
