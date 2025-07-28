import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.SALESFORGE_API_KEY;
  const workspaceId = process.env.SALESFORGE_WORKSPACE_ID;

  if (!apiKey || !workspaceId) {
    return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.salesforge.ai/public/v2/workspaces/${workspaceId}/sequences`,
      {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Salesforge API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sequences' },
      { status: 500 }
    );
  }
}