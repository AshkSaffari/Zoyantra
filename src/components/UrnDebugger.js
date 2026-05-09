import React, { useState, useEffect } from 'react';
import { FileText, TestTube, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import AccService from '../services/AccService_old';

const UrnDebugger = ({ selectedProject, availableFilesFromParent = [], selectedFilesFromParent = [], workflowId = null }) => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [testMultipleFiles, setTestMultipleFiles] = useState(false);
  const [selectedFilesForTesting, setSelectedFilesForTesting] = useState([]);

  // Load available files (only files, not folders)
  const loadAvailableFiles = async () => {
    if (!selectedProject?.id) return;
    
    setLoadingFiles(true);
    try {
      console.log('🔍 Loading files for URN debugger from project:', selectedProject.id);
      const allItems = await AccService.getProjectFiles(selectedProject.id);
      console.log('📁 All items loaded:', allItems);
      
      // Filter out folders - only show files for review creation
      const filesOnly = allItems.filter(item => item.type === 'file');
      console.log('📁 Files only (folders filtered out):', filesOnly);
      
      setAvailableFiles(filesOnly);
      
      // Clear selected file if it's a folder or if no files are available
      if (selectedFile && selectedFile.type === 'folder') {
        console.log('🧹 Clearing selected folder from URN debugger');
        setSelectedFile(null);
      }
      
      if (filesOnly.length === 0) {
        console.warn('⚠️ No files found in project. This could mean:');
        console.warn('1. Project has no files (only folders)');
        console.warn('2. API call failed to load files');
        console.warn('3. Files are in subfolders not accessible');
        
        // Clear selected file if no files are available
        setSelectedFile(null);
        
        // Try to load files from subfolders as a fallback
        console.log('🔄 Attempting to load files from subfolders...');
        try {
          const allItemsWithSubfolders = await AccService.getProjectFiles(selectedProject.id, null, true);
          const filesFromSubfolders = allItemsWithSubfolders.filter(item => item.type === 'file');
          console.log('📁 Files from subfolders:', filesFromSubfolders);
          
          if (filesFromSubfolders.length > 0) {
            setAvailableFiles(filesFromSubfolders);
            console.log('✅ Found files in subfolders, updating available files');
          }
        } catch (subfolderError) {
          console.error('❌ Error loading files from subfolders:', subfolderError);
        }
      }
    } catch (error) {
      console.error('❌ Error loading files for URN debugger:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Debug: Log when selectedFile changes
  useEffect(() => {
    console.log('🔍 URN Debugger selectedFile changed:', selectedFile);
  }, [selectedFile]);

  // Auto-select first file if none selected but files are available
  useEffect(() => {
    if (!selectedFile && availableFiles.length > 0) {
      console.log('🔧 Auto-selecting first available file:', availableFiles[0]);
      setSelectedFile(availableFiles[0]);
    }
  }, [availableFiles, selectedFile]);

  useEffect(() => {
    // If parent component has selected files, use those first
    if (selectedFilesFromParent.length > 0) {
      console.log('📁 Using selected files from parent component:', selectedFilesFromParent);
      
      // Find the selected files in availableFilesFromParent
      const selectedFileObjects = availableFilesFromParent.filter(file => 
        selectedFilesFromParent.includes(file.id)
      );
      
      console.log('📁 Selected file objects from parent:', selectedFileObjects);
      console.log('📁 Parent selectedFilesFromParent:', selectedFilesFromParent);
      console.log('📁 Parent availableFilesFromParent:', availableFilesFromParent);
      
      // Filter to only files (not folders)
      const filesOnly = selectedFileObjects.filter(item => item.type === 'file');
      console.log('📁 Files only after filtering:', filesOnly);
      setAvailableFiles(filesOnly);
      
      // Auto-select the first file if available
      if (filesOnly.length > 0) {
        console.log('📁 Auto-selecting first file from parent selection:', filesOnly[0]);
        setSelectedFile(filesOnly[0]);
        console.log('📁 Selected file set to:', filesOnly[0]);
      } else {
        console.log('⚠️ No files found in parent selection after filtering');
        console.log('⚠️ This might be because:');
        console.log('⚠️ 1. selectedFilesFromParent IDs do not match availableFilesFromParent IDs');
        console.log('⚠️ 2. Files are folders, not files');
        console.log('⚠️ 3. availableFilesFromParent is empty');
        
        // Fallback: Create file objects from selectedFilesFromParent URNs
        console.log('🔄 Trying fallback: creating file objects from URNs...');
        const fallbackFiles = selectedFilesFromParent.map(urn => ({
          id: urn,
          name: `File: ${urn.substring(0, 30)}...`,
          type: 'file',
          urn: urn
        }));
        
        console.log('📁 Fallback files created:', fallbackFiles);
        setAvailableFiles(fallbackFiles);
        
        if (fallbackFiles.length > 0) {
          console.log('📁 Auto-selecting first fallback file:', fallbackFiles[0]);
          setSelectedFile(fallbackFiles[0]);
        }
      }
      
      // Clear selected file if it's a folder
      if (selectedFile && selectedFile.type === 'folder') {
        console.log('🧹 Clearing selected folder from URN debugger (parent files)');
        setSelectedFile(null);
      }
    } else if (availableFilesFromParent.length > 0) {
      console.log('📁 Using all files from parent component:', availableFilesFromParent);
      const filesOnly = availableFilesFromParent.filter(item => item.type === 'file');
      setAvailableFiles(filesOnly);
      
      // Clear selected file if it's a folder
      if (selectedFile && selectedFile.type === 'folder') {
        console.log('🧹 Clearing selected folder from URN debugger (parent files)');
        setSelectedFile(null);
      }
    } else {
      loadAvailableFiles();
    }
  }, [selectedProject?.id, availableFilesFromParent, selectedFilesFromParent]);

  // Test multiple files with different URN formats
  const testMultipleFilesWithUrns = async () => {
    const results = [];
    
    // Test with different files if available
    const filesToTest = testMultipleFiles ? selectedFilesForTesting : [selectedFile];
    
    for (const file of filesToTest) {
      if (!file) continue;
      
      console.log(`🧪 Testing file: ${file.name} (${file.id})`);
      const fileResults = await testUrnMethods(file.id, file.urn);
      
      // Add file context to results
      const fileContextResults = fileResults.map(result => ({
        ...result,
        fileName: file.name,
        fileId: file.id,
        fileUrn: file.urn
      }));
      
      results.push(...fileContextResults);
    }
    
    return results;
  };

  // Test different URN types and methods
  const testUrnMethods = async (fileId, fileUrn) => {
    const results = [];
    
    // Test 1: Original URN (as-is)
    try {
      const result1 = await testUrnMethod('Original URN', fileUrn);
      results.push(result1);
    } catch (error) {
      results.push({
        method: 'Original URN',
        urn: fileUrn,
        status: 'error',
        error: error.message
      });
    }

    // Test 2: Base64 only (extract from lineage URN) - This is what ACC Reviews API expects
    if (fileUrn.startsWith('urn:adsk.wipprodanz:dm.lineage:')) {
      try {
        const base64Part = fileUrn.replace('urn:adsk.wipprodanz:dm.lineage:', '');
        console.log('🧪 Testing Base64 Only method (ACC Reviews API format)...');
        const result2 = await testUrnMethod('Base64 Only (Reviews API Format)', base64Part);
        results.push(result2);
      } catch (error) {
        results.push({
          method: 'Base64 Only (Reviews API Format)',
          urn: fileUrn.replace('urn:adsk.wipprodanz:dm.lineage:', ''),
          status: 'error',
          error: error.message
        });
      }
    }

    // Test 3: File version URN (fetch from API)
    try {
      const fileVersion = await AccService.getFileVersionForReview(selectedProject.id, fileId);
      const result3 = await testUrnMethod('File Version URN', fileVersion.urn);
      results.push(result3);
    } catch (error) {
      results.push({
        method: 'File Version URN',
        urn: 'Failed to fetch',
        status: 'error',
        error: error.message
      });
    }

    // Test 4: Different URN formats
    if (fileUrn.startsWith('urn:adsk.wipprodanz:dm.lineage:')) {
      const base64Part = fileUrn.replace('urn:adsk.wipprodanz:dm.lineage:', '');
      
      // Test 4a: fs.file format
      try {
        const fsFileUrn = `urn:adsk.wipprodanz:fs.file:${base64Part}`;
        const result4a = await testUrnMethod('FS File URN', fsFileUrn);
        results.push(result4a);
      } catch (error) {
        results.push({
          method: 'FS File URN',
          urn: `urn:adsk.wipprodanz:fs.file:${base64Part}`,
          status: 'error',
          error: error.message
        });
      }

      // Test 4b: dm.file format
      try {
        const dmFileUrn = `urn:adsk.wipprodanz:dm.file:${base64Part}`;
        const result4b = await testUrnMethod('DM File URN', dmFileUrn);
        results.push(result4b);
      } catch (error) {
        results.push({
          method: 'DM File URN',
          urn: `urn:adsk.wipprodanz:dm.file:${base64Part}`,
          status: 'error',
          error: error.message
        });
      }
    }

    // Test 5: Download API verification
    try {
      console.log(`🔍 Testing Download API with project ID: ${selectedProject.id}`);
      const downloadResult = await AccService.getFileDownloadDetails(selectedProject.id, fileUrn);
      results.push({
        method: 'Download API Test',
        urn: fileUrn,
        status: 'success',
        result: downloadResult,
        details: 'Download API verification successful'
      });
    } catch (error) {
      console.log(`⚠️ Download API failed: ${error.message}`);
      results.push({
        method: 'Download API Test',
        urn: fileUrn,
        status: 'error',
        error: error.message,
        details: 'Download API verification failed'
      });
    }

    // Test 6: Download API with clean project ID (without b. prefix)
    try {
      const cleanProjectId = selectedProject.id.startsWith('b.') ? selectedProject.id.substring(2) : selectedProject.id;
      console.log(`🔍 Testing Download API with clean project ID: ${cleanProjectId}`);
      const downloadResultClean = await AccService.getFileDownloadDetails(cleanProjectId, fileUrn);
      results.push({
        method: 'Download API Test (Clean Project ID)',
        urn: fileUrn,
        status: 'success',
        result: downloadResultClean,
        details: 'Download API verification successful with clean project ID'
      });
    } catch (error) {
      console.log(`⚠️ Download API with clean project ID failed: ${error.message}`);
      results.push({
        method: 'Download API Test (Clean Project ID)',
        urn: fileUrn,
        status: 'error',
        error: error.message,
        details: 'Download API verification failed with clean project ID'
      });
    }

    // Test 7: Minimal payload test (no items)
    try {
      console.log('🧪 Testing minimal payload (no items)...');
      const minimalPayload = {
        name: 'Test Review - Minimal',
        fileVersions: [],
        workflowId: workflowId || '3fa5f321-27b2-4b79-900f-5309e395247c',
        notes: 'Minimal test review'
      };
      console.log('🔍 Minimal payload:', minimalPayload);
      
      const response = await AccService.createReview(selectedProject.id, minimalPayload);
      results.push({
        method: 'Minimal Payload Test',
        urn: 'N/A',
        status: 'success',
        result: response,
        details: 'Minimal payload (no fileVersions) successful'
      });
    } catch (error) {
      console.log(`⚠️ Minimal payload failed: ${error.message}`);
      results.push({
        method: 'Minimal Payload Test',
        urn: 'N/A',
        status: 'error',
        error: error.message,
        details: 'Minimal payload (no fileVersions) failed'
      });
    }

    // Test 8: Direct base64 conversion test (most likely to work)
    if (fileUrn.startsWith('urn:adsk.wipprodanz:dm.lineage:')) {
      try {
        const base64Part = fileUrn.replace('urn:adsk.wipprodanz:dm.lineage:', '');
        console.log('🧪 Testing direct base64 conversion (most likely to work)...');
        const result8 = await testUrnMethod('Direct Base64 (Most Likely)', base64Part);
        results.push(result8);
      } catch (error) {
        results.push({
          method: 'Direct Base64 (Most Likely)',
          urn: fileUrn.replace('urn:adsk.wipprodanz:dm.lineage:', ''),
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  };

  // Test a specific URN method with different file version structures
  const testUrnMethod = async (methodName, urn) => {
    console.log(`🧪 Testing ${methodName} with URN: ${urn}`);
    console.log(`🔍 Using workflow ID: ${workflowId || 'default (3fa5f321-27b2-4b79-900f-5309e395247c)'}`);
    
    // Test different file version structures
    const fileVersionStructures = {
      // Structure 1: Object with urn property
      objectWithUrn: [{ urn: urn }],
      
      // Structure 2: Array of URN strings
      arrayOfStrings: [urn],
      
      // Structure 3: Object with id property
      objectWithId: [{ id: urn }],
      
      // Structure 4: Object with versionId property
      objectWithVersionId: [{ versionId: urn }],
      
      // Structure 5: Object with fileId property
      objectWithFileId: [{ fileId: urn }],
      
      // Structure 6: Object with both urn and id
      objectWithUrnAndId: [{ urn: urn, id: urn }],
      
      // Structure 7: Object with urn and version
      objectWithUrnAndVersion: [{ urn: urn, version: 1 }],
      
      // Structure 8: Object with urn and type
      objectWithUrnAndType: [{ urn: urn, type: "file" }]
    };
    
    // Create test payloads for each structure using correct ACC Reviews API format
    const testPayloads = Object.entries(fileVersionStructures).map(([structureName, fileVersions]) => {
      // Use correct ACC Reviews API field names and structure
      const payload = {
        name: `Test Review - ${methodName} (${structureName})`,
        fileVersions: fileVersions.map(fileVersion => ({
          urn: fileVersion.urn || fileVersion
        })),
        workflowId: workflowId || '3fa5f321-27b2-4b79-900f-5309e395247c',
        notes: 'Test review created via URN debugger'
      };
      
      console.log(`🔍 Testing ${structureName} with payload:`, payload);
      console.log(`🔍 Payload keys:`, Object.keys(payload));
      console.log(`🔍 Payload values:`, Object.values(payload));
      
      // Remove any undefined or null values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === null) {
          delete payload[key];
        }
      });
      
      return {
        ...payload,
        structureName: structureName
      };
    });
    
    // Try JSON API format as ACC APIs often expect this structure
    const jsonApiPayload = {
      data: {
        type: "reviews",
        attributes: {
          name: `Test Review - ${methodName}`,
          workflowId: workflowId || '3fa5f321-27b2-4b79-900f-5309e395247c'
        },
        relationships: {
          fileVersions: {
            data: [{ urn: urn }]
          }
        }
      }
    };
    
    console.log(`📊 Testing ${testPayloads.length} different file version structures for ${methodName}`);

    // Test each file version structure
    const results = [];
    
    for (const payload of testPayloads) {
      try {
        console.log(`🧪 Testing ${methodName} with ${payload.structureName} structure...`);
        const response = await AccService.createReview(selectedProject.id, payload);
        
        results.push({
          method: methodName,
          urn: urn,
          structure: payload.structureName,
          status: 'success',
          result: response,
          details: `Review creation successful with ${payload.structureName} structure`
        });
        
        // If one structure works, return it immediately
        return results[0];
        
      } catch (error) {
        console.log(`⚠️ ${payload.structureName} structure failed: ${error.message}`);
        results.push({
          method: methodName,
          urn: urn,
          structure: payload.structureName,
          status: 'error',
          error: error.message,
          details: `${payload.structureName} structure failed`
        });
      }
    }
    
    // Try JSON API format as final fallback
    try {
      console.log(`🧪 Testing ${methodName} with JSON API format...`);
      const jsonResponse = await AccService.createReview(selectedProject.id, jsonApiPayload);
      
      return {
        method: methodName,
        urn: urn,
        structure: 'JSON API',
        status: 'success',
        result: jsonResponse,
        details: 'Review creation successful with JSON API format'
      };
    } catch (jsonError) {
      // Return the first error result with summary
      return {
        method: methodName,
        urn: urn,
        structure: 'All structures tested',
        status: 'error',
        error: `All ${results.length} structures failed. First error: ${results[0]?.error || 'Unknown error'}`,
        details: `Tested ${results.length} different file version structures, all failed`,
        allResults: results
      };
    }
  };

  // Run comprehensive tests
  const runTests = async () => {
    if (testMultipleFiles) {
      if (selectedFilesForTesting.length === 0) {
        alert('Please select files to test first');
        return;
      }
    } else {
      if (!selectedFile) {
        alert('Please select a file first');
        return;
      }
      
      if (selectedFile.type !== 'file') {
        alert('Please select a file, not a folder. Only files can be included in reviews.');
        return;
      }
    }
    
    setIsRunning(true);
    setTestResults([]);

    try {
      console.log('🚀 Starting URN debugging tests...');
      const results = await testMultipleFilesWithUrns();
      setTestResults(results);
      console.log('✅ URN debugging tests completed:', results);
    } catch (error) {
      console.error('❌ Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Clear results
  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TestTube className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">URN Debugger</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={loadAvailableFiles}
            disabled={loadingFiles}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingFiles ? 'animate-spin' : ''}`} />
            Refresh Files
          </button>
          {selectedFilesFromParent.length > 0 && (
            <button
              onClick={() => {
                console.log('🔄 Refreshing from parent selected files...');
                // Re-trigger the useEffect by updating a dummy state
                setAvailableFiles([]);
                setTimeout(() => {
                  const selectedFileObjects = availableFilesFromParent.filter(file => 
                    selectedFilesFromParent.includes(file.id)
                  );
                  const filesOnly = selectedFileObjects.filter(item => item.type === 'file');
                  setAvailableFiles(filesOnly);
                  if (filesOnly.length > 0) {
                    setSelectedFile(filesOnly[0]);
                  }
                }, 100);
              }}
              className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Use Parent Files
            </button>
          )}
          <button
            onClick={clearResults}
            className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* File Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Select File to Test</h3>
        {selectedFilesFromParent.length > 0 ? (
          <p className="text-sm text-blue-600 mb-3">
            📁 Using {selectedFilesFromParent.length} selected file(s) from Review Creation form
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-3">Only files are shown (folders are filtered out for review creation)</p>
        )}
        {loadingFiles ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2">Loading files...</span>
          </div>
        ) : availableFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No files found</p>
            <p className="text-sm">Only files are shown (folders are filtered out)</p>
            <div className="mt-4 space-x-2">
              <button
                onClick={loadAvailableFiles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh Files
              </button>
              <button
                onClick={() => {
                  // Add some sample files for testing
                  const sampleFiles = [
                    {
                      id: 'sample-file-1',
                      name: 'Sample File 1.pdf',
                      type: 'file',
                      urn: 'urn:adsk.wipprodanz:dm.lineage:sample1'
                    },
                    {
                      id: 'sample-file-2', 
                      name: 'Sample File 2.dwg',
                      type: 'file',
                      urn: 'urn:adsk.wipprodanz:dm.lineage:sample2'
                    }
                  ];
                  setAvailableFiles(sampleFiles);
                  console.log('📁 Added sample files for testing');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Load Sample Files
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => {
                  // Only allow selecting files, not folders
                  if (file.type === 'file') {
                    setSelectedFile(file);
                  } else {
                    console.warn('⚠️ Cannot select folder for URN testing:', file.name);
                    alert('Please select a file, not a folder. Only files can be tested for URN formats.');
                  }
                }}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedFile?.id === file.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${file.type !== 'file' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm truncate">{file.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  URN: {file.urn ? file.urn.substring(0, 30) + '...' : 'No URN'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Testing Mode Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Testing Mode</h3>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="testingMode"
                checked={!testMultipleFiles}
                onChange={() => setTestMultipleFiles(false)}
                className="mr-2"
              />
              Single File Testing
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="testingMode"
                checked={testMultipleFiles}
                onChange={() => setTestMultipleFiles(true)}
                className="mr-2"
              />
              Multiple Files Testing
            </label>
          </div>
        </div>
        
        {testMultipleFiles && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Select Files to Test:</h4>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-white">
              {availableFiles.map((file) => (
                <label key={file.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedFilesForTesting.some(f => f.id === file.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFilesForTesting(prev => [...prev, file]);
                      } else {
                        setSelectedFilesForTesting(prev => prev.filter(f => f.id !== file.id));
                      }
                    }}
                    className="mr-2"
                  />
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">{file.name}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedFilesForTesting(availableFiles.slice(0, 3))}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Select First 3 Files
              </button>
              <button
                onClick={() => setSelectedFilesForTesting([])}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Clear All
              </button>
              <span className="text-sm text-gray-600">
                {selectedFilesForTesting.length} file(s) selected
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Selected File Info */}
      {!testMultipleFiles && selectedFile && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Selected File</h3>
            <button
              onClick={() => {
                console.log('🧹 Manually clearing selected file');
                setSelectedFile(null);
              }}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Clear Selection
            </button>
          </div>
          <div className="space-y-2">
            <div><strong>Name:</strong> {selectedFile.name}</div>
            <div><strong>ID:</strong> {selectedFile.id}</div>
            <div><strong>URN:</strong> {selectedFile.urn}</div>
            <div><strong>Type:</strong> 
              <span className={`ml-1 px-2 py-1 text-xs rounded ${
                selectedFile.type === 'file' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {selectedFile.type}
              </span>
            </div>
            {selectedFile.type === 'folder' && (
              <div className="text-red-600 text-sm font-medium">
                ⚠️ Warning: This is a folder, not a file. Please select a file for URN testing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Button */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={runTests}
            disabled={!selectedFile || isRunning}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {isRunning ? 'Running Tests...' : 'Run URN Tests'}
          </button>
          
          {/* Debug info */}
          <div className="text-xs text-gray-500">
            {!selectedFile ? 'No file selected' : `Selected: ${selectedFile.name}`}
          </div>
        </div>
        
        {/* Debug button to force select a file */}
        {availableFiles.length > 0 && !selectedFile && (
          <div className="mt-2">
            <button
              onClick={() => {
                console.log('🔧 Debug: Force selecting first available file:', availableFiles[0]);
                setSelectedFile(availableFiles[0]);
              }}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            >
              Debug: Select First File
            </button>
          </div>
        )}
        
        {/* Force select from parent files */}
        {selectedFilesFromParent.length > 0 && !selectedFile && (
          <div className="mt-2">
            <button
              onClick={() => {
                console.log('🔧 Force selecting from parent files...');
                const fallbackFiles = selectedFilesFromParent.map(urn => ({
                  id: urn,
                  name: `File: ${urn.substring(0, 30)}...`,
                  type: 'file',
                  urn: urn
                }));
                setAvailableFiles(fallbackFiles);
                setSelectedFile(fallbackFiles[0]);
                console.log('📁 Force selected file:', fallbackFiles[0]);
              }}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Force Select from Parent
            </button>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Results</h3>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  result.status === 'success'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold">{result.method}</span>
                    {result.fileName && (
                      <span className="text-sm text-gray-600">({result.fileName})</span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      result.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div><strong>URN:</strong> <code className="bg-gray-100 px-1 rounded">{result.urn}</code></div>
                  {result.structure && <div><strong>Structure:</strong> <code className="bg-blue-100 px-1 rounded">{result.structure}</code></div>}
                  {result.details && <div><strong>Details:</strong> {result.details}</div>}
                  {result.error && (
                    <div className="text-red-600">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                  {result.result && (
                    <div className="text-green-600">
                      <strong>Result:</strong> {JSON.stringify(result.result, null, 2)}
                    </div>
                  )}
                  {result.allResults && (
                    <div className="mt-2">
                      <strong>All Tested Structures:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        {result.allResults.map((res, idx) => (
                          <li key={idx} className="text-xs flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${res.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span>{res.structure}: {res.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {testResults.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-green-600 font-semibold">
                ✅ Successful: {testResults.filter(r => r.status === 'success').length}
              </div>
            </div>
            <div>
              <div className="text-red-600 font-semibold">
                ❌ Failed: {testResults.filter(r => r.status === 'error').length}
              </div>
            </div>
          </div>
          
          {testResults.filter(r => r.status === 'success').length > 0 && (
            <div className="mt-3">
              <h4 className="font-semibold mb-2">Working Methods:</h4>
              <ul className="list-disc list-inside space-y-1">
                {testResults
                  .filter(r => r.status === 'success')
                  .map((result, index) => (
                    <li key={index} className="text-sm">
                      <strong>{result.method}:</strong> {result.urn}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UrnDebugger;
