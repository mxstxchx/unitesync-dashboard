import { workerDataService } from '@/services/workerDataService'

/**
 * Utility function to ensure worker data is loaded before dashboard components can access it
 * Uses hybrid approach: Supabase first, then localStorage, then file system fallback
 */
export async function ensureWorkerDataLoaded(): Promise<void> {
  // Check if worker data is already available
  if (workerDataService.isReportLoaded()) {
    return
  }

  // Try hybrid sources (Supabase first, then localStorage fallback)
  try {
    await workerDataService.loadFromHybridSources()
    return
  } catch (hybridError) {
    console.log('📁 Hybrid sources failed, trying file system fallback...', hybridError)
  }

  // Final fallback to file system (project persistence) - for development
  try {
    await workerDataService.loadFromFileSystem()
    return
  } catch (fileSystemError) {
    console.log('📁 No saved reports found in file system')
  }

  // No data available anywhere
  throw new Error('No attribution data available. Please run the attribution worker to process your data first.')
}