import { useState } from 'react';
import { workerDataService } from '@/services/workerDataService';

export function TestWorker() {
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<any>(null);

  const testWorker = async () => {
    setStatus('Testing worker...');
    
    try {
      const worker = new Worker('/workers/attributionWorkerComplete.js');
      
      // Test data
      const testData = {
        contacts: [
          { id: 'test1', email: 'test@example.com', spotify_id: 'spotify123' }
        ],
        clients: [
          { id: 'client1', email: 'test@example.com', revenue: 100 }
        ],
        threads: [],
        audits: [],
        v1ContactStats: [],
        v2ContactStats: [],
        v3ContactStats: [],
        sequences: [],
        convrtLeads: [],
        convrtAuditStatus: [],
        convrtReportStatus: []
      };

      worker.postMessage({
        type: 'PROCESS_COMPLETE_ATTRIBUTION',
        data: testData
      });

      worker.onmessage = (event) => {
        if (event.data.type === 'ATTRIBUTION_COMPLETE') {
          setStatus('✅ Worker completed! Saving results and triggering dashboard refresh...');
          setResults(event.data.results);
          
          // Save results to localStorage and trigger dashboard refresh
          try {
            workerDataService.saveToLocalStorage(event.data.results);
            setStatus('✅ Worker test successful! Dashboard will refresh automatically.');
          } catch (error) {
            console.error('Failed to save worker results:', error);
            setStatus('✅ Worker completed, but failed to save results to localStorage');
          }
          
        } else if (event.data.type === 'ATTRIBUTION_ERROR') {
          setStatus(`❌ Worker error: ${event.data.message}`);
        } else if (event.data.type === 'ATTRIBUTION_PROGRESS') {
          setStatus(`⏳ Progress: ${event.data.message}`);
        }
      };

      worker.onerror = (error) => {
        setStatus(`❌ Worker error: ${error.message}`);
      };

    } catch (error) {
      setStatus(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4">Worker Test</h3>
      
      <button
        onClick={testWorker}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Test Attribution Worker
      </button>
      
      {status && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p className="text-sm">{status}</p>
        </div>
      )}
      
      {results && (
        <div className="mt-4 p-3 bg-green-100 rounded">
          <h4 className="font-semibold text-green-800">Results:</h4>
          <pre className="text-xs text-green-700 mt-2 overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}