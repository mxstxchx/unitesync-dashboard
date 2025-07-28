import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { GuidedFileUpload } from './GuidedFileUpload';
import { type FileRecognitionResult, isRecognitionComplete } from '@/lib/fileRecognition';

interface DataUploadEnhancedProps {
  onComplete: (results: any) => void;
}

interface ProcessedData {
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
  v3SubsequenceStats?: any[];
  inboundAuditStats?: any[];
  
  // Optional: Large email exports
  v1Emails?: any[];
  v2Emails?: any[];
  v3Emails?: any[];
  auditEmails?: any[];
}

export default function DataUploadEnhanced({ onComplete }: DataUploadEnhancedProps) {
  const [recognitionResult, setRecognitionResult] = useState<FileRecognitionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ message: '', progress: 0 });
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);

  const handleFilesRecognized = useCallback((result: FileRecognitionResult) => {
    setRecognitionResult(result);
    if (isRecognitionComplete(result)) {
      setProgress({ message: 'All files recognized! Ready to process.', progress: 100 });
    }
  }, []);

  const handleProgress = useCallback((progressUpdate: { message: string; progress: number }) => {
    setProgress(progressUpdate);
  }, []);

  const parseFile = async (file: File, type: 'json' | 'csv'): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (type === 'json') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = JSON.parse(e.target?.result as string);
            resolve(Array.isArray(result) ? result : [result]);
          } catch (error) {
            reject(new Error(`Failed to parse JSON file ${file.name}: ${error}`));
          }
        };
        reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
        reader.readAsText(file);
      } else {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            if (result.errors.length > 0) {
              reject(new Error(`CSV parsing errors in ${file.name}: ${result.errors.map(e => e.message).join(', ')}`));
            } else {
              resolve(result.data as any[]);
            }
          },
          error: (error) => {
            reject(new Error(`Failed to parse CSV file ${file.name}: ${error.message}`));
          }
        });
      }
    });
  };

  const processRecognizedFiles = async () => {
    if (!recognitionResult || !isRecognitionComplete(recognitionResult)) {
      setProgress({ message: 'Please upload all required files first.', progress: 0 });
      return;
    }

    setIsProcessing(true);
    setProgress({ message: 'Processing files...', progress: 0 });

    const data: ProcessedData = {};
    const recognizedFiles = recognitionResult.recognized;
    const totalFiles = Object.keys(recognizedFiles).length;
    let processedCount = 0;

    try {
      for (const [key, recognized] of Object.entries(recognizedFiles)) {
        setProgress({ 
          message: `Processing ${recognized.pattern.description}...`, 
          progress: (processedCount / totalFiles) * 80 
        });

        const parsedData = await parseFile(recognized.file, recognized.pattern.type);
        
        // Map the file keys to data properties
        switch (key) {
          case 'contacts':
            data.contacts = parsedData;
            break;
          case 'clients':
            data.clients = parsedData;
            break;
          case 'threads':
            data.threads = parsedData;
            break;
          case 'audits':
            data.audits = parsedData;
            break;
          case 'convrtLeads':
            data.convrtLeads = parsedData;
            break;
          case 'convrtAuditStatus':
            data.convrtAuditStatus = parsedData;
            break;
          case 'convrtReportStatus':
            data.convrtReportStatus = parsedData;
            break;
          case 'v1ContactStats':
            data.v1ContactStats = parsedData;
            break;
          case 'v2ContactStats':
            data.v2ContactStats = parsedData;
            break;
          case 'v3ContactStats':
            data.v3ContactStats = parsedData;
            break;
          case 'v3SubsequenceStats':
            data.v3SubsequenceStats = parsedData;
            break;
          case 'inboundAuditStats':
            data.inboundAuditStats = parsedData;
            break;
          case 'v1Emails':
            data.v1Emails = parsedData;
            break;
          case 'v2Emails':
            data.v2Emails = parsedData;
            break;
          case 'v3Emails':
            data.v3Emails = parsedData;
            break;
          case 'auditEmails':
            data.auditEmails = parsedData;
            break;
          case 'labels':
            data.labels = parsedData;
            break;
          case 'mailboxes':
            data.mailboxes = parsedData;
            break;
          case 'sequences':
            data.sequences = parsedData;
            break;
          case 'customVars':
            data.customVars = parsedData;
            break;
        }

        processedCount++;
      }

      setProcessedData(data);
      setProgress({ message: 'Files processed successfully!', progress: 80 });

      // Now process with the worker
      await processWithWorker(data);

    } catch (error) {
      console.error('Error processing files:', error);
      setProgress({ 
        message: `Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        progress: 0 
      });
      setIsProcessing(false);
    }
  };

  const processWithWorker = async (data: ProcessedData) => {
    setProgress({ message: 'Running attribution analysis...', progress: 85 });

    try {
      // Check if worker file exists first
      const workerUrl = '/workers/attributionWorkerComplete.js';
      console.log('Creating worker from:', workerUrl);
      
      // Create worker
      const worker = new Worker(workerUrl);
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        worker.terminate();
        setProgress({ 
          message: 'Attribution analysis timed out after 30 seconds', 
          progress: 0 
        });
        setIsProcessing(false);
      }, 30000); // 30 second timeout

      // Send data to worker
      console.log('Sending data to worker:', Object.keys(data));
      worker.postMessage({
        type: 'PROCESS_COMPLETE_ATTRIBUTION',
        data: data
      });

      // Handle worker response
      worker.onmessage = (event) => {
        console.log('Worker message received:', event.data.type);
        
        if (event.data.type === 'ATTRIBUTION_COMPLETE') {
          clearTimeout(timeout);
          setProgress({ message: 'Attribution analysis complete!', progress: 100 });
          setIsProcessing(false);
          
          // Pass results to parent
          onComplete({
            processedData: data,
            attributionResults: event.data.results,
            summary: event.data.summary
          });
        } else if (event.data.type === 'ATTRIBUTION_ERROR') {
          clearTimeout(timeout);
          console.error('Worker error:', event.data.message);
          setProgress({ 
            message: `Attribution error: ${event.data.message}`, 
            progress: 0 
          });
          setIsProcessing(false);
        } else if (event.data.type === 'ATTRIBUTION_PROGRESS') {
          setProgress({ 
            message: event.data.message, 
            progress: 85 + (event.data.progress * 0.15) 
          });
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        console.error('Worker error:', error);
        setProgress({ 
          message: `Worker error: ${error.message}`, 
          progress: 0 
        });
        setIsProcessing(false);
      };

    } catch (error) {
      console.error('Error in worker processing:', error);
      setProgress({ 
        message: `Error in attribution analysis: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        progress: 0 
      });
      setIsProcessing(false);
    }
  };

  const canProcess = recognitionResult && isRecognitionComplete(recognitionResult) && !isProcessing;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-black mb-2">Enhanced Data Upload</h2>
        <p className="text-black">
          Upload your data files using our intelligent file recognition system
        </p>
      </div>

      {/* Guided File Upload */}
      <GuidedFileUpload 
        onFilesRecognized={handleFilesRecognized}
        onProgress={handleProgress}
      />

      {/* Progress Bar */}
      {progress.message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-900">{progress.message}</span>
            <span className="text-sm text-blue-700">{progress.progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Process Button */}
      {recognitionResult && (
        <div className="text-center">
          <button
            onClick={processRecognizedFiles}
            disabled={!canProcess}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              canProcess
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-black cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Process Files & Run Attribution'}
          </button>
          
          {!isRecognitionComplete(recognitionResult) && (
            <p className="text-sm text-red-600 mt-2">
              Please upload all required files before processing
            </p>
          )}
        </div>
      )}

      {/* Results Summary */}
      {processedData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Processing Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {Object.entries(processedData).map(([key, value]) => (
              <div key={key}>
                <div className="font-medium text-green-700">{key}</div>
                <div className="text-green-900">{Array.isArray(value) ? value.length : '0'} records</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}