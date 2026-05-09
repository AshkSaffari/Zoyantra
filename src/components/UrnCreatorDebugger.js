import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Play, CheckCircle, XCircle, AlertCircle, RefreshCw, Download, Upload } from 'lucide-react';
import AccService from '../services/AccService_old';

const UrnCreatorDebugger = ({ selectedProject, selectedFiles = [] }) => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [testConfig, setTestConfig] = useState({
    testAllUrnStyles: true,
    testAllReviewStyles: true,
    testMixedApproaches: true,
    includeFallbacks: true
  });

  // Use files from parent (Review Creation form) instead of loading separately
  const loadAvailableFiles = useCallback(async () => {
    if (!selectedProject?.id) return;
    
    setLoadingFiles(true);
    try {
      console.log('🔍 Using files from parent Review Creation form...');
      
      // If we have selected files from parent, use those
      if (selectedFiles.length > 0) {
        const filesFromParent = selectedFiles.map(fileId => ({
          id: fileId,
          name: `File from Review Creation: ${fileId.substring(0, 20)}...`,
          type: 'file',
          urn: fileId
        }));
        setAvailableFiles(filesFromParent);
        console.log('📁 Using files from parent Review Creation form:', filesFromParent.length);
        
        if (filesFromParent.length > 0 && !selectedFile) {
          setSelectedFile(filesFromParent[0]);
        }
      } else {
        // Fallback: load files from project if no parent files
        console.log('🔍 No parent files, loading from project...');
        const files = await AccService.getProjectFiles(selectedProject.id);
        const filesOnly = files.filter(item => item.type === 'file');
        setAvailableFiles(filesOnly);
        console.log('📁 Loaded files from project:', filesOnly.length);
        
        if (filesOnly.length > 0 && !selectedFile) {
          setSelectedFile(filesOnly[0]);
        }
      }
    } catch (error) {
      console.error('❌ Error loading files:', error);
    } finally {
      setLoadingFiles(false);
    }
  }, [selectedProject?.id, selectedFiles, selectedFile]);

  // Auto-load files when project or selected files change
  useEffect(() => {
    if (selectedProject?.id) {
      loadAvailableFiles();
    }
  }, [selectedProject?.id, selectedFiles, loadAvailableFiles]);


  // Different URN creation styles - BASED ON OFFICIAL AUTODESK DOCUMENTATION
  const createUrnStyles = (fileId, base64Part) => {
    return {
      // Style 1: OFFICIAL AUTODESK FORMAT (PRIORITY TEST)
      officialAutodeskFormat: `urn:adsk.wipprod:fs.file:vf.${base64Part}?version=1`,
      
      // Style 2: OFFICIAL FORMAT WITH VERSION 2
      officialFormatV2: `urn:adsk.wipprod:fs.file:vf.${base64Part}?version=2`,
      
      // Style 3: OFFICIAL FORMAT WITH VERSION 3
      officialFormatV3: `urn:adsk.wipprod:fs.file:vf.${base64Part}?version=3`,
      
      // Style 4: EXACT FORMAT FROM YOUR IMAGE
      exactFormatFromImage: `urn:adsk.wipprod:fs.file:vf.${base64Part}?version=1`,
      
      // Style 5: File version URN (from Data Management API)
      fileVersionUrn: `urn:adsk.wipprod:fs.file:vf.${base64Part}?version=1`,
      
      // Style 6: Original lineage URN
      originalLineage: fileId,
      
      // Style 7: Base64 only
      base64Only: base64Part,
      
      // Style 8: FS file URN without version
      fsFileUrn: `urn:adsk.wipprod:fs.file:vf.${base64Part}`,
      
      // Style 9: DM file URN
      dmFileUrn: `urn:adsk.wipprodanz:dm.file:${base64Part}`,
      
      // Style 10: Legacy URN format
      legacyUrn: `urn:adsk.wipprod:fs.file:${base64Part}`,
      
      // Style 11: Base64 with different encoding
      base64Encoded: Buffer.from(base64Part, 'base64').toString('base64'),
      
      // Style 12: URL encoded base64
      urlEncodedBase64: encodeURIComponent(base64Part)
    };
  };

  // Different review creation payload styles
  const createReviewPayloadStyles = (name, workflowId, fileVersions) => {
    return {
      // Style 1: Official ACC Reviews API format
      officialFormat: {
        name: name,
        fileVersions: fileVersions.map(fv => ({ urn: fv.urn })),
        workflowId: workflowId,
        notes: 'Test review created via URN creator debugger'
      },
      
      // Style 2: JSON API format
      jsonApiFormat: {
        data: {
          type: 'reviews',
          attributes: {
            name: name,
            workflowId: workflowId,
            notes: 'Test review created via URN creator debugger'
          },
          relationships: {
            fileVersions: {
              data: fileVersions.map(fv => ({
                type: 'file_versions',
                id: fv.urn
              }))
            }
          }
        }
      },
      
      // Style 3: Simple format
      simpleFormat: {
        name: name,
        workflow_id: workflowId,
        items: fileVersions.map(fv => fv.urn),
        description: 'Test review created via URN creator debugger'
      },
      
      // Style 4: Minimal format
      minimalFormat: {
        name: name,
        workflowId: workflowId,
        fileVersions: fileVersions.map(fv => fv.urn)
      },
      
      // Style 5: Legacy format
      legacyFormat: {
        title: name,
        workflow_id: workflowId,
        file_versions: fileVersions.map(fv => ({ urn: fv.urn })),
        notes: 'Test review created via URN creator debugger'
      },
      
      // Style 6: Mixed format
      mixedFormat: {
        name: name,
        workflowId: workflowId,
        fileVersions: fileVersions.map(fv => ({ urn: fv.urn, type: 'file_version' })),
        notes: 'Test review created via URN creator debugger'
      },
      
      // Style 7: Extended format
      extendedFormat: {
        name: name,
        workflowId: workflowId,
        fileVersions: fileVersions.map(fv => ({ 
          urn: fv.urn, 
          type: 'file_version',
          source_file_version_id: fv.urn
        })),
        notes: 'Test review created via URN creator debugger',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      
      // Style 8: Array format
      arrayFormat: {
        name: name,
        workflowId: workflowId,
        fileVersions: fileVersions.map(fv => fv.urn),
        notes: 'Test review created via URN creator debugger'
      }
    };
  };

  // Get real file attributes from ACC
  const getRealFileAttributes = async (fileId) => {
    try {
      console.log('🔍 Getting real file attributes for:', fileId);
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      
      // Try to get file details from Data Management API
      const fileUrl = `https://developer.api.autodesk.com/data/v1/projects/${selectedProject.id}/versions/${fileId}`;
      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.api+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const fileData = data.data[0];
          console.log('✅ Got real file attributes:', fileData.attributes);
          return {
            name: fileData.attributes?.name || 'Unknown File',
            displayName: fileData.attributes?.displayName || 'Unknown File',
            createTime: fileData.attributes?.createTime,
            createUserId: fileData.attributes?.createUserId,
            createUserName: fileData.attributes?.createUserName,
            lastModifiedTime: fileData.attributes?.lastModifiedTime,
            lastModifiedUserId: fileData.attributes?.lastModifiedUserId,
            lastModifiedUserName: fileData.attributes?.lastModifiedUserName,
            versionNumber: fileData.attributes?.versionNumber || 1,
            storageSize: fileData.attributes?.storageSize || 0,
            fileType: fileData.attributes?.fileType || 'unknown',
            extension: fileData.attributes?.extension
          };
        }
      }
    } catch (error) {
      console.log('⚠️ Could not get real file attributes:', error.message);
    }
    
    // Return default attributes if we can't get real ones
    return {
      name: 'Test File.dwg',
      displayName: 'Test File.dwg',
      createTime: new Date().toISOString(),
      createUserId: 'X9WYLGPNCHVK',
      createUserName: 'John Smith',
      lastModifiedTime: new Date().toISOString(),
      lastModifiedUserId: 'X9WYLGPNCHVK',
      lastModifiedUserName: 'John Smith',
      versionNumber: 1,
      storageSize: 1952608,
      fileType: 'dwg',
      extension: {
        type: 'versions:autodesk.acc:File',
        version: '1.0',
        schema: {
          href: 'https://developer.api.autodesk.com/schema/v1/versions/versions:autodesk.acc:File-1.0'
        },
        data: {
          processState: 'PROCESSING_COMPLETE',
          extractionState: 'FAILED',
          splittingState: 'NOT_SPLIT',
          reviewState: 'NOT_IN_REVIEW',
          revisionDisplayLabel: '1'
        }
      }
    };
  };

  // Test different URN styles
  const testUrnStyles = async (fileId) => {
    const results = [];
    const base64Part = fileId.replace('urn:adsk.wipprodanz:dm.lineage:', '');
    const urnStyles = createUrnStyles(fileId, base64Part);
    
    console.log('🧪 Testing URN styles for file:', fileId);
    console.log('📋 Base64 part:', base64Part);
    
    for (const [styleName, urn] of Object.entries(urnStyles)) {
      try {
        console.log(`🔍 Testing URN style: ${styleName}`);
        console.log(`📋 URN: ${urn}`);
        
        // Test with Download API
        const downloadResult = await testDownloadApi(urn);
        
        // Test with Data Management API
        const dmResult = await testDataManagementApi(urn);
        
        results.push({
          style: styleName,
          urn: urn,
          downloadApi: downloadResult,
          dataManagementApi: dmResult,
          success: downloadResult.success || dmResult.success,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ URN style ${styleName} tested:`, {
          downloadApi: downloadResult.success,
          dataManagementApi: dmResult.success
        });
        
      } catch (error) {
        console.error(`❌ Error testing URN style ${styleName}:`, error);
        results.push({
          style: styleName,
          urn: urn,
          downloadApi: { success: false, error: error.message },
          dataManagementApi: { success: false, error: error.message },
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  };

  // Test Download API
  const testDownloadApi = async (urn) => {
    try {
      const result = await AccService.getFileDownloadDetails(selectedProject.id, urn);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Test Data Management API
  const testDataManagementApi = async (urn) => {
    try {
      const result = await AccService.getFileVersionForReview(selectedProject.id, urn);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Test different review creation approaches
  const testReviewCreationStyles = async (fileVersions) => {
    const results = [];
    const name = `Test Review - ${new Date().toISOString()}`;
    const workflowId = '3fa5f321-27b2-4b79-900f-5309e395247c'; // Default workflow
    
    const payloadStyles = createReviewPayloadStyles(name, workflowId, fileVersions);
    
    // Get real file attributes for the first file
    const realAttributes = await getRealFileAttributes(fileVersions[0]?.urn || fileVersions[0]);
    console.log('🔍 Using REAL file attributes for testing:', realAttributes);
    
    // Add official Autodesk data structure format test - EXACT FORMAT FROM DOCUMENTATION
    payloadStyles.officialAutodeskDataStructure = {
      name: name,
      fileVersions: fileVersions.map(fv => ({
        urn: fv.urn,
        type: 'file_version',
        attributes: {
          name: realAttributes.name,
          displayName: realAttributes.displayName,
          createTime: realAttributes.createTime,
          createUserId: realAttributes.createUserId,
          createUserName: realAttributes.createUserName,
          lastModifiedTime: realAttributes.lastModifiedTime,
          lastModifiedUserId: realAttributes.lastModifiedUserId,
          lastModifiedUserName: realAttributes.lastModifiedUserName,
          versionNumber: realAttributes.versionNumber,
          storageSize: realAttributes.storageSize,
          fileType: realAttributes.fileType,
          extension: realAttributes.extension
        },
        relationships: {
          storage: {
            data: {
              type: 'objects',
              id: fv.storageId || 'urn:adsk.objects:os.object:wip.dm.prod/72d5e7e4-89a7-4cb9-9da0-2e2bbc61ca8e.dwg'
            },
            meta: {
              link: {
                href: `https://developer.api.autodesk.com/oss/v2/buckets/wip.dm.prod/objects/${fv.objectKey || '72d5e7e4-89a7-4cb9-9da0-2e2bbc61ca8e.dwg'}`
              }
            }
          }
        }
      })),
      workflowId: workflowId,
      notes: 'Test review created via URN creator debugger - EXACT Official Autodesk data structure with REAL file attributes'
    };
    
    console.log('🧪 Testing review creation styles...');
    console.log('📋 File versions:', fileVersions);
    
    for (const [styleName, payload] of Object.entries(payloadStyles)) {
      try {
        console.log(`🔍 Testing review creation style: ${styleName}`);
        console.log('📋 Payload:', payload);
        
        const cleanProjectId = selectedProject.id.startsWith('b.') ? selectedProject.id.substring(2) : selectedProject.id;
        const response = await fetch(`/api/acc/reviews/${cleanProjectId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        results.push({
          style: styleName,
          payload: payload,
          success: response.ok,
          status: response.status,
          response: result,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Review creation style ${styleName} tested:`, {
          success: response.ok,
          status: response.status
        });
        
      } catch (error) {
        console.error(`❌ Error testing review creation style ${styleName}:`, error);
        results.push({
          style: styleName,
          payload: payload,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  };

  // Test mixed approaches
  const testMixedApproaches = async (fileId) => {
    const results = [];
    const base64Part = fileId.replace('urn:adsk.wipprodanz:dm.lineage:', '');
    
    // Get real file attributes for the file
    const realAttributes = await getRealFileAttributes(fileId);
    console.log('🔍 Using REAL file attributes for mixed approaches:', realAttributes);
    
    // Mix different URN styles with different review payload styles
    const urnStyles = createUrnStyles(fileId, base64Part);
    const reviewStyles = createReviewPayloadStyles(
      `Mixed Test - ${new Date().toISOString()}`,
      '3fa5f321-27b2-4b79-900f-5309e395247c',
      [{ urn: fileId }]
    );
    
    // Add real file attributes to the review styles
    reviewStyles.officialAutodeskDataStructure = {
      name: `Mixed Test - ${new Date().toISOString()}`,
      fileVersions: [{
        urn: fileId,
        type: 'file_version',
        attributes: realAttributes,
        relationships: {
          storage: {
            data: {
              type: 'objects',
              id: 'urn:adsk.objects:os.object:wip.dm.prod/72d5e7e4-89a7-4cb9-9da0-2e2bbc61ca8e.dwg'
            },
            meta: {
              link: {
                href: `https://developer.api.autodesk.com/oss/v2/buckets/wip.dm.prod/objects/72d5e7e4-89a7-4cb9-9da0-2e2bbc61ca8e.dwg`
              }
            }
          }
        }
      }],
      workflowId: '3fa5f321-27b2-4b79-900f-5309e395247c',
      notes: 'Mixed test with REAL file attributes from selected file'
    };
    
    console.log('🧪 Testing mixed approaches...');
    
    // Test combinations - PRIORITIZE OFFICIAL AUTODESK FORMAT
    const combinations = [
      { urnStyle: 'officialAutodeskFormat', reviewStyle: 'officialAutodeskDataStructure' },
      { urnStyle: 'officialAutodeskFormat', reviewStyle: 'officialFormat' },
      { urnStyle: 'officialAutodeskFormat', reviewStyle: 'minimalFormat' },
      { urnStyle: 'officialAutodeskFormat', reviewStyle: 'simpleFormat' },
      { urnStyle: 'exactFormatFromImage', reviewStyle: 'officialFormat' },
      { urnStyle: 'exactFormatFromImage', reviewStyle: 'minimalFormat' },
      { urnStyle: 'fileVersionUrn', reviewStyle: 'officialFormat' },
      { urnStyle: 'fileVersionUrn', reviewStyle: 'minimalFormat' },
      { urnStyle: 'base64Only', reviewStyle: 'simpleFormat' },
      { urnStyle: 'fsFileUrn', reviewStyle: 'minimalFormat' },
      { urnStyle: 'fileVersionUrn', reviewStyle: 'jsonApiFormat' },
      { urnStyle: 'base64Only', reviewStyle: 'legacyFormat' }
    ];
    
    for (const combo of combinations) {
      try {
        const urn = urnStyles[combo.urnStyle];
        const payload = reviewStyles[combo.reviewStyle];
        
        // Update payload with the specific URN
        if (payload.fileVersions) {
          payload.fileVersions = [{ urn: urn }];
        } else if (payload.items) {
          payload.items = [urn];
        } else if (payload.data?.relationships?.fileVersions) {
          payload.data.relationships.fileVersions.data = [{ type: 'file_versions', id: urn }];
        }
        
        console.log(`🔍 Testing combination: ${combo.urnStyle} + ${combo.reviewStyle}`);
        console.log('📋 URN:', urn);
        console.log('📋 Payload:', payload);
        
        const cleanProjectId = selectedProject.id.startsWith('b.') ? selectedProject.id.substring(2) : selectedProject.id;
        const response = await fetch(`/api/acc/reviews/${cleanProjectId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        results.push({
          combination: `${combo.urnStyle} + ${combo.reviewStyle}`,
          urn: urn,
          payload: payload,
          success: response.ok,
          status: response.status,
          response: result,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Combination tested:`, {
          success: response.ok,
          status: response.status
        });
        
      } catch (error) {
        console.error(`❌ Error testing combination:`, error);
        results.push({
          combination: `${combo.urnStyle} + ${combo.reviewStyle}`,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  };

  // Run comprehensive tests
  const runComprehensiveTests = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }
    
    setIsRunning(true);
    setTestResults([]);
    
    try {
      console.log('🚀 Starting comprehensive URN creator debugger tests...');
      const allResults = [];
      
      // Test 1: URN Styles
      if (testConfig.testAllUrnStyles) {
        console.log('🧪 Testing URN styles...');
        const urnResults = await testUrnStyles(selectedFile.urn || selectedFile.id);
        allResults.push(...urnResults.map(r => ({ ...r, testType: 'URN_STYLE' })));
      }
      
      // Test 2: Review Creation Styles
      if (testConfig.testAllReviewStyles) {
        console.log('🧪 Testing review creation styles...');
        const reviewResults = await testReviewCreationStyles([{ urn: selectedFile.urn || selectedFile.id }]);
        allResults.push(...reviewResults.map(r => ({ ...r, testType: 'REVIEW_STYLE' })));
      }
      
      // Test 3: Mixed Approaches
      if (testConfig.testMixedApproaches) {
        console.log('🧪 Testing mixed approaches...');
        const mixedResults = await testMixedApproaches(selectedFile.urn || selectedFile.id);
        allResults.push(...mixedResults.map(r => ({ ...r, testType: 'MIXED_APPROACH' })));
      }
      
      setTestResults(allResults);
      console.log('✅ Comprehensive tests completed:', allResults);
      
    } catch (error) {
      console.error('❌ Error running comprehensive tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Get success rate
  const getSuccessRate = () => {
    if (testResults.length === 0) return 0;
    const successful = testResults.filter(r => r.success).length;
    return Math.round((successful / testResults.length) * 100);
  };

  // Get best performing style
  const getBestStyle = () => {
    const successful = testResults.filter(r => r.success);
    if (successful.length === 0) return null;
    
    // Group by style and count successes
    const styleCounts = {};
    successful.forEach(result => {
      const style = result.style || result.combination;
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    });
    
    const bestStyle = Object.entries(styleCounts).reduce((a, b) => 
      styleCounts[a[0]] > styleCounts[b[0]] ? a : b
    );
    
    return bestStyle;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">URN Creator Debugger</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isRunning ? 'Running Tests...' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Test Configuration</h4>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={testConfig.testAllUrnStyles}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testAllUrnStyles: e.target.checked }))}
              className="mr-2"
            />
            Test All URN Styles
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={testConfig.testAllReviewStyles}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testAllReviewStyles: e.target.checked }))}
              className="mr-2"
            />
            Test All Review Styles
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={testConfig.testMixedApproaches}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testMixedApproaches: e.target.checked }))}
              className="mr-2"
            />
            Test Mixed Approaches
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={testConfig.includeFallbacks}
              onChange={(e) => setTestConfig(prev => ({ ...prev, includeFallbacks: e.target.checked }))}
              className="mr-2"
            />
            Include Fallbacks
          </label>
        </div>
      </div>

      {/* File Selection */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">File Selection</h4>
        {loadingFiles ? (
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading files...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedFiles.length > 0 ? (
              <div className="p-3 bg-green-50 rounded-lg mb-3">
                <p className="text-sm font-medium text-green-900">Using files from Review Creation form:</p>
                <p className="text-sm text-green-700">{selectedFiles.length} file(s) selected</p>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 rounded-lg mb-3">
                <p className="text-sm font-medium text-yellow-900">No files selected in Review Creation form</p>
                <p className="text-sm text-yellow-700">Please select files in the Review Creation form first</p>
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {availableFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`flex items-center space-x-2 py-2 px-3 rounded cursor-pointer hover:bg-gray-100 ${
                    selectedFile?.id === file.id ? 'bg-blue-100 border border-blue-300' : ''
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">{file.name}</span>
                  {selectedFile?.id === file.id && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>
            {selectedFile && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Selected File:</p>
                <p className="text-sm text-blue-700">{selectedFile.name}</p>
                <p className="text-xs text-blue-600 mt-1">ID: {selectedFile.id}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6 flex items-center space-x-4">
        <button
          onClick={runComprehensiveTests}
          disabled={!selectedFile || isRunning}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? 'Running Tests...' : 'Run Comprehensive Tests'}
        </button>
        
        <button
          onClick={() => setTestResults([])}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Clear Results
        </button>
        
        <button
          onClick={loadAvailableFiles}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Files
        </button>
      </div>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Test Results Summary</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{testResults.length}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getSuccessRate()}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {getBestStyle() ? getBestStyle()[0] : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Best Style</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Test Results</h4>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {result.testType}: {result.style || result.combination}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {result.urn && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">URN:</span>
                    <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                      {result.urn}
                    </code>
                  </div>
                )}
                
                {result.payload && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Payload:</span>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.payload, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.response && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Response:</span>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.error && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Error:</span> {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UrnCreatorDebugger;
