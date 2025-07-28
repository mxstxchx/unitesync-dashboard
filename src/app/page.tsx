'use client'

import { useState, useEffect } from 'react'
import { DashboardTabs } from '@/components/DashboardTabs'
import { setupInitialData } from '@/utils/setupInitialData'
import SourceBasedUpload from '@/components/SourceBasedUpload'
import SupabaseUploadManager from '@/components/SupabaseUploadManager'
import { GeneralTab } from '@/components/tabs/GeneralTab'
import { EmailOutreachTab } from '@/components/tabs/EmailOutreachTab'
import { InboundAuditsTab } from '@/components/tabs/InboundAuditsTab'
import { InstagramOutreachTab } from '@/components/tabs/InstagramOutreachTab'
import { UnattributedTab } from '@/components/tabs/UnattributedTab'

export type TabType = 'general' | 'email' | 'inbound' | 'instagram' | 'unattributed'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [showUpload, setShowUpload] = useState(false)
  const [hasData, setHasData] = useState(false)
  const [attributionResults, setAttributionResults] = useState<any>(null)
  const [rawData, setRawData] = useState<any>(null) // Store raw source data
  const [showSupabaseUpload, setShowSupabaseUpload] = useState(false)
  const [autoCloseSupabaseModal, setAutoCloseSupabaseModal] = useState(false)

  // Set up initial data on component mount
  useEffect(() => {
    setupInitialData().catch(console.error)
  }, [])

  // Listen for worker completion and set up auto-close for Supabase modal
  useEffect(() => {
    const handleWorkerComplete = () => {
      console.log('🔄 Dashboard detected worker completion, showSupabaseUpload:', showSupabaseUpload);
      
      // Set auto-close regardless of current modal state
      setAutoCloseSupabaseModal(true);
      
      // Wait a bit for modal to potentially appear, then close it
      setTimeout(() => {
        console.log('🚪 Auto-closing Supabase upload modal');
        setShowSupabaseUpload(false);
        setAutoCloseSupabaseModal(false);
      }, 4000); // Increased to 4 seconds to ensure modal appears first
    };

    window.addEventListener('workerDataUpdated', handleWorkerComplete as EventListener);
    
    return () => {
      window.removeEventListener('workerDataUpdated', handleWorkerComplete as EventListener);
    };
  }, [showSupabaseUpload])

  const handleDataUploadComplete = (results: any) => {
    setHasData(true)
    setShowUpload(false)
    setAttributionResults(results.attributionResults)
    setRawData(results.processedData) // Store raw source data
    console.log('Upload complete:', results)
    console.log('Raw data sources:', Object.keys(results.processedData || {}))
    // Show Supabase upload option
    setShowSupabaseUpload(true)
  }

  const handleSupabaseUploadComplete = (result: any) => {
    console.log('Supabase upload complete:', result)
    setShowSupabaseUpload(false)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab />
      case 'email':
        return <EmailOutreachTab />
      case 'inbound':
        return <InboundAuditsTab />
      case 'instagram':
        return <InstagramOutreachTab />
      case 'unattributed':
        return <UnattributedTab />
      default:
        return <GeneralTab />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Upload Button */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-black">UniteSync Sales Dashboard V3</h1>
              <p className="mt-1 text-sm text-black">
                Worker-Powered Music Publishing Administration KPIs
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowUpload(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Data
              </button>
              {attributionResults && (
                <button
                  onClick={() => setShowSupabaseUpload(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  📤 Upload to Supabase
                </button>
              )}
              {hasData && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-600">✅ Data Loaded</span>
                  <button
                    onClick={() => setHasData(false)}
                    className="text-sm text-black hover:text-black"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upload Data Files</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-black hover:text-black text-xl"
              >
                ✕
              </button>
            </div>
            <SourceBasedUpload onComplete={handleDataUploadComplete} />
          </div>
        </div>
      )}

      {/* Supabase Upload Modal */}
      {showSupabaseUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upload to Supabase</h2>
              <button
                onClick={() => setShowSupabaseUpload(false)}
                className="text-black hover:text-black text-xl"
              >
                ✕
              </button>
            </div>
            
            {/* Auto-close notification */}
            {autoCloseSupabaseModal && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-blue-700 text-sm font-medium">
                    Worker processing complete! Modal will auto-close in a few seconds...
                  </span>
                </div>
              </div>
            )}
            
            <SupabaseUploadManager 
              attributionResults={attributionResults}
              rawData={rawData}
              onUploadComplete={handleSupabaseUploadComplete}
              uploadMode={rawData ? 'comprehensive' : 'attribution_only'}
            />
          </div>
        </div>
      )}
    </div>
  )
}