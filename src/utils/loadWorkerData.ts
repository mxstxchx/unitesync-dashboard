import { workerDataService } from '@/services/workerDataService'

/**
 * Utility function to ensure worker data is loaded before dashboard components can access it
 * PRODUCTION PRIORITY: Supabase first for team collaboration
 */
export async function ensureWorkerDataLoaded(): Promise<void> {
  // Check if worker data is already available
  if (workerDataService.isReportLoaded()) {
    return
  }

  // FIRST: Try Supabase (production team data)
  try {
    console.log('🔄 Attempting to load from Supabase first...');
    await workerDataService.loadFromSupabase()
    console.log('✅ Successfully loaded from Supabase');
    return
  } catch (supabaseError) {
    console.log('📁 Supabase load failed, trying local storage...', supabaseError)
  }

  // SECOND: Try localStorage (local cache)
  try {
    await workerDataService.loadFromLocalStorage()
    return
  } catch (localStorageError) {
    console.log('📁 No data in localStorage, checking file system...')
  }

  // THIRD: Fall back to file system (development)
  try {
    await workerDataService.loadFromFileSystem()
    return
  } catch (fileSystemError) {
    console.log('📁 No saved reports found in file system')
  }

  // No data available anywhere
  throw new Error('No attribution data available. Please run the attribution worker to process your data first.')
}