// Salesforge API Integration (Client-side)
// Uses server-side API routes to securely fetch data

export class SalesforgeAPI {
  private async makeRequest(endpoint: string) {
    const response = await fetch(`/api/salesforge/${endpoint}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  async fetchContacts(onProgress?: (progress: number) => void) {
    onProgress?.(0);
    const response = await this.makeRequest('contacts');
    onProgress?.(100);
    return response.data || [];
  }

  async fetchThreads(onProgress?: (progress: number) => void) {
    onProgress?.(0);
    const response = await this.makeRequest('threads');
    onProgress?.(100);
    return response.data || [];
  }

  async fetchSequences(onProgress?: (progress: number) => void) {
    onProgress?.(0);
    const response = await this.makeRequest('sequences');
    onProgress?.(100);
    return response.data || [];
  }

  async fetchMailboxes(onProgress?: (progress: number) => void) {
    onProgress?.(0);
    const response = await this.makeRequest('mailboxes');
    onProgress?.(100);
    return response.data || [];
  }

  async fetchCustomVars(onProgress?: (progress: number) => void) {
    onProgress?.(0);
    const response = await this.makeRequest('custom-vars');
    onProgress?.(100);
    return response.data || [];
  }

  async fetchLabels(onProgress?: (progress: number) => void) {
    onProgress?.(0);
    // Labels might need to be fetched from network console
    // This is a placeholder for now
    onProgress?.(100);
    return [];
  }

  async fetchBatchThreadDetails(threads: { threadId: string; mailboxId: string }[], onProgress?: (progress: number) => void) {
    onProgress?.(0);
    
    const response = await fetch('/api/salesforge/threads/batch-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        threads: threads,
        maxConcurrent: 8 // Controlled concurrency
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Batch thread details error: ${response.status}`);
    }
    
    const result = await response.json();
    onProgress?.(100);
    
    return result;
  }

  isConfigured(): boolean {
    // Always return true since configuration is handled server-side
    return true;
  }

  getConfigurationStatus() {
    return {
      hasApiKey: true,
      hasWorkspaceId: true,
      isConfigured: true
    };
  }
}