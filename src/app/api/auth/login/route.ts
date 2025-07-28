import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

// Server-side user credentials (secure - not exposed to client)
const getValidCredentials = () => {
  const credentials: Record<string, string> = {};
  
  // Only add users if both email and password are configured
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    credentials[`${process.env.ADMIN_EMAIL}:${process.env.ADMIN_PASSWORD}`] = 'Admin User';
  }
  
  if (process.env.SALES_EMAIL && process.env.SALES_PASSWORD) {
    credentials[`${process.env.SALES_EMAIL}:${process.env.SALES_PASSWORD}`] = 'Sales User';
  }
  
  if (process.env.ANALYST_EMAIL && process.env.ANALYST_PASSWORD) {
    credentials[`${process.env.ANALYST_EMAIL}:${process.env.ANALYST_PASSWORD}`] = 'Analyst User';
  }
  
  return credentials;
};

// Check if authentication is properly configured
const isAuthConfigured = () => {
  const credentials = getValidCredentials();
  return Object.keys(credentials).length > 0;
};

// JWT secret from environment
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
};

export async function POST(request: NextRequest) {
  try {
    // Check if authentication is configured
    if (!isAuthConfigured()) {
      return NextResponse.json(
        { 
          error: 'Authentication not configured',
          message: 'Please configure user credentials in environment variables'
        },
        { status: 500 }
      );
    }

    // Parse request body
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check credentials
    const validCredentials = getValidCredentials();
    const credentialKey = `${email.trim()}:${password}`;
    const userRole = validCredentials[credentialKey];

    if (!userRole) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({ 
      email: email.trim(), 
      role: userRole,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(getJWTSecret());

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return NextResponse.json({
      success: true,
      user: {
        email: email.trim(),
        role: userRole
      }
    });

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      configured: isAuthConfigured(),
      message: isAuthConfigured() 
        ? 'Authentication is configured' 
        : 'Authentication not configured - please set environment variables'
    }
  );
}