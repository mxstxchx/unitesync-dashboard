import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface DataUploadProps {
  onDataProcessed: (data: any) => void;
  onProgress: (progress: { message: string; progress: number }) => void;
}

interface FileData {
  contacts?: any[];
  clients?: any[];
  audits?: any[];
  convrtLeads?: any[];
  threads?: any[];
}

const DataUpload: React.FC<DataUploadProps> = ({ onDataProcessed, onProgress }) => {
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const expectedFiles = [
    { key: 'contacts', name: 'all_contacts.json', type: 'json' },
    { key: 'clients', name: 'export_clients.csv', type: 'csv' },
    { key: 'audits', name: 'audits.json', type: 'json' },
    { key: 'convrtLeads', name: 'convrt_leads.csv', type: 'csv' },
    { key: 'threads', name: 'threads (multiple JSON files)', type: 'json-multiple' }
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = { ...files };
    
    acceptedFiles.forEach(file => {
      const fileName = file.name.toLowerCase();
      
      if (fileName.includes('contacts')) {
        newFiles.contacts = file;
      } else if (fileName.includes('clients')) {
        newFiles.clients = file;
      } else if (fileName.includes('audits')) {
        newFiles.audits = file;
      } else if (fileName.includes('convrt')) {
        newFiles.convrtLeads = file;
      } else if (fileName.includes('thread') || fileName.startsWith('mth_')) {
        // Handle multiple thread files
        if (!newFiles.threads) {
          newFiles.threads = [];
        }
        if (Array.isArray(newFiles.threads)) {
          newFiles.threads.push(file);
        }
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
      const processedData: FileData = {};
      
      // Process contacts (JSON)
      if (files.contacts) {
        onProgress({ message: 'Processing contacts data...', progress: 10 });
        const contactsData = await parseJSON(files.contacts);
        processedData.contacts = contactsData.data || contactsData;
      }
      
      // Process clients (CSV)
      if (files.clients) {
        onProgress({ message: 'Processing clients data...', progress: 30 });
        processedData.clients = await parseCSV(files.clients);
      }
      
      // Process audits (JSON)
      if (files.audits) {
        onProgress({ message: 'Processing audits data...', progress: 50 });
        processedData.audits = await parseJSON(files.audits);
      }
      
      // Process Convrt leads (CSV)
      if (files.convrtLeads) {
        onProgress({ message: 'Processing Instagram leads data...', progress: 70 });
        processedData.convrtLeads = await parseCSV(files.convrtLeads);
      }
      
      // Process thread files (multiple JSON files)
      if (files.threads && Array.isArray(files.threads)) {
        onProgress({ message: 'Processing thread files...', progress: 80 });
        const threadsData = [];
        
        for (let i = 0; i < files.threads.length; i++) {
          const threadFile = files.threads[i];
          const threadData = await parseJSON(threadFile);
          threadsData.push(threadData);
        }
        
        processedData.threads = threadsData;
      }
      
      onProgress({ message: 'Files processed successfully', progress: 100 });
      setUploadStatus('Files processed successfully');
      
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

  const canProcess = Object.keys(files).length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-black">Data Upload</h2>
      
      {/* Expected Files Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">Expected Files:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          {expectedFiles.map((file, index) => (
            <li key={index} className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              <strong>{file.key}:</strong> {file.name} ({file.type})
            </li>
          ))}
        </ul>
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
              <p className="text-sm text-black">Supports JSON and CSV files</p>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      {Object.keys(files).length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3 text-black">Uploaded Files:</h3>
          <div className="space-y-2">
            {Object.entries(files).map(([key, file]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="font-medium text-black mr-2">{key}:</span>
                  <span className="text-black">
                    {Array.isArray(file) ? `${file.length} files` : file.name}
                  </span>
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
          {isProcessing ? 'Processing...' : 'Process Files'}
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

export default DataUpload;