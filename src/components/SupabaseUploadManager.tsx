import React, { useState, useEffect } from 'react';
import { supabaseUploadService, AttributionResult } from '@/services/supabaseUploadService';

interface SupabaseUploadManagerProps {
  attributionResults: AttributionResult | null;
  rawData?: any; // Raw source data from SourceBasedUpload
  onUploadComplete?: (result: any) => void;
  uploadMode?: 'attribution_only' | 'comprehensive'; // Upload mode selection
}

export function SupabaseUploadManager({ attributionResults, rawData, onUploadComplete, uploadMode = 'attribution_only' }: SupabaseUploadManagerProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState({ processed: 0, total: 0, percentage: 0 });
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUploadMode, setCurrentUploadMode] = useState<'attribution_only' | 'comprehensive'>(uploadMode);

  const handleUpload = async () => {
    if (!attributionResults) {
      setError('No attribution results to upload');
      return;
    }

    setUploadStatus('uploading');
    setError(null);
    setUploadProgress({ processed: 0, total: 0, percentage: 0 });

    try {
      console.log('🚀 Starting Supabase upload...');
      console.log(`📊 Upload mode: ${currentUploadMode}`);
      
      let result;
      
      if (currentUploadMode === 'comprehensive' && rawData) {
        // Use comprehensive upload method
        result = await supabaseUploadService.uploadComprehensiveData(
          rawData,
          attributionResults,
          {
            batchSize: 25,
            onProgress: (progress) => {
              setUploadProgress(progress);
              console.log(`📊 Comprehensive upload progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
            },
            uploadRawData: true,
            uploadEnhancements: true
          }
        );
      } else {
        // Use attribution-only upload method (backward compatibility)
        result = await supabaseUploadService.uploadAttributionResults(
          attributionResults,
          {
            batchSize: 25, // Smaller batches for better reliability
            onProgress: (progress) => {
              setUploadProgress(progress);
              console.log(`📊 Attribution upload progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
            }
          }
        );
      }

      console.log('✅ Upload completed:', result);
      setUploadResult(result);
      setUploadStatus('success');
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploadStatus('error');
    }
  };

  const handleRetry = () => {
    setUploadStatus('idle');
    setError(null);
    setUploadResult(null);
    setUploadProgress({ processed: 0, total: 0, percentage: 0 });
  };

  if (!attributionResults) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Supabase Upload</h3>
        <p className="text-black">No attribution results available for upload.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4">📤 Supabase Upload Manager</h3>
      
      {/* Upload Mode Selection */}
      {rawData && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
          <h4 className="font-medium text-indigo-900 mb-3">Upload Configuration</h4>
          <div className="space-y-3">
            <div>
              <span className="text-indigo-700 text-sm font-medium">Upload Mode:</span>
              <div className="mt-1 flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="attribution_only"
                    checked={currentUploadMode === 'attribution_only'}
                    onChange={(e) => setCurrentUploadMode(e.target.value as any)}
                    className="form-radio h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-2 text-sm">Attribution Only (447 clients)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="comprehensive"
                    checked={currentUploadMode === 'comprehensive'}
                    onChange={(e) => setCurrentUploadMode(e.target.value as any)}
                    className="form-radio h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-2 text-sm">Comprehensive (All Raw Data + Attribution)</span>
                </label>
              </div>
            </div>
            
            {currentUploadMode === 'comprehensive' && (
              <div className="bg-white p-3 rounded border">
                <h5 className="font-medium text-black mb-2">Raw Data Sources Available:</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(rawData).map(([key, value]) => (
                    Array.isArray(value) && (
                      <div key={key} className="flex justify-between">
                        <span className="text-black">{key}:</span>
                        <span className="font-semibold text-indigo-600">{value.length} records</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attribution Results Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Attribution Results Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Clients:</span>
            <span className="ml-2 font-semibold">{attributionResults.total_clients}</span>
          </div>
          <div>
            <span className="text-blue-700">Attributed Clients:</span>
            <span className="ml-2 font-semibold">{attributionResults.attributed_clients}</span>
          </div>
          {attributionResults.revenueAnalytics?.summary?.revenue_attributed_clients && (
            <div>
              <span className="text-blue-700">Revenue Attributed:</span>
              <span className="ml-2 font-semibold">{attributionResults.revenueAnalytics.summary.revenue_attributed_clients}</span>
            </div>
          )}
          <div>
            <span className="text-blue-700">Attribution Rate:</span>
            <span className="ml-2 font-semibold">{attributionResults.attribution_rate}</span>
          </div>
          <div>
            <span className="text-blue-700">Processing Date:</span>
            <span className="ml-2 font-semibold">
              {new Date(attributionResults.processing_date).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Breakdown */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Pipeline Breakdown</h4>
        <div className="space-y-2">
          {Object.entries(attributionResults.attribution_breakdown).map(([pipeline, count]) => (
            <div key={pipeline} className="flex justify-between text-sm">
              <span className="text-green-700">{pipeline}:</span>
              <span className="font-semibold">{count} clients</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase 2 Enhanced Analytics */}
      {(attributionResults.sequence_variants_summary || attributionResults.conversion_timing_analysis || attributionResults.funnelMetrics) && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">Enhanced Analytics (Phase 2)</h4>
          <div className="space-y-2 text-sm">
            {attributionResults.sequence_variants_summary && (
              <div className="flex justify-between">
                <span className="text-purple-700">Sequence Variants:</span>
                <span className="font-semibold">{attributionResults.sequence_variants_summary.total_variants_identified}</span>
              </div>
            )}
            {attributionResults.conversion_timing_analysis && (
              <div className="flex justify-between">
                <span className="text-purple-700">Conversion Analysis:</span>
                <span className="font-semibold">{attributionResults.conversion_timing_analysis.conversion_variants_identified} conversions</span>
              </div>
            )}
            {attributionResults.funnelMetrics && (
              <div className="flex justify-between">
                <span className="text-purple-700">Funnel Metrics:</span>
                <span className="font-semibold">{Object.keys(attributionResults.funnelMetrics).length} pipelines</span>
              </div>
            )}
            {attributionResults.revenueAnalytics?.summary?.revenue_attributed_clients && (
              <div className="flex justify-between">
                <span className="text-purple-700">Revenue Clients:</span>
                <span className="font-semibold">{attributionResults.revenueAnalytics.summary.revenue_attributed_clients}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Status */}
      {uploadStatus === 'idle' && (
        <button
          onClick={handleUpload}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          🚀 Upload Attribution Results to Supabase
        </button>
      )}

      {uploadStatus === 'uploading' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-lg font-medium text-blue-600">Uploading to Supabase...</div>
            <div className="text-sm text-black">
              {uploadProgress.processed} of {uploadProgress.total} clients processed
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
          
          <div className="text-center text-sm text-black">
            {uploadProgress.percentage}% complete
          </div>
        </div>
      )}

      {uploadStatus === 'success' && uploadResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-lg font-medium text-black">Upload Successful!</span>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Upload Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Clients:</span>
                <span className="font-semibold">{uploadResult.summary.total_clients}</span>
              </div>
              <div className="flex justify-between">
                <span>Successful Uploads:</span>
                <span className="font-semibold text-green-600">{uploadResult.summary.successful_uploads}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed Uploads:</span>
                <span className="font-semibold text-red-600">{uploadResult.summary.failed_uploads}</span>
              </div>
              <div className="flex justify-between">
                <span>Job ID:</span>
                <span className="font-semibold">#{uploadResult.jobId}</span>
              </div>
            </div>
          </div>

          {/* Phase 2 Enhancement Results */}
          {(uploadResult.summary.sequence_variants_upload || 
            uploadResult.summary.funnel_metrics_upload || 
            uploadResult.summary.conversion_timing_upload) && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Phase 2 Enhancement Uploads</h4>
              <div className="space-y-1 text-sm">
                {uploadResult.summary.sequence_variants_upload && (
                  <div className="flex justify-between">
                    <span>Sequence Variant Analytics:</span>
                    <span className="font-semibold text-purple-600">
                      {uploadResult.summary.sequence_variants_upload.processedCount} variants
                    </span>
                  </div>
                )}
                {uploadResult.summary.funnel_metrics_upload && (
                  <div className="flex justify-between">
                    <span>Funnel Metrics:</span>
                    <span className="font-semibold text-purple-600">
                      {uploadResult.summary.funnel_metrics_upload.processedCount} pipelines
                    </span>
                  </div>
                )}
                {uploadResult.summary.conversion_timing_upload && (
                  <div className="flex justify-between">
                    <span>Conversion Timing:</span>
                    <span className="font-semibold text-purple-600">
                      {uploadResult.summary.conversion_timing_upload.processedCount} records
                    </span>
                  </div>
                )}
                {uploadResult.summary.enhancement_errors && (
                  <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-xs">
                    <strong>Enhancement Warning:</strong> {uploadResult.summary.enhancement_errors}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-lg font-medium text-black">Upload Failed</span>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Error Details</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          
          <button
            onClick={handleRetry}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            🔄 Retry Upload
          </button>
        </div>
      )}

      {/* Upload Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-black mb-2">Enhanced Upload Process</h4>
        <ul className="text-sm text-black space-y-1">
          <li>• Clears existing client data from Supabase</li>
          <li>• Uploads attribution results in batches of 25</li>
          <li>• <strong className="text-purple-600">NEW:</strong> Uploads Phase 2 sequence variant analytics</li>
          <li>• <strong className="text-purple-600">NEW:</strong> Uploads funnel metrics for pipeline optimization</li>
          <li>• <strong className="text-purple-600">NEW:</strong> Uploads conversion timing analysis</li>
          <li>• Creates processing job record for tracking</li>
          <li>• Provides real-time progress updates</li>
          <li>• Stores comprehensive attribution analytics</li>
        </ul>
      </div>
    </div>
  );
}

export default SupabaseUploadManager;