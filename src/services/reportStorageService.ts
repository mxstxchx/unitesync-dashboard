'use client'

import { AttributionReport } from './workerDataService'

export interface StorageProvider {
  save(reportData: AttributionReport): Promise<void>
  load(): Promise<AttributionReport>
  isAvailable(): boolean
}

/**
 * Local file system storage (development only)
 */
class FileSystemStorage implements StorageProvider {
  async save(reportData: AttributionReport): Promise<void> {
    console.log('🔍 FileSystemStorage saving data structure:', {
      hasAttributedClientsData: !!reportData.attributed_clients_data,
      attributedClientsCount: reportData.attributed_clients_data?.length || 0,
      totalClients: reportData.total_clients,
      attributedClients: reportData.attributed_clients
    });
    
    const response = await fetch('/api/save-attribution-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to save report: ${response.statusText}`)
    }
    
    console.log('✅ Report saved to file system')
  }

  async load(): Promise<AttributionReport> {
    const response = await fetch('/api/load-latest-report')
    
    if (!response.ok) {
      throw new Error(`Failed to load report: ${response.statusText}`)
    }
    
    const apiResponse = await response.json()
    console.log('🔍 API Response structure:', {
      hasReport: !!apiResponse.report,
      topLevelKeys: Object.keys(apiResponse)
    });
    
    // Extract the actual report data from the API response
    const reportData = apiResponse.report || apiResponse
    
    console.log('🔍 FileSystemStorage loaded data structure:', {
      hasAttributedClientsData: !!reportData.attributed_clients_data,
      attributedClientsCount: reportData.attributed_clients_data?.length || 0,
      totalClients: reportData.total_clients,
      attributedClients: reportData.attributed_clients,
      dataKeys: Object.keys(reportData)
    });
    console.log('✅ Report loaded from file system')
    return reportData
  }

  isAvailable(): boolean {
    // File system is available in development (not in production/Vercel)
    return typeof window !== 'undefined' && (
      (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
      (typeof process === 'undefined') // Client-side fallback
    ) && !globalThis.VERCEL
  }
}

/**
 * IndexedDB storage (browser-based, works in production)
 */
class IndexedDBStorage implements StorageProvider {
  private dbName = 'unitesync-attribution-db'
  private storeName = 'reports'
  private version = 1

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' })
        }
      }
    })
  }

  async save(reportData: AttributionReport): Promise<void> {
    const db = await this.getDB()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)
    
    const reportWithId = {
      id: 'latest',
      timestamp: Date.now(),
      data: reportData
    }
    
    return new Promise((resolve, reject) => {
      const request = store.put(reportWithId)
      request.onsuccess = () => {
        console.log('✅ Report saved to IndexedDB')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async load(): Promise<AttributionReport> {
    const db = await this.getDB()
    const transaction = db.transaction([this.storeName], 'readonly')
    const store = transaction.objectStore(this.storeName)
    
    return new Promise((resolve, reject) => {
      const request = store.get('latest')
      request.onsuccess = () => {
        if (request.result?.data) {
          console.log('✅ Report loaded from IndexedDB')
          resolve(request.result.data)
        } else {
          reject(new Error('No report found in IndexedDB'))
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window
  }
}

/**
 * LocalStorage fallback (basic compatibility)
 */
class LocalStorageStorage implements StorageProvider {
  private key = 'attribution_report'

  async save(reportData: AttributionReport): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('LocalStorage not available')
    }
    
    localStorage.setItem(this.key, JSON.stringify(reportData))
    localStorage.setItem(`${this.key}_timestamp`, Date.now().toString())
    console.log('✅ Report saved to localStorage')
  }

  async load(): Promise<AttributionReport> {
    if (!this.isAvailable()) {
      throw new Error('LocalStorage not available')
    }
    
    const data = localStorage.getItem(this.key)
    if (!data) {
      throw new Error('No report found in localStorage')
    }
    
    console.log('✅ Report loaded from localStorage')
    return JSON.parse(data)
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'localStorage' in window
  }
}

/**
 * Smart storage service that picks the best available storage method
 */
export class ReportStorageService {
  private providers: StorageProvider[]

  constructor() {
    this.providers = [
      new FileSystemStorage(),     // Preferred for development
      new IndexedDBStorage(),      // Preferred for production
      new LocalStorageStorage()    // Fallback
    ]
  }

  private getAvailableProvider(): StorageProvider {
    const provider = this.providers.find(p => p.isAvailable())
    if (!provider) {
      throw new Error('No storage provider available')
    }
    return provider
  }

  async save(reportData: AttributionReport): Promise<void> {
    const provider = this.getAvailableProvider()
    console.log(`💾 Saving report using ${provider.constructor.name}`)
    await provider.save(reportData)
  }

  async load(): Promise<AttributionReport> {
    // Try each provider in order until one succeeds
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue
      
      try {
        console.log(`📂 Attempting to load report using ${provider.constructor.name}`)
        const report = await provider.load()
        return report
      } catch (error) {
        console.log(`⚠️ ${provider.constructor.name} failed:`, error.message)
        continue
      }
    }
    
    throw new Error('No attribution report found in any storage provider')
  }

  getStorageInfo(): { provider: string; isProduction: boolean } {
    const provider = this.getAvailableProvider()
    return {
      provider: provider.constructor.name,
      isProduction: (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') || 
                    !!globalThis.VERCEL ||
                    typeof process === 'undefined' // Assume production if process is undefined
    }
  }
}

// Export singleton instance
export const reportStorageService = new ReportStorageService()