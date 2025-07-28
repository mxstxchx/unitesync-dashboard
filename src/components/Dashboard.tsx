import React, { useState, useEffect, useRef } from 'react';
import DataUpload from './DataUpload';
import { processAllData, getAttributionSummary, getRevenueAnalytics } from '../lib/supabaseOperations';

interface DashboardProps {}

interface AttributionData {
  processing_date: string;
  total_clients: number;
  attributed_clients: number;
  attribution_rate: string;
  attribution_breakdown: { [key: string]: number };
  revenue_breakdown: { [key: string]: number };
  attributed_clients_data: any[];
}

interface Progress {
  message: string;
  progress: number;
}

const Dashboard: React.FC<DashboardProps> = () => {
  const [currentView, setCurrentView] = useState<'upload' | 'processing' | 'dashboard'>('upload');
  const [attributionData, setAttributionData] = useState<AttributionData | null>(null);
  const [progress, setProgress] = useState<Progress>({ message: '', progress: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/attributionWorker.js', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      const { type, data } = e.data;
      
      switch (type) {
        case 'PROGRESS':
          setProgress(data);
          break;
          
        case 'ATTRIBUTION_COMPLETE':
          handleAttributionComplete(data);
          break;
          
        case 'ERROR':
          setError(data.message);
          setIsProcessing(false);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleDataProcessed = async (data: any) => {
    setCurrentView('processing');
    setIsProcessing(true);
    setError(null);
    
    try {
      // Step 1: Process attribution in Web Worker
      setProgress({ message: 'Starting attribution analysis...', progress: 0 });
      
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'PROCESS_ATTRIBUTION',
          data: data
        });
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      setError(error.message);
      setIsProcessing(false);
    }
  };

  const handleAttributionComplete = async (attributionResult: AttributionData) => {
    try {
      // Step 2: Save processed data to Supabase
      setProgress({ message: 'Saving data to database...', progress: 80 });
      
      const supabaseResult = await processAllData(
        {
          clients: attributionResult.attributed_clients_data,
          // Add other data sources as needed
        },
        (progress) => setProgress(progress)
      );

      if (supabaseResult.success) {
        setAttributionData(attributionResult);
        setCurrentView('dashboard');
        setProgress({ message: 'Processing complete!', progress: 100 });
      } else {
        throw new Error('Failed to save data to database');
      }
      
    } catch (error) {
      console.error('Database save error:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadExistingData = async () => {
    try {
      setProgress({ message: 'Loading existing data...', progress: 0 });
      
      const [attributionSummary, revenueAnalytics] = await Promise.all([
        getAttributionSummary(),
        getRevenueAnalytics()
      ]);

      const existingData: AttributionData = {
        processing_date: new Date().toISOString(),
        total_clients: attributionSummary.total_clients,
        attributed_clients: attributionSummary.total_clients - (attributionSummary.attribution_breakdown['Unattributed'] || 0),
        attribution_rate: `${revenueAnalytics.attribution_rate.toFixed(1)}%`,
        attribution_breakdown: attributionSummary.attribution_breakdown,
        revenue_breakdown: attributionSummary.revenue_breakdown,
        attributed_clients_data: []
      };

      setAttributionData(existingData);
      setCurrentView('dashboard');
      setProgress({ message: 'Data loaded successfully', progress: 100 });
      
    } catch (error) {
      console.error('Error loading existing data:', error);
      setError(error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%';
  };

  // Pipeline color mapping
  const pipelineColors = {
    'Email Outreach': 'bg-blue-500',
    'Instagram Outreach': 'bg-purple-500',
    'Royalty Audit': 'bg-green-500',
    'Unattributed': 'bg-gray-500'
  };

  const renderUploadView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-black mb-2">UniteSync Sales Dashboard</h1>
        <p className="text-black">Upload your data files to analyze sales attribution and KPIs</p>
      </div>
      
      <DataUpload onDataProcessed={handleDataProcessed} onProgress={setProgress} />
      
      <div className="text-center">
        <button
          onClick={loadExistingData}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Load Existing Data
        </button>
      </div>
    </div>
  );

  const renderProcessingView = () => (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-black text-center">Processing Data</h2>
      
      <div className="space-y-4">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        
        <div className="text-center">
          <p className="text-black mb-2">{progress.message}</p>
          <p className="text-sm text-black">{progress.progress}% complete</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboardView = () => {
    if (!attributionData) return null;

    const totalRevenue = Object.values(attributionData.revenue_breakdown).reduce((sum, val) => sum + val, 0);
    const attributedRevenue = totalRevenue - (attributionData.revenue_breakdown['Unattributed'] || 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-black">Sales Attribution Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('upload')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload New Data
            </button>
            <button
              onClick={loadExistingData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-black mb-2">Total Clients</h3>
            <p className="text-3xl font-bold text-blue-600">{attributionData.total_clients}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-black mb-2">Attribution Rate</h3>
            <p className="text-3xl font-bold text-green-600">{attributionData.attribution_rate}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-black mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(totalRevenue)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-black mb-2">Attributed Revenue</h3>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(attributedRevenue)}</p>
          </div>
        </div>

        {/* Attribution Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-black mb-4">Client Attribution</h3>
            <div className="space-y-3">
              {Object.entries(attributionData.attribution_breakdown).map(([pipeline, count]) => (
                <div key={pipeline} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${pipelineColors[pipeline] || 'bg-gray-400'}`} />
                    <span className="font-medium text-black">{pipeline}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-black">{count}</span>
                    <span className="text-sm text-black ml-2">
                      ({formatPercentage(count, attributionData.total_clients)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-black mb-4">Revenue Attribution</h3>
            <div className="space-y-3">
              {Object.entries(attributionData.revenue_breakdown).map(([pipeline, revenue]) => (
                <div key={pipeline} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${pipelineColors[pipeline] || 'bg-gray-400'}`} />
                    <span className="font-medium text-black">{pipeline}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-black">{formatCurrency(revenue)}</span>
                    <span className="text-sm text-black ml-2">
                      ({formatPercentage(revenue, totalRevenue)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline Performance */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-black mb-4">Pipeline Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-semibold text-black">Pipeline</th>
                  <th className="px-4 py-2 text-right font-semibold text-black">Clients</th>
                  <th className="px-4 py-2 text-right font-semibold text-black">Revenue</th>
                  <th className="px-4 py-2 text-right font-semibold text-black">Avg Revenue/Client</th>
                  <th className="px-4 py-2 text-right font-semibold text-black">Client %</th>
                  <th className="px-4 py-2 text-right font-semibold text-black">Revenue %</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(attributionData.attribution_breakdown).map(([pipeline, clientCount]) => {
                  const revenue = attributionData.revenue_breakdown[pipeline] || 0;
                  const avgRevenue = clientCount > 0 ? revenue / clientCount : 0;
                  
                  return (
                    <tr key={pipeline} className="border-t">
                      <td className="px-4 py-2">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${pipelineColors[pipeline] || 'bg-gray-400'}`} />
                          {pipeline}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-black">{clientCount}</td>
                      <td className="px-4 py-2 text-right font-medium text-black">{formatCurrency(revenue)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(avgRevenue)}</td>
                      <td className="px-4 py-2 text-right text-black">
                        {formatPercentage(clientCount, attributionData.total_clients)}
                      </td>
                      <td className="px-4 py-2 text-right text-black">
                        {formatPercentage(revenue, totalRevenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Processing Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-black">
            Last processed: {new Date(attributionData.processing_date).toLocaleString()}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {currentView === 'upload' && renderUploadView()}
        {currentView === 'processing' && renderProcessingView()}
        {currentView === 'dashboard' && renderDashboardView()}
      </div>
    </div>
  );
};

export default Dashboard;