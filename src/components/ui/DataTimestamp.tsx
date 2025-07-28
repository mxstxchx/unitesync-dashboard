'use client'

import { useState, useEffect, useCallback } from 'react'
import { workerDataService } from '@/services/workerDataService'
import { reportStorageService } from '@/services/reportStorageService'

interface DataTimestampProps {
  className?: string
}

export function DataTimestamp({ className = '' }: DataTimestampProps) {
  const [timestamp, setTimestamp] = useState<string | null>(null)
  const [timeAgo, setTimeAgo] = useState<string>('')
  const [storageInfo, setStorageInfo] = useState<{ provider: string; isProduction: boolean } | null>(null)

  const updateTimeAgo = useCallback(() => {
    if (!timestamp) return
    
    const now = new Date()
    const dataTime = new Date(timestamp)
    const diffMs = now.getTime() - dataTime.getTime()
    
    if (diffMs < 60000) { // Less than 1 minute
      setTimeAgo('just now')
    } else if (diffMs < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diffMs / 60000)
      setTimeAgo(`${minutes} minute${minutes === 1 ? '' : 's'} ago`)
    } else if (diffMs < 86400000) { // Less than 24 hours
      const hours = Math.floor(diffMs / 3600000)
      setTimeAgo(`${hours} hour${hours === 1 ? '' : 's'} ago`)
    } else {
      const days = Math.floor(diffMs / 86400000)
      setTimeAgo(`${days} day${days === 1 ? '' : 's'} ago`)
    }
  }, [timestamp])

  const updateTimestamp = useCallback(() => {
    const processingDate = workerDataService.getProcessingDate()
    const dataTimestamp = workerDataService.getDataTimestamp()
    
    // Use the more recent of processing date or save timestamp
    const latestTimestamp = dataTimestamp || processingDate
    setTimestamp(latestTimestamp)
    
    // Get current storage information
    try {
      const info = reportStorageService.getStorageInfo()
      setStorageInfo(info)
    } catch (error) {
      setStorageInfo(null)
    }
    
    updateTimeAgo()
  }, [updateTimeAgo])

  useEffect(() => {
    updateTimestamp()
    
    // Update time ago every minute
    const interval = setInterval(updateTimeAgo, 60000)
    
    // Listen for data updates
    const handleWorkerDataUpdated = () => {
      setTimeout(updateTimestamp, 100) // Small delay to ensure localStorage is updated
    }
    
    window.addEventListener('workerDataUpdated', handleWorkerDataUpdated as EventListener)

    return () => {
      clearInterval(interval)
      window.removeEventListener('workerDataUpdated', handleWorkerDataUpdated as EventListener)
    }
  }, [updateTimestamp, updateTimeAgo])

  if (!timestamp) {
    return (
      <div className={`text-xs text-black ${className}`}>
        No data processed yet
      </div>
    )
  }

  return (
    <div className={`text-xs text-black flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span>Data processed {timeAgo}</span>
      </div>
      <span className="text-black">•</span>
      <span className="text-black">
        {new Date(timestamp).toLocaleString()}
      </span>
      {storageInfo && (
        <>
          <span className="text-black">•</span>
          <span className={`text-xs px-2 py-1 rounded ${
            storageInfo.isProduction 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {storageInfo.provider} {storageInfo.isProduction ? '(Prod)' : '(Dev)'}
          </span>
        </>
      )}
    </div>
  )
}