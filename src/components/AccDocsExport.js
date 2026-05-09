import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import AccDocsFolderPicker from './AccDocsFolderPicker';
import AccDocsService from '../services/AccDocsService';
import PdfExportService from '../services/PdfExportService';
import { generateFileName } from '../utils/fileNameHelper';
import * as XLSX from 'xlsx';

/**
 * ACC Docs Export Component
 * Handles exporting timesheet data and uploading to ACC Docs
 */
export default function AccDocsExport({ 
  projectId, 
  projectName, 
  accessToken, 
  timesheetData = [],
  archivedData = []
}) {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('csv');
  const [manualToken, setManualToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const effectiveToken = accessToken || manualToken;

  // Load current user info
  useEffect(() => {
    async function loadUser() {
      if (effectiveToken) {
        try {
          const user = await AccDocsService.getCurrentUser(effectiveToken);
          setCurrentUser(user);
        } catch (error) {
          console.error('Failed to load user info:', error);
        }
      }
    }
    loadUser();
  }, [effectiveToken]);

  const generateFile = async (type) => {
    const allData = [...timesheetData, ...archivedData];
    
    if (type === 'csv') {
      return generateCSV(allData);
    } else if (type === 'json') {
      return generateJSON(allData);
    } else if (type === 'pdf') {
      return await generateStyledPDF(allData);
    }
    throw new Error(`Unsupported export type: ${type}`);
  };

  const generateCSV = (data) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TimesheetData');
    return XLSX.write(wb, { bookType: 'csv', type: 'array' });
  };

  const generateJSON = (data) => {
    const jsonString = JSON.stringify(data, null, 2);
    return new TextEncoder().encode(jsonString);
  };

  const generateStyledPDF = async (data) => {
    try {
      // Generate styled PDF using the new service
      const doc = await PdfExportService.generateTimesheetPDF(data, {
        title: 'Timesheet Export Report',
        projectName: projectName,
        userName: currentUser?.userName || 'Unknown User',
        dateRange: getDateRange(data),
        includeArchived: true
      });

      // Get PDF as blob
      return PdfExportService.getPDFBlob(doc);
    } catch (error) {
      console.error('Error generating styled PDF:', error);
      // Fallback to simple PDF
      return generateSimplePDF(data);
    }
  };

  const generateSimplePDF = (data) => {
    // Fallback simple PDF generation
    const content = data.map(entry => 
      `Date: ${entry.date}, User: ${entry.userName}, Hours: ${entry.hours}, Output: ${entry.output}`
    ).join('\n');
    
    const pdfContent = `Timesheet Export\n\n${content}`;
    return new TextEncoder().encode(pdfContent);
  };

  const getDateRange = (data) => {
    if (data.length === 0) return null;
    
    const dates = data.map(item => new Date(item.date)).filter(date => !isNaN(date));
    if (dates.length === 0) return null;
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
  };

  const handleExport = async (type) => {
    if (!projectId) {
      alert('⚠️ No project selected. Please select a project first.');
      return;
    }

    if (!selectedFolder) {
      alert('⚠️ Please select a folder first!');
      return;
    }

    if (!currentUser) {
      alert('⚠️ User information not available. Please try again.');
      return;
    }

    if (!effectiveToken) {
      alert('⚠️ No access token available. Please provide a 3-legged OAuth token.');
      return;
    }

    setExporting(true);
    setProgress(0);
    setExportStatus('Preparing export...');
    
    try {
      // Step 1: Generate file
      setProgress(20);
      setExportStatus('Generating file...');
      const fileData = await generateFile(type);
      const fileName = generateFileName(projectName, type, currentUser.userName || 'Unknown');
      
      // Step 2: Create file blob
      setProgress(40);
      setExportStatus('Preparing file for upload...');
      const file = new Blob([fileData], { 
        type: type === 'csv' ? 'text/csv' : 
              type === 'json' ? 'application/json' : 
              'application/pdf' 
      });

      console.log(`📤 Uploading ${type.toUpperCase()} file to ACC Docs...`);
      console.log(`📁 Project ID: ${projectId}`);
      console.log(`📁 Folder ID: ${selectedFolder}`);
      console.log(`📄 File Name: ${fileName}`);

      // Step 3: Upload to ACC Docs
      setProgress(60);
      setExportStatus('Uploading to ACC Docs...');
      await AccDocsService.uploadFile(projectId, selectedFolder, file, fileName, effectiveToken);
      
      setProgress(100);
      setExportStatus('✅ Successfully exported and uploaded!');
      alert(`✅ Successfully exported and uploaded: ${fileName}`);
    } catch (error) {
      console.error('Export failed:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('404')) {
        errorMessage = 'Project not found. Please check if the project ID is correct and you have access to it.';
      } else if (error.message.includes('403')) {
        errorMessage = 'Access denied. Please check your permissions for this project.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Authentication failed. Please check your token.';
      }
      
      setExportStatus(`❌ Export failed: ${errorMessage}`);
      alert(`❌ Export failed: ${errorMessage}`);
    } finally {
      setExporting(false);
      // Clear status after 3 seconds
      setTimeout(() => {
        setExportStatus('');
        setProgress(0);
      }, 3000);
    }
  };

  if (!effectiveToken) {
    return (
      <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl shadow-lg">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mr-4">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-800">ACC Docs Integration</h3>
            <p className="text-yellow-700">3-legged OAuth token required for file uploads</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-white/80 rounded-xl border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-2">Token Information</h4>
            <p className="text-sm text-gray-600 mb-3">
              ACC Docs integration requires a 3-legged OAuth token with <code className="bg-gray-100 px-2 py-1 rounded">data:read data:write</code> scopes.
            </p>
            <p className="text-sm text-gray-600">
              This is different from the 2-legged token used for other operations. You can get this token from the Autodesk OAuth flow.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {showTokenInput ? 'Hide Token Input' : 'Enter 3-Legged Token Manually'}
            </button>
            
            {showTokenInput && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    3-Legged OAuth Token
                  </label>
                  <textarea
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste your 3-legged OAuth token here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                    rows="4"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      if (manualToken) {
                        navigator.clipboard.writeText(manualToken).then(() => {
                          alert('✅ Token copied to clipboard!');
                        });
                      }
                    }}
                    disabled={!manualToken}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Copy Token
                  </button>
                  <button
                    onClick={() => setManualToken('')}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
          <div>
            <h3 className="font-semibold text-yellow-800">No Project Selected</h3>
            <p className="text-yellow-700 text-sm">Please select a project first to export timesheet data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">📤 Export to ACC Docs</h3>
        <p className="text-blue-800 text-sm">
          Export your timesheet data and upload it directly to ACC Docs for easy sharing and collaboration.
        </p>
        <div className="mt-2 text-xs text-blue-600">
          <p>📁 Project: <strong>{projectName}</strong></p>
          <p>🆔 Project ID: <code className="bg-blue-100 px-1 rounded">{projectId}</code></p>
        </div>
      </div>

      <AccDocsFolderPicker
        projectId={projectId}
        accessToken={accessToken}
        onSelect={setSelectedFolder}
        selectedFolder={selectedFolder}
      />

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="csv">CSV (Excel compatible)</option>
            <option value="json">JSON (Data exchange)</option>
            <option value="pdf">PDF (Document)</option>
          </select>
        </div>

        {/* Progress Indicator */}
        {exporting && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">{exportStatus}</span>
              <span className="text-sm text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={!selectedFolder || exporting || !projectId}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                📊 Export CSV
              </>
            )}
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={!selectedFolder || exporting || !projectId}
            className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                📋 Export JSON
              </>
            )}
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={!selectedFolder || exporting || !projectId}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                📄 Export PDF
              </>
            )}
          </button>
        </div>
      </div>

      {currentUser && (
        <div className="text-sm text-gray-600">
          <p>👤 Exporting as: <strong>{currentUser.userName || 'Unknown User'}</strong></p>
          <p>📁 Project: <strong>{projectName}</strong></p>
        </div>
      )}
    </div>
  );
}
