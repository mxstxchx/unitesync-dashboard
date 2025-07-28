import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const reportData = await request.json()
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'attribution_reports')
    try {
      await fs.access(reportsDir)
    } catch {
      await fs.mkdir(reportsDir, { recursive: true })
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `attribution_report_${timestamp}.json`
    const filepath = path.join(reportsDir, filename)
    
    // Save the report
    await fs.writeFile(filepath, JSON.stringify(reportData, null, 2))
    
    // Also save as "latest" for easy loading
    const latestFilepath = path.join(reportsDir, 'attribution_report_latest.json')
    await fs.writeFile(latestFilepath, JSON.stringify(reportData, null, 2))
    
    // Create a simple metadata file
    const metadataFilepath = path.join(reportsDir, 'latest_metadata.json')
    const metadata = {
      filename,
      timestamp: new Date().toISOString(),
      processing_date: reportData.processing_date,
      total_clients: reportData.total_clients,
      attributed_clients: reportData.attributed_clients,
      attribution_rate: reportData.attribution_rate
    }
    await fs.writeFile(metadataFilepath, JSON.stringify(metadata, null, 2))
    
    console.log(`✅ Attribution report saved to: ${filepath}`)
    console.log(`✅ Latest report updated: ${latestFilepath}`)
    
    return NextResponse.json({ 
      success: true, 
      filename,
      filepath: filepath,
      latest_path: latestFilepath,
      metadata
    })
    
  } catch (error) {
    console.error('❌ Failed to save attribution report:', error)
    return NextResponse.json(
      { error: 'Failed to save attribution report', details: error.message },
      { status: 500 }
    )
  }
}