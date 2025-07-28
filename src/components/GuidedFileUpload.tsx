import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  recognizeUploadedFiles, 
  getDownloadInstructions, 
  getFileStats,
  type FilePattern,
  type FileRecognitionResult 
} from '@/lib/fileRecognition';

interface GuidedFileUploadProps {
  onFilesRecognized: (result: FileRecognitionResult) => void;
  onProgress: (progress: { message: string; progress: number }) => void;
}

export function GuidedFileUpload({ onFilesRecognized, onProgress }: GuidedFileUploadProps) {
  const [recognitionResult, setRecognitionResult] = useState<FileRecognitionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsProcessing(true);
    onProgress({ message: 'Analyzing uploaded files...', progress: 20 });

    setTimeout(() => {
      const result = recognizeUploadedFiles(acceptedFiles);
      setRecognitionResult(result);
      onFilesRecognized(result);
      
      const stats = getFileStats(result);
      onProgress({ 
        message: `Recognized ${stats.recognizedCount} files (${stats.recognitionRate.toFixed(1)}% success rate)`, 
        progress: 50 
      });
      setIsProcessing(false);
    }, 1000);
  }, [onFilesRecognized, onProgress]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: true
  });

  return (
    <div className="space-y-6">
      {/* File Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        {isProcessing ? (
          <div className="space-y-2">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-black">Analyzing files...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl text-black">📁</div>
            <p className="text-lg font-medium text-black">
              {isDragActive ? 'Drop files here' : 'Drag &amp; drop files here'}
            </p>
            <p className="text-sm text-black">
              or click to browse (supports .json and .csv files)
            </p>
          </div>
        )}
      </div>

      {/* Recognition Results */}
      {recognitionResult && (
        <div className="space-y-4">
          <FileRecognitionSummary result={recognitionResult} />
          
          {/* Recognized Files */}
          {Object.keys(recognitionResult.recognized).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3">✅ Recognized Files</h3>
              <div className="space-y-2">
                {Object.entries(recognitionResult.recognized).map(([key, recognized]) => (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-black">{recognized.pattern.description}</span>
                    <span className="text-green-600">{recognized.file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Files */}
          {recognitionResult.missing.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-3">⚠️ Missing Required Files</h3>
              <div className="space-y-4">
                {recognitionResult.missing.map((pattern) => (
                  <MissingFileGuide key={pattern.key} pattern={pattern} />
                ))}
              </div>
            </div>
          )}

          {/* Unrecognized Files */}
          {recognitionResult.unrecognized.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-3">❌ Unrecognized Files</h3>
              <div className="space-y-2">
                {recognitionResult.unrecognized.map((file, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-red-600">{file.name}</span>
                    <span className="text-red-500 text-xs">Unknown file type</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-red-600 mt-2">
                These files don&apos;t match any expected patterns. Please check the file names or remove them.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileRecognitionSummary({ result }: { result: FileRecognitionResult }) {
  const stats = getFileStats(result);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-800 mb-2">File Recognition Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="font-medium text-blue-700">Total Files</div>
          <div className="text-2xl font-bold text-blue-900">{stats.totalFiles}</div>
        </div>
        <div>
          <div className="font-medium text-green-700">Recognized</div>
          <div className="text-2xl font-bold text-green-900">{stats.recognizedCount}</div>
        </div>
        <div>
          <div className="font-medium text-yellow-700">Missing</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.missingCount}</div>
        </div>
        <div>
          <div className="font-medium text-red-700">Unrecognized</div>
          <div className="text-2xl font-bold text-red-900">{stats.unrecognizedCount}</div>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-sm text-blue-700">
          <span>Recognition Rate</span>
          <span>{stats.recognitionRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${stats.recognitionRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

function MissingFileGuide({ pattern }: { pattern: FilePattern }) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="border border-yellow-300 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium text-yellow-800">{pattern.description}</h4>
          <p className="text-sm text-yellow-600">
            Source: {pattern.source.replace('_', ' ')}
            {pattern.required && <span className="text-red-500 ml-1">*</span>}
          </p>
        </div>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-yellow-600 hover:text-yellow-800 text-sm underline"
        >
          {showInstructions ? 'Hide' : 'Show'} Instructions
        </button>
      </div>
      
      {showInstructions && (
        <div className="mt-3 p-3 bg-yellow-100 rounded text-sm">
          <div className="whitespace-pre-line">{getDownloadInstructions(pattern)}</div>
          
          {pattern.url && (
            <div className="mt-2">
              <a 
                href={pattern.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              >
                Open Download Link
              </a>
            </div>
          )}
          
          <div className="mt-2 text-xs text-yellow-700">
            <strong>Expected patterns:</strong> {pattern.patterns.map(p => p.source).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}