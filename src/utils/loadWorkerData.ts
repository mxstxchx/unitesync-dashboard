import { workerDataService } from '@/services/workerDataService'

/**
 * Utility function to ensure worker data is loaded before dashboard components can access it
 */
export async function ensureWorkerDataLoaded(): Promise<void> {
  // Check if worker data is already available
  if (workerDataService.isReportLoaded()) {
    return
  }

  // Try localStorage first (fastest)
  try {
    await workerDataService.loadFromLocalStorage()
    return
  } catch (localStorageError) {
    console.log('📁 No data in localStorage, checking file system...')
  }

  // Fall back to file system (project persistence)
  try {
    await workerDataService.loadFromFileSystem()
    return
  } catch (fileSystemError) {
    console.log('📁 No saved reports found in file system')
  }

  // No data available anywhere
  throw new Error('No attribution data available. Please run the attribution worker to process your data first.')
}