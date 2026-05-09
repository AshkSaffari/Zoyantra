import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  X,
  Mail,
  Clock,
  LogOut
} from 'lucide-react';
import DocuSignConfigChecker from './DocuSignConfigChecker';
import AccFolderBrowser from './AccFolderBrowser';

const DocuSignTab = ({ 
  selectedProject, 
  selectedHub, 
  credentials 
}) => {
  const [docuSignConnected, setDocuSignConnected] = useState(false);
  const [docuSignUser, setDocuSignUser] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [signatureRequest, setSignatureRequest] = useState({
    signerEmail: '',
    signerName: '',
    signerTitle: '',
    signerCompany: '',
    message: '',
    dueDate: '',
    reminderDays: 3
  });


  // Check DocuSign connection only
  const checkDocuSignConnection = async () => {
    try {
      console.log('🔍 Checking DocuSign connection...');
      // Check DocuSign connection
      const docuSignStatus = await fetch('/api/docusign/status');
      console.log('📡 DocuSign status response:', docuSignStatus.status);
      
      if (docuSignStatus.ok) {
        const docuSignData = await docuSignStatus.json();
        console.log('📊 DocuSign status data:', docuSignData);
        setDocuSignConnected(docuSignData.connected);
        setDocuSignUser(docuSignData.user);
        setRecentActivity(docuSignData.recentActivity);
        if (!docuSignData.connected && docuSignData.error) {
          setError(docuSignData.error);
        } else {
          setError(null);
        }
      } else {
        console.error('❌ DocuSign status check failed:', docuSignStatus.status);
        setError('Failed to check DocuSign connection status');
      }
    } catch (error) {
      console.error('❌ Error checking DocuSign connection:', error);
      setError('Failed to check DocuSign connection. Make sure the DocuSign server is running on port 3001.');
    }
  };

  // Load documents from DocuSign
  const loadDocuments = useCallback(async () => {
    if (!docuSignConnected) return;

    try {
      setIsLoading(true);
      console.log('📄 Loading documents from DocuSign...');
      const response = await fetch('/api/docusign/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        console.log('📄 Loaded documents:', data.documents?.length || 0);
      } else {
        console.error('❌ Failed to load documents:', response.status);
        setError('Failed to load documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [docuSignConnected]);

  // Check connections on component mount
  useEffect(() => {
    checkDocuSignConnection();
    loadDocuments();
  }, [selectedProject, loadDocuments]);

  // Check DocuSign connection when component mounts
  useEffect(() => {
    checkDocuSignConnection();
  }, []);

  // Listen for DocuSign connection success event
  useEffect(() => {
    const handleDocuSignConnected = () => {
      console.log('🔐 DocuSign connected event received');
      // Show success message
      setSuccess('✅ DocuSign connected successfully!');
      // Check connection status to update UI
      checkDocuSignConnection();
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    };

    window.addEventListener('docusign-connected', handleDocuSignConnected);
    return () => window.removeEventListener('docusign-connected', handleDocuSignConnected);
  }, []);

  // Connect to DocuSign
  const connectToDocuSign = () => {
    console.log('🔐 Starting DocuSign OAuth flow...');
    // Use the proxied route (port 3000 -> 3001)
    // The backend will redirect to DocuSign, then DocuSign will redirect back to port 3000/auth/callback
    window.location.href = '/docusign/auth';
  };

  // Handle file selection from ACC
  const handleFileSelection = (files) => {
    console.log('📁 Files selected from ACC:', files);
    setSelectedFiles(files);
    setShowFileBrowser(false);
  };


  // Disconnect from DocuSign
  const disconnectFromDocuSign = async () => {
    try {
      console.log('🔓 Disconnecting from DocuSign...');
      
      // Call server logout endpoint
      const response = await fetch('/api/docusign/logout', {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log('✅ DocuSign logout successful');
        // Reset local state
        setDocuSignConnected(false);
        setDocuSignUser(null);
        setRecentActivity(null);
        setDocuments([]);
        setSelectedFiles([]);
        setError(null);
        setSuccess('Successfully disconnected from DocuSign');
        
        // Redirect to DocuSign logout page to clear browser session
        setTimeout(() => {
          // Clear any DocuSign cookies and redirect to logout
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
          // Redirect to DocuSign logout to clear session
          window.location.href = 'https://account-d.docusign.com/logout?returnUrl=' + encodeURIComponent(window.location.origin);
        }, 1000);
      } else {
        console.error('❌ DocuSign logout failed:', response.status);
        setError('Failed to disconnect from DocuSign');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from DocuSign:', error);
      setError('Failed to disconnect from DocuSign');
    }
  };



  // Convert DOCX to PDF
  const convertToPdf = async (file) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/convert-to-pdf', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        return result.pdfPath;
      } else {
        throw new Error('Conversion failed');
      }
    } catch (error) {
      console.error('Error converting to PDF:', error);
      setError('Failed to convert document to PDF');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Send document for signature
  const sendForSignature = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one document');
      return;
    }

    if (!signatureRequest.signerEmail || !signatureRequest.signerName) {
      setError('Please fill in signer information');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Convert documents to PDF
      const pdfFiles = [];
      for (const file of selectedFiles) {
        const pdfPath = await convertToPdf(file);
        if (pdfPath) {
          pdfFiles.push(pdfPath);
        }
      }

      if (pdfFiles.length === 0) {
        setError('No documents could be converted to PDF');
        return;
      }

      // Send to DocuSign
      const response = await fetch('/api/docusign/send-for-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: pdfFiles,
          signer: signatureRequest,
          projectId: selectedProject?.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Document sent for signature! Envelope ID: ${result.envelopeId}`);
        setSelectedFiles([]);
        setSignatureRequest({
          signerEmail: '',
          signerName: '',
          signerTitle: '',
          signerCompany: '',
          message: '',
          dueDate: '',
          reminderDays: 3
        });
        loadDocuments();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send document for signature');
      }
    } catch (error) {
      console.error('Error sending for signature:', error);
      setError('Failed to send document for signature');
    } finally {
      setIsLoading(false);
    }
  };

  // Check signature status
  const checkSignatureStatus = async (envelopeId) => {
    try {
      const response = await fetch(`/api/docusign/status/${envelopeId}`);
      if (response.ok) {
        const data = await response.json();
        return data.status;
      }
    } catch (error) {
      console.error('Error checking signature status:', error);
    }
    return 'unknown';
  };

  // Download signed document
  const downloadSignedDocument = async (envelopeId) => {
    try {
      const response = await fetch(`/api/docusign/download/${envelopeId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed_document_${envelopeId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading signed document:', error);
      setError('Failed to download signed document');
    }
  };


  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'delivered': return 'text-yellow-600 bg-yellow-100';
      case 'signed': return 'text-purple-600 bg-purple-100';
      case 'declined': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'delivered': return <Mail className="w-4 h-4" />;
      case 'signed': return <CheckCircle className="w-4 h-4" />;
      case 'declined': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">DocuSign Integration</h2>
          <p className="text-gray-600">Send documents for signature and manage the signing process</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadDocuments}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Configuration Checker */}
      <DocuSignConfigChecker />

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DocuSign Connection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">DocuSign</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              docuSignConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {docuSignConnected ? 'Connected' : 'Not Connected'}
            </div>
          </div>
          
          {docuSignConnected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Connected as: {docuSignUser?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">Email: {docuSignUser?.email || 'Unknown'}</p>
                  {recentActivity?.emailsUsed && recentActivity.emailsUsed.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Recent document recipients:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recentActivity.emailsUsed.slice(0, 3).map((email, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {email}
                          </span>
                        ))}
                        {recentActivity.emailsUsed.length > 3 && (
                          <span className="text-xs text-gray-500">+{recentActivity.emailsUsed.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={checkDocuSignConnection}
                    className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={disconnectFromDocuSign}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    title="Disconnect and sign in with different email"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Connect to DocuSign to send documents for signature</p>
              <div className="flex space-x-2">
                <button
                  onClick={connectToDocuSign}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect to DocuSign
                </button>
                <button
                  onClick={checkDocuSignConnection}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Debug Info */}
      {docuSignConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug Info:</h4>
          <div className="text-xs text-yellow-700 space-y-1">
            <div>DocuSign Connected: {docuSignConnected ? 'Yes' : 'No'}</div>
            <div>Selected Files: {selectedFiles.length}</div>
            <div>Signer Email: {signatureRequest.signerEmail || 'Empty'}</div>
            <div>Signer Name: {signatureRequest.signerName || 'Empty'}</div>
            <div>Show Form: {docuSignConnected && selectedFiles.length > 0 ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}

      {/* File Selection */}
      {docuSignConnected && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Document Selection</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log('🔍 Browse ACC Files clicked');
                  console.log('📁 Selected Project:', selectedProject);
                  console.log('📁 Selected Hub:', selectedHub);
                  console.log('📁 Project ID:', selectedProject?.id);
                  console.log('📁 Hub ID:', selectedHub?.id);
                  
                  if (!selectedProject?.id) {
                    alert('Please select a project first from the Project Management tab');
                    return;
                  }
                  
                  console.log('✅ Opening ACC file browser...');
                  setShowFileBrowser(true);
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!selectedProject?.id}
              >
                <FileText className="w-4 h-4 mr-2" />
                Browse ACC Files
              </button>
            </div>
          </div>
          
          {selectedFiles.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Selected files for signature:</p>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                          {file.version && ` • Version ${file.version}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No files selected</p>
              {!selectedProject?.id ? (
                <p className="text-sm text-orange-500">Please select a project first from the Project Management tab</p>
              ) : (
                <p className="text-sm text-gray-400">Click "Browse ACC Files" to select documents for signature</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ACC Folder Browser Modal */}
      {showFileBrowser && (
        <AccFolderBrowser
          isOpen={showFileBrowser}
          onClose={() => {
            console.log('🔒 Closing ACC file browser');
            setShowFileBrowser(false);
          }}
          onFileSelect={handleFileSelection}
          projectId={selectedProject?.id}
          hubId={selectedHub?.id}
          multiSelect={true}
        />
      )}

      {/* Signature Request Form */}
      {docuSignConnected && selectedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Signature Request Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signer Email *</label>
                <input
                  type="email"
                  value={signatureRequest.signerEmail}
                  onChange={(e) => setSignatureRequest(prev => ({ ...prev, signerEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="signer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signer Name *</label>
                <input
                  type="text"
                  value={signatureRequest.signerName}
                  onChange={(e) => setSignatureRequest(prev => ({ ...prev, signerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signer Title</label>
                <input
                  type="text"
                  value={signatureRequest.signerTitle}
                  onChange={(e) => setSignatureRequest(prev => ({ ...prev, signerTitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={signatureRequest.signerCompany}
                  onChange={(e) => setSignatureRequest(prev => ({ ...prev, signerCompany: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ACME Construction"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={signatureRequest.message}
                  onChange={(e) => setSignatureRequest(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please review and sign this document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={signatureRequest.dueDate}
                  onChange={(e) => setSignatureRequest(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Days</label>
                <select
                  value={signatureRequest.reminderDays}
                  onChange={(e) => setSignatureRequest(prev => ({ ...prev, reminderDays: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={sendForSignature}
              disabled={isLoading || !signatureRequest.signerEmail || !signatureRequest.signerName}
              className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send for Signature
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Signature Documents</h3>
          
          <div className="space-y-4">
            {documents.map((doc, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{doc.name}</h4>
                      <p className="text-xs text-gray-500">Envelope ID: {doc.envelopeId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                      {getStatusIcon(doc.status)}
                      <span className="ml-1">{doc.status}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Signer:</span> {doc.signerName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {doc.signerEmail}
                  </div>
                  <div>
                    <span className="font-medium">Sent:</span> {new Date(doc.sentDate).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Due:</span> {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : 'No due date'}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {doc.status === 'completed' && (
                    <>
                      <button
                        onClick={() => downloadSignedDocument(doc.envelopeId)}
                        className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => checkSignatureStatus(doc.envelopeId)}
                    className="flex items-center px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Check Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



    </div>
  );
};

export default DocuSignTab;
