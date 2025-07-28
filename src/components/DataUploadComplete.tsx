import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface DataUploadProps {
  onDataProcessed: (data: any) => void;
  onProgress: (progress: { message: string; progress: number }) => void;
}

interface CompleteFileData {
  // Core data sources
  contacts?: any[];
  clients?: any[];
  audits?: any[];
  convrtLeads?: any[];
  
  // Sequence and thread data
  sequences?: any[];
  threads?: any[];
  labels?: any[];
  mailboxes?: any[];
  customVars?: any[];
  threadSample?: any[];
  
  // Convrt status data
  convrtAuditStatus?: any[];
  convrtReportStatus?: any[];
  
  // Contact statistics by sequence version
  v1ContactStats?: any[];
  v2ContactStats?: any[];
  v3ContactStats?: any[];
  inboundAuditStats?: any[];
}

const DataUploadComplete: React.FC<DataUploadProps> = ({ onDataProcessed, onProgress }) => {
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const expectedFiles = [
    // Core data sources
    { key: 'contacts', name: 'all_contacts.json', type: 'json', required: true },
    { key: 'clients', name: 'export_clients.csv', type: 'csv', required: true },
    { key: 'audits', name: 'audits.json', type: 'json', required: true },
    { key: 'convrtLeads', name: 'convrt_leads.csv', type: 'csv', required: true },
    
    // Sequence and thread data
    { key: 'sequences', name: 'all_sequences.json', type: 'json', required: true },
    { key: 'threads', name: 'all_threads.json', type: 'json', required: true },
    { key: 'labels', name: 'all_labels.json', type: 'json', required: false },
    { key: 'mailboxes', name: 'all_mailboxes.json', type: 'json', required: false },
    { key: 'customVars', name: 'customVars.json', type: 'json', required: false },
    { key: 'threadSample', name: 'thread_sample.json', type: 'json', required: false },
    
    // Convrt status data
    { key: 'convrtAuditStatus', name: 'convrt_audit_link_status.json', type: 'json', required: true },
    { key: 'convrtReportStatus', name: 'convrt_report_link_status.json', type: 'json', required: true },
    
    // Contact statistics by sequence version
    { key: 'v1ContactStats', name: 'V1_contacts_statistics_12_Jul_2025.csv', type: 'csv', required: true },
    { key: 'v2ContactStats', name: 'V2_contacts_statistics_12_Jul_2025.csv', type: 'csv', required: true },
    { key: 'v3ContactStats', name: 'V3_contacts_statistics_12_Jul_2025.csv', type: 'csv', required: true },
    { key: 'inboundAuditStats', name: 'Inbound_audits_contacts_statistics_13_Jul_2025.csv', type: 'csv', required: true }
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = { ...files };
    
    acceptedFiles.forEach(file => {
      const fileName = file.name.toLowerCase();
      
      // Core data sources
      if (fileName.includes('all_contacts')) {
        newFiles.contacts = file;
      } else if (fileName.includes('export_clients')) {
        newFiles.clients = file;
      } else if (fileName === 'audits.json') {
        newFiles.audits = file;
      } else if (fileName.includes('convrt_leads')) {
        newFiles.convrtLeads = file;
      }
      
      // Sequence and thread data
      else if (fileName.includes('all_sequences')) {
        newFiles.sequences = file;
      } else if (fileName.includes('all_threads')) {
        newFiles.threads = file;
      } else if (fileName.includes('all_labels')) {
        newFiles.labels = file;
      } else if (fileName.includes('all_mailboxes')) {
        newFiles.mailboxes = file;
      } else if (fileName === 'customvars.json') {
        newFiles.customVars = file;
      } else if (fileName.includes('thread_sample')) {
        newFiles.threadSample = file;
      }
      
      // Convrt status data
      else if (fileName.includes('convrt_audit_link_status')) {
        newFiles.convrtAuditStatus = file;
      } else if (fileName.includes('convrt_report_link_status')) {
        newFiles.convrtReportStatus = file;
      }
      
      // Contact statistics by sequence version
      else if (fileName.includes('v1_contacts_statistics')) {
        newFiles.v1ContactStats = file;
      } else if (fileName.includes('v2_contacts_statistics')) {
        newFiles.v2ContactStats = file;
      } else if (fileName.includes('v3_contacts_statistics')) {
        newFiles.v3ContactStats = file;
      } else if (fileName.includes('inbound_audits_contacts_statistics')) {
        newFiles.inboundAuditStats = file;
      }
    });
    
    setFiles(newFiles);
    setUploadStatus(`${acceptedFiles.length} file(s) uploaded`);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/csv': ['.csv']
    }
  });

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => reject(error)
      });
    });
  };

  const parseJSON = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result === 'string') {
            const data = JSON.parse(result);
            resolve(data);
          } else {
            reject(new Error('Failed to read file'));
          }
        } catch (error) {
          reject(new Error(`JSON parsing error: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  };

  const processFiles = async () => {
    setIsProcessing(true);
    setUploadStatus('Processing files...');
    
    try {
      const processedData: CompleteFileData = {};
      const totalFiles = Object.keys(files).length;
      let processedCount = 0;

      // Process core data sources
      if (files.contacts) {
        onProgress({ message: 'Processing contacts data...', progress: Math.round((processedCount / totalFiles) * 100) });
        const contactsData = await parseJSON(files.contacts);
        processedData.contacts = contactsData.data || contactsData;
        processedCount++;
      }
      
      if (files.clients) {
        onProgress({ message: 'Processing clients data...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.clients = await parseCSV(files.clients);
        processedCount++;
      }
      
      if (files.audits) {
        onProgress({ message: 'Processing audits data...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.audits = await parseJSON(files.audits);
        processedCount++;
      }
      
      if (files.convrtLeads) {
        onProgress({ message: 'Processing Convrt leads data...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.convrtLeads = await parseCSV(files.convrtLeads);
        processedCount++;
      }

      // Process sequence and thread data
      if (files.sequences) {
        onProgress({ message: 'Processing sequences data...', progress: Math.round((processedCount / totalFiles) * 100) });
        const sequencesData = await parseJSON(files.sequences);
        processedData.sequences = sequencesData.data || sequencesData;
        processedCount++;
      }
      
      if (files.threads) {
        onProgress({ message: 'Processing threads data...', progress: Math.round((processedCount / totalFiles) * 100) });
        const threadsData = await parseJSON(files.threads);
        processedData.threads = threadsData.data || threadsData;
        processedCount++;
      }
      
      if (files.labels) {
        onProgress({ message: 'Processing labels data...', progress: Math.round((processedCount / totalFiles) * 100) });
        const labelsData = await parseJSON(files.labels);
        processedData.labels = labelsData.data || labelsData;
        processedCount++;
      }
      
      if (files.mailboxes) {
        onProgress({ message: 'Processing mailboxes data...', progress: Math.round((processedCount / totalFiles) * 100) });
        const mailboxesData = await parseJSON(files.mailboxes);
        processedData.mailboxes = mailboxesData.data || mailboxesData;
        processedCount++;
      }
      
      if (files.customVars) {
        onProgress({ message: 'Processing custom variables data...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.customVars = await parseJSON(files.customVars);
        processedCount++;
      }
      
      if (files.threadSample) {
        onProgress({ message: 'Processing thread sample data...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.threadSample = await parseJSON(files.threadSample);
        processedCount++;
      }

      // Process Convrt status data
      if (files.convrtAuditStatus) {
        onProgress({ message: 'Processing Convrt audit status...', progress: Math.round((processedCount / totalFiles) * 100) });
        const convrtAuditData = await parseJSON(files.convrtAuditStatus);
        processedData.convrtAuditStatus = convrtAuditData.response || convrtAuditData;
        processedCount++;
      }
      
      if (files.convrtReportStatus) {
        onProgress({ message: 'Processing Convrt report status...', progress: Math.round((processedCount / totalFiles) * 100) });
        const convrtReportData = await parseJSON(files.convrtReportStatus);
        processedData.convrtReportStatus = convrtReportData.response || convrtReportData;
        processedCount++;
      }

      // Process contact statistics by sequence version
      if (files.v1ContactStats) {
        onProgress({ message: 'Processing V1 contact statistics...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.v1ContactStats = await parseCSV(files.v1ContactStats);
        processedCount++;
      }
      
      if (files.v2ContactStats) {
        onProgress({ message: 'Processing V2 contact statistics...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.v2ContactStats = await parseCSV(files.v2ContactStats);
        processedCount++;
      }
      
      if (files.v3ContactStats) {
        onProgress({ message: 'Processing V3 contact statistics...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.v3ContactStats = await parseCSV(files.v3ContactStats);
        processedCount++;
      }
      
      if (files.inboundAuditStats) {
        onProgress({ message: 'Processing inbound audit statistics...', progress: Math.round((processedCount / totalFiles) * 100) });
        processedData.inboundAuditStats = await parseCSV(files.inboundAuditStats);
        processedCount++;
      }
      
      onProgress({ message: 'All files processed successfully', progress: 100 });
      setUploadStatus('All files processed successfully');
      
      // Pass processed data to parent component
      onDataProcessed(processedData);
      
    } catch (error) {
      console.error('File processing error:', error);
      setUploadStatus(`Error: ${error.message}`);
      onProgress({ message: `Error: ${error.message}`, progress: 0 });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (key: string) => {
    const newFiles = { ...files };
    delete newFiles[key];
    setFiles(newFiles);
  };

  const getRequiredFiles = () => expectedFiles.filter(f => f.required);
  const getOptionalFiles = () => expectedFiles.filter(f => !f.required);
  const getUploadedRequiredFiles = () => getRequiredFiles().filter(f => files[f.key]);
  const canProcess = getUploadedRequiredFiles().length === getRequiredFiles().length;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-black">Complete Data Upload</h2>
      
      {/* Progress Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-blue-800">Upload Progress</h3>
          <span className="text-sm text-blue-700">
            {getUploadedRequiredFiles().length}/{getRequiredFiles().length} required files
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(getUploadedRequiredFiles().length / getRequiredFiles().length) * 100}%` }}
          />
        </div>
      </div>

      {/* Required Files */}
      <div className="mb-6 p-4 bg-red-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-red-800">Required Files:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {getRequiredFiles().map((file, index) => (
            <div key={index} className="flex items-center text-sm">
              <span className={`w-2 h-2 rounded-full mr-2 ${files[file.key] ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <strong>{file.key}:</strong> {file.name} ({file.type})
            </div>
          ))}
        </div>
      </div>

      {/* Optional Files */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-yellow-800">Optional Files:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {getOptionalFiles().map((file, index) => (
            <div key={index} className="flex items-center text-sm">
              <span className={`w-2 h-2 rounded-full mr-2 ${files[file.key] ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <strong>{file.key}:</strong> {file.name} ({file.type})
            </div>
          ))}
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-black">
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg mb-2">Drag & drop files here, or click to select files</p>
              <p className="text-sm text-black">Supports JSON and CSV files from init_data/</p>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      {Object.keys(files).length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3 text-black">Uploaded Files:</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Object.entries(files).map(([key, file]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="font-medium text-black mr-2">{key}:</span>
                  <span className="text-black">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(key)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={processFiles}
          disabled={!canProcess || isProcessing}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            canProcess && !isProcessing
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-black cursor-not-allowed'
          }`}
        >
          {isProcessing ? 'Processing...' : 'Process All Files'}
        </button>
      </div>

      {/* Status */}
      {uploadStatus && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center text-black">
          {uploadStatus}
        </div>
      )}
    </div>
  );
};

export default DataUploadComplete;