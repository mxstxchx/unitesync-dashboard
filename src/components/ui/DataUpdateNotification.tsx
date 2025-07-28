'use client'

import { useState, useEffect, useCallback } from 'react'

interface DataUpdateNotificationProps {
  onRefresh?: () => void
}

export function DataUpdateNotification({ onRefresh }: DataUpdateNotificationProps) {
  const [showNotification, setShowNotification] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    
    try {
      if (onRefresh) {
        await onRefresh()
      }
      
      // Hide notification after successful refresh
      setTimeout(() => {
        setShowNotification(false)
        setIsRefreshing(false)
      }, 1000)
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      setIsRefreshing(false)
    }
  }, [onRefresh, isRefreshing])

  useEffect(() => {
    const handleWorkerDataUpdated = (event: CustomEvent) => {
      console.log('📢 Data update notification received:', event.detail)
      setShowNotification(true)
      
      // Auto-refresh after a short delay
      setTimeout(() => {
        handleRefresh()
      }, 1500)
    }

    window.addEventListener('workerDataUpdated', handleWorkerDataUpdated as EventListener)

    return () => {
      window.removeEventListener('workerDataUpdated', handleWorkerDataUpdated as EventListener)
    }
  }, [handleRefresh])

  const handleDismiss = () => {
    setShowNotification(false)
  }

  if (!showNotification) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {isRefreshing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
            ) : (
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              {isRefreshing ? 'Refreshing Dashboard...' : 'New Data Available!'}
            </h3>
            <p className="text-sm text-green-700 mt-1">
              {isRefreshing ? 
                'Updating dashboard with latest attribution results.' :
                'Attribution processing complete. Dashboard will refresh automatically.'
              }
            </p>
          </div>
          {!isRefreshing && (
            <div className="ml-auto pl-3">
              <button
                onClick={handleDismiss}
                className="inline-flex text-green-400 hover:text-green-500 focus:outline-none"
                aria-label="Dismiss notification"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Add CSS for animation
const styles = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}