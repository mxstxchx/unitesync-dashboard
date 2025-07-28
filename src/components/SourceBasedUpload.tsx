import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { SalesforgeAPI } from '@/lib/salesforgeApi';
import { supabase } from '@/lib/supabase';
import { workerDataService } from '@/services/workerDataService';
import { supabaseDataService } from '@/services/supabaseDataService';

interface SourceBasedUploadProps {
  onComplete: (data: any) => void;
}

interface DataSource {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'file' | 'json_paste';
  required: boolean;
  data?: any;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

const dataSources: DataSource[] = [
  // API Sources
  {
    id: 'contacts',
    name: 'Contacts',
    description: 'All Salesforge contacts with custom variables',
    type: 'api',
    required: true,
    status: 'pending'
  },
  {
    id: 'threads',
    name: 'Threads',
    description: 'Email threads and conversations',
    type: 'api',
    required: true,
    status: 'pending'
  },
  {
    id: 'sequences',
    name: 'Sequences',
    description: 'Email sequences configuration',
    type: 'api',
    required: true,
    status: 'pending'
  },
  {
    id: 'mailboxes',
    name: 'Mailboxes',
    description: 'Email mailboxes configuration',
    type: 'api',
    required: true,
    status: 'pending'
  },
  {
    id: 'customVars',
    name: 'Custom Variables',
    description: 'Salesforge custom variables definitions',
    type: 'api',
    required: true,
    status: 'pending'
  },
  
  // File Upload Sources
  {
    id: 'clients',
    name: 'Clients Export',
    description: 'Client data from admin panel (export_clients.csv)',
    type: 'file',
    required: true,
    status: 'pending'
  },
  {
    id: 'v1ContactStats',
    name: 'V1 Contact Statistics',
    description: 'V1 sequence contact statistics CSV',
    type: 'file',
    required: true,
    status: 'pending'
  },
  {
    id: 'v2ContactStats',
    name: 'V2 Contact Statistics',
    description: 'V2 sequence contact statistics CSV',
    type: 'file',
    required: true,
    status: 'pending'
  },
  {
    id: 'v3ContactStats',
    name: 'V3 Contact Statistics',
    description: 'V3 sequence contact statistics CSV',
    type: 'file',
    required: true,
    status: 'pending'
  },
  {
    id: 'v3SubsequenceStats',
    name: 'V3 Subsequence Statistics',
    description: 'V3 Positive Subsequence contact statistics CSV',
    type: 'file',
    required: true,
    status: 'pending'
  },
  {
    id: 'inboundAuditStats',
    name: 'Inbound Audit Statistics',
    description: 'Inbound audits contact statistics CSV',
    type: 'file',
    required: true,
    status: 'pending'
  },
  {
    id: 'convrtLeads',
    name: 'Convrt Leads',
    description: 'Instagram outreach leads CSV',
    type: 'file',
    required: true,
    status: 'pending'
  },
  
  // JSON Paste Sources (from network console)
  {
    id: 'audits',
    name: 'Audits',
    description: 'Audit requests from UniteSync dashboard network console',
    type: 'json_paste',
    required: true,
    status: 'pending'
  },
  {
    id: 'convrtAuditStatus',
    name: 'Convrt Audit Status',
    description: 'Convrt audit campaign status from network console',
    type: 'json_paste',
    required: true,
    status: 'pending'
  },
  {
    id: 'convrtReportStatus',
    name: 'Convrt Report Status',
    description: 'Convrt report campaign status from network console',
    type: 'json_paste',
    required: true,
    status: 'pending'
  },
  
  // Optional file uploads
  {
    id: 'v1Emails',
    name: 'V1 Emails',
    description: 'V1 sequence email exports (optional, ~30MB)',
    type: 'file',
    required: false,
    status: 'pending'
  },
  {
    id: 'v2Emails',
    name: 'V2 Emails',
    description: 'V2 sequence email exports (optional, ~30MB)',
    type: 'file',
    required: false,
    status: 'pending'
  },
  {
    id: 'v3Emails',
    name: 'V3 Emails',
    description: 'V3 sequence email exports (optional, ~30MB)',
    type: 'file',
    required: false,
    status: 'pending'
  },
  {
    id: 'v3SubsequenceEmails',
    name: 'V3 Subsequence Emails',
    description: 'V3 Positive Subsequence sequence email exports',
    type: 'file',
    required: false,
    status: 'pending'
  },
  {
    id: 'auditEmails',
    name: 'Audit Emails',
    description: 'Audit sequence email exports (optional)',
    type: 'file',
    required: false,
    status: 'pending'
  }
];

export default function SourceBasedUpload({ onComplete }: SourceBasedUploadProps) {
  const [sources, setSources] = useState<DataSource[]>(dataSources);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [api] = useState(new SalesforgeAPI());

  // Save attribution results to Supabase
  const saveToSupabase = async (attributionData: any) => {
    try {
      console.log('💾 Saving attribution report to Supabase...');
      
      // Create a simplified report structure matching our Supabase schema
      const reportForSupabase = {
        ...attributionData,
        summary: {
          total_clients: attributionData.total_clients || 0,
          attributed_clients: attributionData.attributed_clients || 0,
          attribution_rate: parseFloat(attributionData.attribution_rate || '0') / 100
        }
      };

      // Use the existing supabaseDataService's save method
      // Note: We need to create a saveAttributionReport method if it doesn't exist
      console.log('📤 Calling Supabase service to save report...');
      
      // For now, we'll use a direct approach until we can create the proper service method
      const { data, error } = await supabase
        .from('attribution_reports')
        .insert({
          report_data: reportForSupabase,
          generated_at: new Date().toISOString(),
          total_clients: attributionData.total_clients || 0,
          attributed_clients: attributionData.attributed_clients || 0,
          attribution_rate: parseFloat(attributionData.attribution_rate || '0') / 100
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Attribution report saved to Supabase with ID:', data.id);
      setProgressMessage('Successfully saved to Supabase!');
      
    } catch (error) {
      console.error('❌ Failed to save to Supabase:', error);
      setProgressMessage('Supabase save failed, continuing with local save...');
    } finally {
      // Complete the process regardless of Supabase success/failure
      setTimeout(() => {
        setProgress(100);
        setProgressMessage('Attribution processing complete!');
        setIsProcessing(false);
        worker.terminate();
        
        // Continue with the rest of the original completion logic
        finishProcessing(attributionData);
      }, 1000);
    }
  };

  // Complete the processing workflow
  const finishProcessing = (attributionData: any) => {
    console.log('📊 Attribution Rate:', attributionData.attribution_rate);
    console.log('📈 Attribution Breakdown:', attributionData.attribution_breakdown);
    console.log('💰 Revenue Breakdown:', attributionData.revenue_breakdown);
    console.log('👥 Total Clients:', attributionData.total_clients);
    console.log('✅ Attributed Clients:', attributionData.attributed_clients);
    
    // Enhanced logging for new features
    if (attributionData.sequence_variants_summary) {
      console.log('🔬 SEQUENCE VARIANTS SUMMARY:', attributionData.sequence_variants_summary);
    }
    
    // Show console notice
    console.log('\n🚀 ENHANCED FEATURES ACTIVE:');
    console.log('   • Enhanced thread fetching for Email Outreach - New Method');
    console.log('   • Variant analysis using established methodology');
    console.log('   • Sequence variants summary for database population');
    console.log('   • Complete referential integrity with database schema');
    console.log('\n📖 Check the console output above for detailed debug information');
    
    // Save results to WorkerDataService for dashboard auto-refresh
    try {
      console.log('💾 Saving attribution results to WorkerDataService...');
      console.log('🔍 Data structure check before saving:', {
        hasAttributedClientsData: !!attributionData.attributed_clients_data,
        attributedClientsCount: attributionData.attributed_clients_data?.length || 0,
        hasAttributionBreakdown: !!attributionData.attribution_breakdown,
        hasRevenueBreakdown: !!attributionData.revenue_breakdown,
        hasDataSourcesSummary: !!attributionData.data_sources_summary,
        totalClients: attributionData.total_clients,
        attributedClients: attributionData.attributed_clients
      });
      
      workerDataService.saveToLocalStorage(attributionData);
      console.log('✅ Attribution results saved successfully - dashboard will auto-refresh');
    } catch (error) {
      console.error('❌ Failed to save attribution results to WorkerDataService:', error);
    }
    
    // Complete the upload process
    onComplete({
      attributionResults: attributionData,
      processedData: sources.reduce((acc, source) => {
        if (source.data) {
          acc[source.id] = source.data;
        }
        return acc;
      }, {} as any)
    });
  };

  const updateSource = useCallback((id: string, updates: Partial<DataSource>) => {
    setSources(prev => prev.map(source => 
      source.id === id ? { ...source, ...updates } : source
    ));
  }, []);

  const fetchApiData = async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    updateSource(sourceId, { status: 'loading' });

    try {
      let data;
      switch (sourceId) {
        case 'contacts':
          data = await api.fetchContacts((progress) => setProgress(progress));
          break;
        case 'threads':
          data = await api.fetchThreads((progress) => setProgress(progress));
          break;
        case 'sequences':
          data = await api.fetchSequences((progress) => setProgress(progress));
          break;
        case 'mailboxes':
          data = await api.fetchMailboxes((progress) => setProgress(progress));
          break;
        case 'customVars':
          data = await api.fetchCustomVars((progress) => setProgress(progress));
          break;
        default:
          throw new Error(`Unknown API source: ${sourceId}`);
      }

      updateSource(sourceId, { status: 'success', data });
    } catch (error) {
      updateSource(sourceId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const handleFileDrop = useCallback((files: File[], sourceId: string) => {
    const file = files[0];
    if (!file) return;

    updateSource(sourceId, { status: 'loading' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          updateSource(sourceId, { 
            status: 'error', 
            error: `CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}` 
          });
        } else {
          updateSource(sourceId, { 
            status: 'success', 
            data: result.data 
          });
        }
      },
      error: (error) => {
        updateSource(sourceId, { 
          status: 'error', 
          error: `Failed to parse CSV: ${error.message}` 
        });
      }
    });
  }, [updateSource]);

  const handleJsonPaste = useCallback((jsonText: string, sourceId: string) => {
    try {
      const data = JSON.parse(jsonText);
      
      // Handle both direct arrays and wrapped objects (e.g., {"response": [...]})
      let processedData;
      if (Array.isArray(data)) {
        processedData = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.response)) {
        // Handle wrapped response structure from network console
        processedData = data.response;
      } else {
        processedData = [data];
      }
      
      updateSource(sourceId, { 
        status: 'success', 
        data: processedData 
      });
    } catch (error) {
      updateSource(sourceId, { 
        status: 'error', 
        error: 'Invalid JSON format' 
      });
    }
  }, [updateSource]);

  const processAllData = async () => {
    const successfulSources = sources.filter(s => s.status === 'success');
    const requiredSources = sources.filter(s => s.required);
    const missingRequired = requiredSources.filter(s => s.status !== 'success');

    if (missingRequired.length > 0) {
      alert(`Missing required data: ${missingRequired.map(s => s.name).join(', ')}`);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Starting attribution processing...');

    // Compile all data
    const compiledData: any = {};
    successfulSources.forEach(source => {
      if (source.data) {
        compiledData[source.id] = source.data;
      }
    });

    // Fetch labels from database
    try {
      setProgressMessage('Fetching labels from database...');
      const { data: labels, error: labelsError } = await supabase
        .from('labels')
        .select('*')
        .order('name');
      
      if (labelsError) {
        console.warn('Could not fetch labels from database:', labelsError);
        compiledData.labels = []; // Continue with empty labels
      } else {
        compiledData.labels = labels || [];
        console.log(`✅ Fetched ${labels?.length || 0} labels from database`);
      }
    } catch (error) {
      console.warn('Error fetching labels:', error);
      compiledData.labels = []; // Continue with empty labels
    }

    // Fetch referral sources from database
    try {
      setProgressMessage('Fetching referral sources from database...');
      const { data: referralSources, error: referralSourcesError } = await supabase
        .from('referral_sources')
        .select('*')
        .order('id');
      
      if (referralSourcesError) {
        console.warn('Could not fetch referral sources from database:', referralSourcesError);
        compiledData.referralSources = []; // Continue with empty referral sources
      } else {
        compiledData.referralSources = referralSources || [];
        console.log(`✅ Fetched ${referralSources?.length || 0} referral sources from database`);
      }
    } catch (error) {
      console.warn('Error fetching referral sources:', error);
      compiledData.referralSources = []; // Continue with empty referral sources
    }

    // Process with worker
    try {
      console.log('Starting worker with data:', Object.keys(compiledData));
      const worker = new Worker('/workers/attributionWorkerConfidenceBased.js');
      
      // Set a timeout to handle stuck workers (extended for sequential API processing)
      const workerTimeout = setTimeout(() => {
        console.log('Worker timed out');
        worker.terminate();
        alert('Worker timed out after 15 minutes. This may indicate API issues or very large dataset.');
        setIsProcessing(false);
      }, 900000); // 15 minutes timeout for sequential processing with delays
      
      worker.postMessage({
        type: 'PROCESS_ATTRIBUTION',
        data: compiledData
      });

      worker.onmessage = (event) => {
        console.log('Worker message received:', event.data);
        if (event.data.type === 'ATTRIBUTION_COMPLETE') {
          clearTimeout(workerTimeout);
          setProgress(95);
          setProgressMessage('Saving to Supabase...');
          
          console.log('🎉 ATTRIBUTION REPORT GENERATED:', event.data.data);
          
          // Save to Supabase
          saveToSupabase(event.data.data);
        } else if (event.data.type === 'ERROR') {
          clearTimeout(workerTimeout);
          console.error('Worker error:', event.data.data);
          alert(`Attribution error: ${event.data.data.message}`);
          setIsProcessing(false);
          worker.terminate();
        } else if (event.data.type === 'PROGRESS') {
          const progressValue = event.data.data;
          console.log('Progress update:', progressValue);
          
          if (typeof progressValue === 'object' && progressValue.message) {
            // Enhanced progress with message
            setProgressMessage(progressValue.message);
            if (typeof progressValue.progress === 'number') {
              setProgress(50 + (progressValue.progress * 0.5));
            }
          } else if (typeof progressValue === 'number' && !isNaN(progressValue)) {
            // Legacy numeric progress
            setProgress(50 + (progressValue * 0.5));
            setProgressMessage('Processing attribution...');
          }
        }
      };

      worker.onerror = (error) => {
        clearTimeout(workerTimeout);
        console.error('Worker error:', error);
        alert(`Worker error: ${error.message}`);
        setIsProcessing(false);
        worker.terminate();
      };

    } catch (error) {
      console.error('Processing error:', error);
      alert(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  const getCompletionStats = () => {
    const total = sources.filter(s => s.required).length;
    const completed = sources.filter(s => s.required && s.status === 'success').length;
    return { completed, total, percentage: (completed / total) * 100 };
  };

  const stats = getCompletionStats();
  const apiConfig = api.getConfigurationStatus();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-black mb-2">Source-Based Data Upload</h2>
        <p className="text-black">
          Collect data from API calls, file uploads, and network console
        </p>
      </div>

      {/* API Configuration Status */}
      {!apiConfig.isConfigured && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800">⚠️ API Configuration Required</h3>
          <p className="text-red-700 text-sm mt-1">
            Please add SALESFORGE_API_KEY and SALESFORGE_WORKSPACE_ID to your .env.local file
          </p>
        </div>
      )}

      {/* Progress Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-blue-900">Progress</span>
          <span className="text-blue-700">{stats.completed}/{stats.total} required ({stats.percentage.toFixed(0)}%)</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${stats.percentage}%` }}
          ></div>
        </div>
        
        {/* Enhanced processing progress */}
        {isProcessing && (
          <div className="mt-3 p-3 bg-white rounded border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-black">Attribution Processing</span>
              <span className="text-sm text-black">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {progressMessage && (
              <div className="text-sm text-black mt-1">
                📊 {progressMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Sources */}
      <div className="space-y-6">
        {/* API Sources */}
        <div>
          <h3 className="text-lg font-semibold text-black mb-4">🔗 API Sources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.filter(s => s.type === 'api').map(source => (
              <ApiSourceCard 
                key={source.id} 
                source={source} 
                onFetch={() => fetchApiData(source.id)}
                disabled={!apiConfig.isConfigured}
              />
            ))}
          </div>
        </div>

        {/* File Upload Sources */}
        <div>
          <h3 className="text-lg font-semibold text-black mb-4">📁 File Upload Sources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.filter(s => s.type === 'file').map(source => (
              <FileSourceCard 
                key={source.id} 
                source={source} 
                onFileDrop={(files) => handleFileDrop(files, source.id)}
              />
            ))}
          </div>
        </div>

        {/* JSON Paste Sources */}
        <div>
          <h3 className="text-lg font-semibold text-black mb-4">📋 Network Console Sources</h3>
          <div className="grid grid-cols-1 gap-4">
            {sources.filter(s => s.type === 'json_paste').map(source => (
              <JsonSourceCard 
                key={source.id} 
                source={source} 
                onJsonPaste={(json) => handleJsonPaste(json, source.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Process Button */}
      <div className="text-center">
        <button
          onClick={processAllData}
          disabled={stats.percentage < 100 || isProcessing}
          className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
            stats.percentage >= 100 && !isProcessing
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-black cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-1">
              <div>{`Processing... ${progress.toFixed(0)}%`}</div>
              {progressMessage && (
                <div className="text-sm opacity-80">{progressMessage}</div>
              )}
            </div>
          ) : (
            'Process All Data & Run Attribution'
          )}
        </button>
      </div>
    </div>
  );
}

// Component for API sources
function ApiSourceCard({ source, onFetch, disabled }: { 
  source: DataSource; 
  onFetch: () => void; 
  disabled: boolean; 
}) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-black">{source.name}</h4>
        <StatusIndicator status={source.status} />
      </div>
      <p className="text-sm text-black mb-4">{source.description}</p>
      
      {source.status === 'success' && source.data && (
        <p className="text-sm text-green-600 mb-2">✅ {source.data.length} records loaded</p>
      )}
      
      {source.status === 'error' && (
        <p className="text-sm text-red-600 mb-2">❌ {source.error}</p>
      )}
      
      <button
        onClick={onFetch}
        disabled={disabled || source.status === 'loading'}
        className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
          disabled || source.status === 'loading'
            ? 'bg-gray-200 text-black cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {source.status === 'loading' ? 'Fetching...' : 'Fetch from API'}
      </button>
    </div>
  );
}

// Component for file upload sources
function FileSourceCard({ source, onFileDrop }: { 
  source: DataSource; 
  onFileDrop: (files: File[]) => void; 
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  });

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-black">{source.name}</h4>
        <StatusIndicator status={source.status} />
      </div>
      <p className="text-sm text-black mb-4">{source.description}</p>
      
      {source.status === 'success' && source.data && (
        <p className="text-sm text-green-600 mb-2">✅ {source.data.length} records loaded</p>
      )}
      
      {source.status === 'error' && (
        <p className="text-sm text-red-600 mb-2">❌ {source.error}</p>
      )}
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-black">
          {isDragActive ? 'Drop CSV file here' : 'Drag & drop CSV file or click to browse'}
        </p>
      </div>
    </div>
  );
}

// Component for JSON paste sources
function JsonSourceCard({ source, onJsonPaste }: { 
  source: DataSource; 
  onJsonPaste: (json: string) => void; 
}) {
  const [jsonText, setJsonText] = useState('');

  const handlePaste = () => {
    if (jsonText.trim()) {
      onJsonPaste(jsonText.trim());
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-black">{source.name}</h4>
        <StatusIndicator status={source.status} />
      </div>
      <p className="text-sm text-black mb-4">{source.description}</p>
      
      {source.status === 'success' && source.data && (
        <p className="text-sm text-green-600 mb-2">✅ {Array.isArray(source.data) ? source.data.length : Object.keys(source.data).length} records loaded</p>
      )}
      
      {source.status === 'error' && (
        <p className="text-sm text-red-600 mb-2">❌ {source.error}</p>
      )}
      
      <div className="space-y-2">
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder="Paste JSON data from network console here..."
          className="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50 text-black"
          rows={4}
        />
        <button
          onClick={handlePaste}
          disabled={!jsonText.trim()}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            jsonText.trim()
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-black cursor-not-allowed'
          }`}
        >
          Parse JSON
        </button>
      </div>
    </div>
  );
}

// Status indicator component
function StatusIndicator({ status }: { status: DataSource['status'] }) {
  const configs = {
    pending: { color: 'text-black', icon: '⏳' },
    loading: { color: 'text-blue-600', icon: '🔄' },
    success: { color: 'text-green-600', icon: '✅' },
    error: { color: 'text-red-600', icon: '❌' }
  };

  const config = configs[status];
  
  return (
    <span className={`text-sm ${config.color}`}>
      {config.icon}
    </span>
  );
}