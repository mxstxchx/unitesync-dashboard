'use client'

import { useState } from 'react'
import { workerDataService } from '@/services/workerDataService'

export function DownloadReportButton() {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = () => {
    if (isDownloading) return
    
    try {
      setIsDownloading(true)
      
      const report = workerDataService.getRawReport()
      if (!report) {
        alert('No attribution report available. Please run the attribution worker first.')
        return
      }

      // Create download link
      const dataStr = JSON.stringify(report, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `attribution_report_${timestamp}.json`
      
      // Create and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      
      // Cleanup
      URL.revokeObjectURL(url)
      
      console.log(`✅ Attribution report downloaded: ${filename}`)
      
    } catch (error) {
      console.error('❌ Download failed:', error)
      alert('Failed to download attribution report. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Download current attribution report as JSON"
    >
      {isDownloading ? (
        <>
          <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
          Downloading...
        </>
      ) : (
        <>
          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Report
        </>
      )}
    </button>
  )
}