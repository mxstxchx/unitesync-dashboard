'use client';

import React, { useState, useEffect } from 'react';

interface PasswordWallProps {
  children: React.ReactNode;
}

interface User {
  email: string;
  role: string;
}

export default function PasswordWall({ children }: PasswordWallProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authConfigured, setAuthConfigured] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if authentication is configured
        const configResponse = await fetch('/api/auth/login');
        const configData = await configResponse.json();
        
        if (!configData.configured) {
          setAuthConfigured(false);
          setLoading(false);
          return;
        }

        // Check if user is already authenticated
        const verifyResponse = await fetch('/api/auth/verify');
        const verifyData = await verifyResponse.json();
        
        if (verifyData.authenticated && verifyData.user) {
          setIsAuthenticated(true);
          setUser(verifyData.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
        setError('');
      } else {
        setError(data.error || 'Invalid email or password. Please try again.');
        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
      setPassword('');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setEmail('');
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Check if authentication is properly configured
  if (!authConfigured) {
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
              <p>• ADMIN_EMAIL</p>
              <p>• ADMIN_PASSWORD</p>
              <p>• SALES_EMAIL</p>
              <p>• SALES_PASSWORD</p>
              <p>• ANALYST_EMAIL</p>
              <p>• ANALYST_PASSWORD</p>
              <p>• JWT_SECRET</p>
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
            Welcome, {user?.email} ({user?.role})
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