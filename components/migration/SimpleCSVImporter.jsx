import React, { useState, useCallback, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Upload, FileText, AlertCircle, CheckCircle, 
  Info, Download, Loader, X, FileSpreadsheet,
  BarChart3, Users, Home, DollarSign
} from 'lucide-react';

const SimpleCSVImporter = ({ 
  onImportComplete, 
  entityType = 'Property',
  apiEndpoint = '/api/massive-import',
  maxFileSize = 50 * 1024 * 1024, // 50MB
  chunkSize = 100
}) => {
  // State management
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState(null);
  const [errors, setErrors] = useState([]);
  const [mappings, setMappings] = useState({});
  const [stats, setStats] = useState(null);
  const [detailedErrors, setDetailedErrors] = useState([]);
  
  // Refs
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Entity configurations
  const entityConfigs = {
    Property: {
      icon: Home,
      color: 'blue',
      requiredFields: ['name', 'address'],
      optionalFields: ['total_units', 'status', 'type', 'description']
    },
    Tenant: {
      icon: Users,
      color: 'green',
      requiredFields: ['name'],
      optionalFields: ['email', 'phone', 'lease_start', 'lease_end', 'status']
    },
    Payment: {
      icon: DollarSign,
      color: 'purple',
      requiredFields: ['amount', 'payment_date'],
      optionalFields: ['tenant_id', 'property_id', 'payment_type', 'payment_method', 'status']
    }
  };
  
  const currentConfig = entityConfigs[entityType] || entityConfigs.Property;
  
  // Field mapping suggestions based on common patterns
  const fieldMappingSuggestions = {
    // Hebrew to English mappings
    'שם': 'name',
    'שם מלא': 'name',
    'כתובת': 'address',
    'טלפון': 'phone',
    'אימייל': 'email',
    'דוא"ל': 'email',
    'סטטוס': 'status',
    'מצב': 'status',
    'סכום': 'amount',
    'תאריך': 'date',
    'תאריך תשלום': 'payment_date',
    'יחידות': 'total_units',
    'מספר יחידות': 'total_units',
    'תחילת חוזה': 'lease_start',
    'סיום חוזה': 'lease_end',
    'שכר דירה': 'rent_amount',
    'הערות': 'notes',
    'תיאור': 'description'
  };
  
  // Smart field detection
  const detectFieldType = (values) => {
    const sampleValues = values.filter(v => v && v.toString().trim()).slice(0, 10);
    
    if (sampleValues.length === 0) return 'unknown';
    
    // Check if all values are numbers
    if (sampleValues.every(v => !isNaN(v))) return 'number';
    
    // Check if values look like dates
    const datePattern = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/;
    if (sampleValues.some(v => datePattern.test(v))) return 'date';
    
    // Check if values look like emails
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (sampleValues.some(v => emailPattern.test(v))) return 'email';
    
    // Check if values look like phones
    const phonePattern = /^[\d\-\+\(\)\s]+$/;
    if (sampleValues.some(v => phonePattern.test(v) && v.length >= 9)) return 'phone';
    
    return 'text';
  };
  
  // Auto-detect field mappings
  const autoDetectMappings = (headers, data) => {
    const detectedMappings = {};
    
    headers.forEach((header, index) => {
      const cleanHeader = header.toLowerCase().trim();
      
      // Check direct mapping suggestions
      for (const [hebrew, english] of Object.entries(fieldMappingSuggestions)) {
        if (cleanHeader === hebrew.toLowerCase() || cleanHeader === english.toLowerCase()) {
          detectedMappings[header] = english;
          return;
        }
      }
      
      // Try to detect by content if no direct mapping
      if (!detectedMappings[header] && data.length > 0) {
        const columnValues = data.map(row => row[header]);
        const fieldType = detectFieldType(columnValues);
        
        // Suggest mapping based on field type and entity
        if (fieldType === 'email' && !detectedMappings[header]) {
          detectedMappings[header] = 'email';
        } else if (fieldType === 'phone' && !detectedMappings[header]) {
          detectedMappings[header] = 'phone';
        } else if (fieldType === 'date' && entityType === 'Payment' && !detectedMappings[header]) {
          detectedMappings[header] = 'payment_date';
        }
      }
    });
    
    return detectedMappings;
  };
  
  // File parsing functions
  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  };
  
  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          });
          
          if (jsonData.length < 2) {
            reject(new Error('Excel file appears to be empty'));
            return;
          }
          
          // Convert array of arrays to array of objects
          const headers = jsonData[0];
          const rows = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          resolve(rows);
        } catch (error) {
          reject(new Error(`Excel parsing failed: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };
  
  // Handle file selection
  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files[0];
    
    if (!selectedFile) return;
    
    // Validate file size
    if (selectedFile.size > maxFileSize) {
      setImportStatus({
        type: 'error',
        message: `File size exceeds ${maxFileSize / 1024 / 1024}MB limit`
      });
      return;
    }
    
    setFile(selectedFile);
    setImportStatus(null);
    setErrors([]);
    setDetailedErrors([]);
    
    try {
      let data;
      
      // Parse based on file type
      if (selectedFile.name.endsWith('.csv')) {
        data = await parseCSV(selectedFile);
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        data = await parseExcel(selectedFile);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }
      
      // Set preview (first 10 rows)
      setPreview(data.slice(0, 10));
      
      // Auto-detect mappings
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const detected = autoDetectMappings(headers, data.slice(0, 50));
        setMappings(detected);
      }
      
      // Calculate statistics
      const fileStats = {
        totalRows: data.length,
        columns: Object.keys(data[0] || {}).length,
        fileSize: (selectedFile.size / 1024).toFixed(2) + ' KB',
        estimatedChunks: Math.ceil(data.length / chunkSize)
      };
      setStats(fileStats);
      
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error.message
      });
      setFile(null);
    }
  };
  
  // Process import
  const processImport = async () => {
    if (!file || isProcessing) return;
    
    setIsProcessing(true);
    setImportProgress(0);
    setErrors([]);
    setDetailedErrors([]);
    abortControllerRef.current = new AbortController();
    
    try {
      let data;
      
      // Parse file again for import
      if (file.name.endsWith('.csv')) {
        data = await parseCSV(file);
      } else {
        data = await parseExcel(file);
      }
      
      // Apply field mappings
      const mappedData = data.map((row, index) => {
        const mappedRow = {};
        
        Object.entries(row).forEach(([originalField, value]) => {
          const mappedField = mappings[originalField] || originalField;
          mappedRow[mappedField] = value;
        });
        
        // Add row index for error tracking
        mappedRow._originalRowIndex = index + 2; // +2 for header and 0-based index
        
        return mappedRow;
      });
      
      // Validate required fields
      const invalidRows = [];
      mappedData.forEach((row, index) => {
        const missingFields = currentConfig.requiredFields.filter(field => !row[field]);
        if (missingFields.length > 0) {
          invalidRows.push({
            row: index + 2,
            missingFields,
            data: row
          });
        }
      });
      
      if (invalidRows.length > 0) {
        setDetailedErrors(invalidRows);
        setImportStatus({
          type: 'error',
          message: `Found ${invalidRows.length} rows with missing required fields`
        });
        setIsProcessing(false);
        return;
      }
      
      // Process in chunks
      const chunks = [];
      for (let i = 0; i < mappedData.length; i += chunkSize) {
        chunks.push(mappedData.slice(i, i + chunkSize));
      }
      
      let processedCount = 0;
      const chunkErrors = [];
      
      for (let i = 0; i < chunks.length; i++) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Import cancelled by user');
        }
        
        const chunk = chunks[i];
        
        try {
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-job-id': `import_${Date.now()}`,
              'x-chunk-info': `${i + 1}/${chunks.length}`
            },
            body: JSON.stringify({
              entityType,
              records: chunk,
              userId: 'current_user', // This should come from auth context
              isChunk: chunks.length > 1,
              chunkIndex: i + 1,
              totalChunks: chunks.length
            }),
            signal: abortControllerRef.current.signal
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Server error');
          }
          
          processedCount += result.processed;
          
          if (result.errors > 0) {
            chunkErrors.push({
              chunk: i + 1,
              errors: result.errors,
              message: result.message
            });
          }
          
        } catch (error) {
          if (error.name === 'AbortError') {
            throw new Error('Import cancelled');
          }
          
          chunkErrors.push({
            chunk: i + 1,
            error: error.message
          });
          
          // Continue with next chunk instead of failing completely
          console.error(`Chunk ${i + 1} failed:`, error);
        }
        
        // Update progress
        setImportProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
      
      // Set final status
      if (chunkErrors.length === 0) {
        setImportStatus({
          type: 'success',
          message: `Successfully imported ${processedCount} ${entityType} records`
        });
      } else {
        setImportStatus({
          type: 'warning',
          message: `Imported ${processedCount} records with ${chunkErrors.length} chunks having errors`
        });
        setErrors(chunkErrors);
      }
      
      // Call completion callback
      if (onImportComplete) {
        onImportComplete({
          success: processedCount,
          errors: chunkErrors,
          total: mappedData.length
        });
      }
      
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error.message
      });
    } finally {
      setIsProcessing(false);
      setImportProgress(0);
    }
  };
  
  // Cancel import
  const cancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
  
  // Download error report
  const downloadErrorReport = () => {
    const report = {
      importDate: new Date().toISOString(),
      entityType,
      file: file.name,
      errors: detailedErrors.length > 0 ? detailedErrors : errors
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Download template
  const downloadTemplate = () => {
    const template = {};
    
    // Add all fields with example values
    currentConfig.requiredFields.forEach(field => {
      template[field] = `Required: ${field}`;
    });
    
    currentConfig.optionalFields.forEach(field => {
      template[field] = `Optional: ${field}`;
    });
    
    const csvContent = Papa.unparse([template]);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType.toLowerCase()}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const EntityIcon = currentConfig.icon;
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <EntityIcon className={`h-8 w-8 text-${currentConfig.color}-500`} />
              <h2 className="text-2xl font-bold text-gray-900">
                Import {entityType} Data
              </h2>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download Template</span>
            </button>
          </div>
        </div>
        
        {/* File Upload Area */}
        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
            } transition-colors cursor-pointer`}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="space-y-4">
                <FileSpreadsheet className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">{file.name}</p>
                  {stats && (
                    <div className="mt-2 flex items-center justify-center space-x-4 text-sm text-gray-600">
                      <span>{stats.totalRows} rows</span>
                      <span>•</span>
                      <span>{stats.columns} columns</span>
                      <span>•</span>
                      <span>{stats.fileSize}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview([]);
                    setMappings({});
                    setStats(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Remove File
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="text-lg font-medium text-gray-900">
                  Drop your CSV or Excel file here
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse (max {maxFileSize / 1024 / 1024}MB)
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Field Mappings */}
        {preview.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Field Mappings
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(preview[0]).map(header => (
                  <div key={header} className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-600 w-1/2 truncate">
                      {header}
                    </span>
                    <span className="text-gray-400">→</span>
                    <select
                      value={mappings[header] || ''}
                      onChange={(e) => {
                        setMappings({
                          ...mappings,
                          [header]: e.target.value
                        });
                      }}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Keep as is</option>
                      {[...currentConfig.requiredFields, ...currentConfig.optionalFields].map(field => (
                        <option key={field} value={field}>
                          {field} {currentConfig.requiredFields.includes(field) && '*'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Data Preview */}
        {preview.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Data Preview (First 10 rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0]).map(header => (
                      <th
                        key={header}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                        {mappings[header] && (
                          <span className="block text-blue-600 normal-case">
                            → {mappings[header]}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, idx) => (
                        <td key={idx} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {value || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Status Messages */}
        {importStatus && (
          <div className="p-6 border-t border-gray-200">
            <div className={`p-4 rounded-lg flex items-start space-x-3 ${
              importStatus.type === 'error' ? 'bg-red-50 text-red-800' :
              importStatus.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
              'bg-green-50 text-green-800'
            }`}>
              {importStatus.type === 'error' ? (
                <AlertCircle className="h-5 w-5 mt-0.5" />
              ) : importStatus.type === 'warning' ? (
                <Info className="h-5 w-5 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{importStatus.message}</p>
                {(errors.length > 0 || detailedErrors.length > 0) && (
                  <button
                    onClick={downloadErrorReport}
                    className="mt-2 text-sm underline hover:no-underline"
                  >
                    Download Error Report
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Detailed Errors */}
        {detailedErrors.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Validation Errors
            </h3>
            <div className="bg-red-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              {detailedErrors.slice(0, 10).map((error, index) => (
                <div key={index} className="mb-2 text-sm">
                  <span className="font-medium">Row {error.row}:</span>
                  <span className="text-red-600 ml-2">
                    Missing fields: {error.missingFields.join(', ')}
                  </span>
                </div>
              ))}
              {detailedErrors.length > 10 && (
                <p className="text-sm text-gray-600 mt-2">
                  ... and {detailedErrors.length - 10} more errors
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        {isProcessing && (
          <div className="p-6 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Importing data...
                </span>
                <span className="text-sm text-gray-500">
                  {importProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          {isProcessing && (
            <button
              onClick={cancelImport}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={processImport}
            disabled={!file || isProcessing || preview.length === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              !file || isProcessing || preview.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Start Import</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Import Statistics */}
      {stats && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Import Statistics
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.totalRows}</p>
              <p className="text-sm text-gray-600">Total Rows</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.columns}</p>
              <p className="text-sm text-gray-600">Columns</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.fileSize}</p>
              <p className="text-sm text-gray-600">File Size</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.estimatedChunks}</p>
              <p className="text-sm text-gray-600">Chunks</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleCSVImporter;