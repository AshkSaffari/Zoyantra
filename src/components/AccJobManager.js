import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  List,
  Eye,
  X
} from 'lucide-react';
import AccService from '../services/AccService_old';

const AccJobManager = ({ projectId, onClose }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [monitoring, setMonitoring] = useState(false);
  const [monitoredJob, setMonitoredJob] = useState(null);
  const [statusUpdates, setStatusUpdates] = useState([]);

  // Load all jobs for the project
  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Loading jobs for project:', projectId);
      const result = await AccService.getProjectJobs(projectId);
      
      setJobs(result.jobs || []);
      console.log(`✅ Loaded ${result.total} jobs`);
      
    } catch (err) {
      console.error('❌ Error loading jobs:', err);
      setError(`Failed to load jobs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get details for a specific job
  const getJobDetails = async (jobId) => {
    try {
      console.log('🔍 Getting job details for:', jobId);
      const details = await AccService.getJobDetails(projectId, jobId);
      
      setJobDetails(details);
      setSelectedJob(jobId);
      console.log('✅ Job details retrieved:', details);
      
    } catch (err) {
      console.error('❌ Error getting job details:', err);
      setError(`Failed to get job details: ${err.message}`);
    }
  };

  // Monitor job status with real-time updates
  const startJobMonitoring = async (jobId) => {
    if (monitoring) {
      console.log('⚠️ Already monitoring a job');
      return;
    }
    
    setMonitoring(true);
    setMonitoredJob(jobId);
    setStatusUpdates([]);
    
    try {
      console.log('👀 Starting job monitoring for:', jobId);
      
      const result = await AccService.monitorJobStatus(
        projectId, 
        jobId, 
        2000, // 2 second intervals
        300000 // 5 minute timeout
      );
      
      console.log('✅ Job monitoring completed:', result);
      
    } catch (err) {
      console.error('❌ Error monitoring job:', err);
      setError(`Job monitoring failed: ${err.message}`);
    } finally {
      setMonitoring(false);
      setMonitoredJob(null);
    }
  };

  // Stop job monitoring
  const stopJobMonitoring = () => {
    setMonitoring(false);
    setMonitoredJob(null);
    console.log('🛑 Job monitoring stopped');
  };

  // Wait for job completion with callbacks
  const waitForJobCompletion = async (jobId) => {
    try {
      console.log('⏳ Waiting for job completion:', jobId);
      
      const result = await AccService.waitForJobCompletion(projectId, jobId, {
        interval: 2000,
        timeout: 300000,
        onStatusUpdate: (status, details) => {
          console.log(`📊 Status update: ${status}`);
          setStatusUpdates(prev => [...prev, {
            timestamp: new Date().toISOString(),
            status,
            details
          }]);
        },
        onProgress: (progress, status) => {
          console.log(`📈 Progress: ${progress}% - Status: ${status}`);
        }
      });
      
      console.log('✅ Job completion result:', result);
      return result;
      
    } catch (err) {
      console.error('❌ Error waiting for job completion:', err);
      throw err;
    }
  };

  // Get job status with retry
  const getJobStatusWithRetry = async (jobId) => {
    try {
      console.log('🔄 Getting job status with retry:', jobId);
      const result = await AccService.getJobStatusWithRetry(projectId, jobId, 3);
      
      console.log('✅ Job status retrieved:', result);
      return result;
      
    } catch (err) {
      console.error('❌ Error getting job status:', err);
      throw err;
    }
  };

  // Get status icon based on job status
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'inprogress':
      case 'processing':
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'queued':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'inprogress':
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'queued':
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Load jobs on component mount
  useEffect(() => {
    if (projectId) {
      loadJobs();
    }
  }, [projectId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">ACC Job Manager</h2>
            <span className="text-sm text-gray-500">Project: {projectId}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Jobs List */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Jobs</h3>
                <button
                  onClick={loadJobs}
                  disabled={loading}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="ml-2 text-gray-600">Loading jobs...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={loadJobs}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8">
                  <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No jobs found for this project</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedJob === job.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => getJobDetails(job.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(job.attributes?.status)}
                          <span className="font-medium text-gray-900">
                            {job.id}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.attributes?.status)}`}>
                          {job.attributes?.status || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div>Type: {job.type}</div>
                        {job.attributes?.createdAt && (
                          <div>Created: {new Date(job.attributes.createdAt).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job Details */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Job Details</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedJob ? (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a job to view details</p>
                </div>
              ) : !jobDetails ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="ml-2 text-gray-600">Loading job details...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Job Status */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Job Status</h4>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(jobDetails.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(jobDetails.status)}`}>
                        {jobDetails.status}
                      </span>
                    </div>
                  </div>

                  {/* Job Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Job Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Job ID:</span> {jobDetails.jobId}</div>
                      <div><span className="font-medium">Type:</span> {jobDetails.type}</div>
                      <div><span className="font-medium">Status:</span> {jobDetails.status}</div>
                    </div>
                  </div>

                  {/* Job Actions */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => getJobDetails(selectedJob)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh</span>
                      </button>
                      
                      <button
                        onClick={() => getJobStatusWithRetry(selectedJob)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Status with Retry</span>
                      </button>
                      
                      {!monitoring ? (
                        <button
                          onClick={() => startJobMonitoring(selectedJob)}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        >
                          <Play className="w-4 h-4" />
                          <span>Monitor</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopJobMonitoring}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          <Square className="w-4 h-4" />
                          <span>Stop Monitor</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => waitForJobCompletion(selectedJob)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Wait for Completion</span>
                      </button>
                    </div>
                  </div>

                  {/* Monitoring Status */}
                  {monitoring && monitoredJob === selectedJob && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-3">Monitoring Active</h4>
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                        <span className="text-blue-700">Monitoring job: {selectedJob}</span>
                      </div>
                    </div>
                  )}

                  {/* Status Updates */}
                  {statusUpdates.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Status Updates</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {statusUpdates.map((update, index) => (
                          <div key={index} className="text-sm border-l-2 border-blue-200 pl-3">
                            <div className="font-medium text-gray-900">{update.status}</div>
                            <div className="text-gray-600">{new Date(update.timestamp).toLocaleTimeString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Response */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Raw Response</h4>
                    <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(jobDetails.response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccJobManager;
