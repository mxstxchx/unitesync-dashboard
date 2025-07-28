import React, { useState, useEffect } from 'react';

interface PasswordWallProps {
  children: React.ReactNode;
}

// Get user credentials from environment variables
const getValidCredentials = () => {
  const credentials: Record<string, string> = {};
  
  // Only add users if both email and password are configured
  if (process.env.NEXT_PUBLIC_ADMIN_EMAIL && process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    credentials[`${process.env.NEXT_PUBLIC_ADMIN_EMAIL}:${process.env.NEXT_PUBLIC_ADMIN_PASSWORD}`] = 'Admin User';
  }
  
  if (process.env.NEXT_PUBLIC_SALES_EMAIL && process.env.NEXT_PUBLIC_SALES_PASSWORD) {
    credentials[`${process.env.NEXT_PUBLIC_SALES_EMAIL}:${process.env.NEXT_PUBLIC_SALES_PASSWORD}`] = 'Sales User';
  }
  
  if (process.env.NEXT_PUBLIC_ANALYST_EMAIL && process.env.NEXT_PUBLIC_ANALYST_PASSWORD) {
    credentials[`${process.env.NEXT_PUBLIC_ANALYST_EMAIL}:${process.env.NEXT_PUBLIC_ANALYST_PASSWORD}`] = 'Analyst User';
  }
  
  return credentials;
};

// Check if authentication is properly configured
const isAuthConfigured = () => {
  const credentials = getValidCredentials();
  return Object.keys(credentials).length > 0;
};

export default function PasswordWall({ children }: PasswordWallProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = sessionStorage.getItem('unitesync_auth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validCredentials = getValidCredentials();
    const credentialKey = `${email.trim()}:${password}`;
    
    if (validCredentials[credentialKey]) {
      setIsAuthenticated(true);
      sessionStorage.setItem('unitesync_auth', 'authenticated');
      sessionStorage.setItem('unitesync_user', validCredentials[credentialKey]);
      sessionStorage.setItem('unitesync_email', email.trim());
      setError('');
    } else {
      setError('Invalid email or password. Please try again.');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('unitesync_auth');
    sessionStorage.removeItem('unitesync_user');
    sessionStorage.removeItem('unitesync_email');
    setEmail('');
    setPassword('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Check if authentication is properly configured
  if (!isAuthConfigured()) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-red-900 mb-2">
              Authentication Not Configured
            </h2>
            <p className="text-red-700 mb-8">
              Please configure user credentials in your environment variables.
            </p>
          </div>
          
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Required Environment Variables:</h3>
            <div className="text-sm text-red-700 space-y-1">
              <p>• NEXT_PUBLIC_ADMIN_EMAIL</p>
              <p>• NEXT_PUBLIC_ADMIN_PASSWORD</p>
              <p>• NEXT_PUBLIC_SALES_EMAIL</p>
              <p>• NEXT_PUBLIC_SALES_PASSWORD</p>
              <p>• NEXT_PUBLIC_ANALYST_EMAIL</p>
              <p>• NEXT_PUBLIC_ANALYST_PASSWORD</p>
            </div>
          </div>
          
          <div className="text-center text-xs text-red-600">
            <p>At least one user must be configured to access the dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              UniteSync Sales Dashboard
            </h2>
            <p className="text-gray-600 mb-8">
              Please enter your password to access the dashboard
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                autoFocus
              />
            </div>
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Access Dashboard
            </button>
          </form>
          
          <div className="text-center text-xs text-gray-500 mt-8">
            <p>Authorized personnel only</p>
            <p className="mt-1">This application contains confidential business data</p>
          </div>
        </div>
      </div>
    );
  }

  // Show authenticated content with logout option
  return (
    <div>
      {/* Header with logout */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Welcome, {sessionStorage.getItem('unitesync_email')} ({sessionStorage.getItem('unitesync_user')})
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Main content */}
      {children}
    </div>
  );
}