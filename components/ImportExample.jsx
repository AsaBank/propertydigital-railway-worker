import React, { useState, useEffect } from 'react';
import SimpleCSVImporter from './migration/SimpleCSVImporter';
import { BarChart3, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const ImportExample = () => {
  const [selectedEntity, setSelectedEntity] = useState('Property');
  const [importHistory, setImportHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Fetch import history
  const fetchImportHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/import-history?entityType=${selectedEntity}&limit=10`);
      const data = await response.json();
      setImportHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch import history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  useEffect(() => {
    fetchImportHistory();
  }, [selectedEntity]);
  
  const handleImportComplete = (results) => {
    console.log('Import completed:', results);
    
    // Show success notification
    if (results.errors.length === 0) {
      alert(`✅ Successfully imported ${results.success} ${selectedEntity} records!`);
    } else {
      alert(`⚠️ Imported ${results.success} records with ${results.errors.length} errors.`);
    }
    
    // Refresh history
    fetchImportHistory();
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Data</h1>
          <p className="mt-2 text-gray-600">
            Import your property management data from CSV or Excel files
          </p>
        </div>
        
        {/* Entity Type Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Select Data Type
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {['Property', 'Tenant', 'Payment'].map((entity) => (
              <button
                key={entity}
                onClick={() => setSelectedEntity(entity)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedEntity === entity
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium">{entity}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Import Component */}
        <SimpleCSVImporter
          key={selectedEntity} // Force re-render when entity changes
          entityType={selectedEntity}
          onImportComplete={handleImportComplete}
          apiEndpoint="/api/massive-import"
          maxFileSize={50 * 1024 * 1024} // 50MB
          chunkSize={100}
        />
        
        {/* Import History */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Imports
            </h2>
          </div>
          
          <div className="p-6">
            {isLoadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading history...</p>
              </div>
            ) : importHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No import history found for {selectedEntity}
              </div>
            ) : (
              <div className="space-y-4">
                {importHistory.map((job) => (
                  <div
                    key={job.jobId}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          {job.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          <span className="font-medium text-gray-900">
                            {job.message}
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Date:</span>{' '}
                            {formatDate(job.completedAt)}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span>{' '}
                            {formatDuration(job.processingTime)}
                          </div>
                          <div>
                            <span className="font-medium">Success:</span>{' '}
                            {job.processed}/{job.total}
                          </div>
                          <div>
                            <span className="font-medium">Errors:</span>{' '}
                            {job.failed || 0}
                          </div>
                        </div>
                        
                        {job.cacheStats && (
                          <div className="mt-2 text-xs text-gray-500">
                            Cache hit rate: {job.cacheStats.hitRate}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <span className="text-xs text-gray-500">
                          {job.jobId}
                        </span>
                      </div>
                    </div>
                    
                    {job.errorDetails && job.errorDetails.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 rounded text-sm">
                        <p className="font-medium text-red-800 mb-1">
                          Error Details:
                        </p>
                        <ul className="list-disc list-inside text-red-700">
                          {job.errorDetails.slice(0, 3).map((error, idx) => (
                            <li key={idx}>{error.error || error.message}</li>
                          ))}
                          {job.errorDetails.length > 3 && (
                            <li>... and {job.errorDetails.length - 3} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            Import Tips
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Use the template download button to get a properly formatted file
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Files are automatically split into chunks for optimal performance
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Hebrew field names are automatically detected and mapped
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              You can cancel an import at any time using the Cancel button
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Failed records can be downloaded as an error report for review
            </li>
          </ul>
        </div>
        
        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Debug Information
            </h3>
            <pre className="text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify({
                selectedEntity,
                importHistoryCount: importHistory.length,
                apiEndpoint: '/api/massive-import',
                maxFileSize: '50MB',
                chunkSize: 100
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExample;