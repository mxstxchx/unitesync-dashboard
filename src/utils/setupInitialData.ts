import { workerDataService } from '@/services/workerDataService'

/**
 * One-time setup to save your existing attribution report to the project file system
 * This ensures the dashboard always has data available when the project loads
 */
export async function setupInitialData(): Promise<void> {
  // Check if we already have data available
  try {
    await workerDataService.loadFromFileSystem()
    console.log('✅ Existing attribution data found in file system')
    return
  } catch (error) {
    console.log('📁 No existing file system data, checking for setup data...')
  }

  // Try to set up initial data from local report file
  try {
    console.log('🔄 Setting up initial attribution data from local report...')
    
    // Call the setup API to initialize reports from data directory
    const response = await fetch('/api/setup-initial-data', { 
      method: 'POST' 
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log(`✅ ${result.message}`)
      
      // If initial data was created, load it
      if (result.action === 'created') {
        await workerDataService.loadFromFileSystem()
        console.log('✅ Initial attribution data loaded into dashboard')
      }
    } else {
      const error = await response.json()
      console.log(`ℹ️ Setup API response: ${error.details}`)
    }
    
  } catch (error) {
    console.log('ℹ️ Could not set up initial data - dashboard will require worker run first')
    console.log('   Run the attribution worker to generate your first report')
  }
}

/**
 * Clear attribution data (useful for testing)
 */
export function clearAttributionData(): void {
  localStorage.removeItem('attribution_report')
  localStorage.removeItem('attribution_report_timestamp')
  console.log('🧹 Attribution data cleared from localStorage')
}