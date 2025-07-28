import { NextResponse } from 'next/server';
import https from 'https';

// Configure longer timeout for sequential processing
export const maxDuration = 300; // 5 minutes for Vercel Pro
export const dynamic = 'force-dynamic'; // Disable caching for dynamic API responses

interface ThreadRequest {
  threadId: string;
  mailboxId: string;
}

interface BatchThreadDetailsRequest {
  threads: ThreadRequest[];
  maxConcurrent?: number;
}

// Native HTTPS request function (matching standalone script)
function makeAPIRequest(url: string, headers: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (parseError) {
            reject(new Error(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Sleep function for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const apiKey = process.env.SALESFORGE_API_KEY;
  const workspaceId = process.env.SALESFORGE_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
  }

  try {
    const { threads, maxConcurrent = 3 }: BatchThreadDetailsRequest = await request.json();

    if (!threads || !Array.isArray(threads) || threads.length === 0) {
      return NextResponse.json({ error: 'Invalid threads array' }, { status: 400 });
    }

    console.log(`🔄 Fetching ${threads.length} detailed threads with max ${maxConcurrent} concurrent (enhanced reliability)`);

    const results: any[] = [];
    const errors: { threadId: string; error: string; attempt: number }[] = [];
    let totalAttempts = 0;

    // Special handling for sequential processing (maxConcurrent = 1)
    if (maxConcurrent === 1) {
      console.log(`📦 Using SEQUENTIAL processing with HTTPS module (200ms delays)`);
      console.log(`⏱️ Estimated time: ${((threads.length * 1.2) / 60).toFixed(1)} minutes (1.2s avg per request including delays)`);
      
      const startTime = Date.now();
      
      for (let i = 0; i < threads.length; i++) {
        const { threadId, mailboxId } = threads[i];
        const attemptNumber = ++totalAttempts;
        const progress = ((i + 1) / threads.length * 100).toFixed(1);
        
        // Progress logging every 10 requests
        if (i % 10 === 0 || i === threads.length - 1) {
          const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
          const eta = i > 0 ? (((Date.now() - startTime) / (i + 1)) * (threads.length - i - 1) / 1000 / 60).toFixed(1) : 'calculating...';
          console.log(`🔄 [${i + 1}/${threads.length}] (${progress}%) | Elapsed: ${elapsed}m | ETA: ${eta}m | Success rate: ${((results.length / (i + 1)) * 100).toFixed(1)}%`);
        }
        
        try {
          console.log(`📧 Fetching thread ${threadId} (${i + 1}/${threads.length})`);
          
          const url = `https://api.salesforge.ai/public/v2/workspaces/${workspaceId}/mailboxes/${mailboxId}/threads/${threadId}`;
          const headers = {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
          };
          
          const data = await makeAPIRequest(url, headers);
          console.log(`✅ Thread ${threadId}: Success (${data.emails?.length || 0} emails)`);
          results.push({
            ...data,
            threadId: threadId,
            fetchAttempt: attemptNumber
          });
          
          // 200ms delay after successful request (matching working standalone script)
          if (i < threads.length - 1) { // Don't delay after the last request
            await sleep(200);
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Thread ${threadId}: Failed - ${errorMessage}`);
          errors.push({ 
            threadId, 
            error: errorMessage,
            attempt: attemptNumber
          });
          
          // 500ms delay after errors (slightly longer than success)
          if (i < threads.length - 1) {
            await sleep(500);
          }
        }
      }
    } else {
      // Batch processing for parallel requests (maxConcurrent > 1)
      for (let i = 0; i < threads.length; i += maxConcurrent) {
        const batch = threads.slice(i, i + maxConcurrent);
        const batchNumber = Math.floor(i / maxConcurrent) + 1;
        const totalBatches = Math.ceil(threads.length / maxConcurrent);
        
        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} threads)`);

        const batchPromises = batch.map(async ({ threadId, mailboxId }, batchIndex) => {
        const attemptNumber = ++totalAttempts;
        
        try {
          const url = `https://api.salesforge.ai/public/v2/workspaces/${workspaceId}/mailboxes/${mailboxId}/threads/${threadId}`;
          const headers = {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
          };
          
          const data = await makeAPIRequest(url, headers);
          console.log(`✅ Thread ${threadId}: Success (${data.emails?.length || 0} emails)`);
          return { threadId, success: true, data, attempt: attemptNumber };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Thread ${threadId}: Final failure - ${errorMessage}`);
          return { threadId, success: false, error: errorMessage, attempt: attemptNumber };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const { threadId } = batch[index];
        
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push({
              ...result.value.data,
              threadId: threadId,
              fetchAttempt: result.value.attempt
            });
          } else {
            errors.push({ 
              threadId, 
              error: result.value.error,
              attempt: result.value.attempt
            });
          }
        } else {
          errors.push({ 
            threadId, 
            error: result.reason?.message || 'Promise rejected',
            attempt: totalAttempts
          });
        }
      });

      // Add longer delay between batches for API stability
      if (i + maxConcurrent < threads.length) {
        const delayMs = 500; // 500ms delay between batches
        console.log(`⏳ Waiting ${delayMs}ms between batches...`);
        await sleep(delayMs);
      }
    }
    } // Close the else block for batch processing

    const successRate = ((results.length / threads.length) * 100).toFixed(1);
    
    const response = {
      success: true,
      total: threads.length,
      fetched: results.length,
      failed: errors.length,
      success_rate: `${successRate}%`,
      total_attempts: totalAttempts,
      results,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`✅ Enhanced batch fetch complete: ${results.length}/${threads.length} threads fetched (${successRate}% success rate)`);
    console.log(`📊 Total API attempts: ${totalAttempts}`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ Failed threads: ${errors.length}`);
      const errorSummary = errors.reduce((acc, error) => {
        acc[error.error] = (acc[error.error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.warn(`📊 Error breakdown:`, errorSummary);
    }
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Enhanced batch thread fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}