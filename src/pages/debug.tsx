// src/pages/debug.tsx
// Debug page for testing connections and troubleshooting
import { useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";
import Logo from "../components/Logo";

export default function DebugPage() {
  const auth = useAuth();
  const [connectionStatus, setConnectionStatus] = useState({
    websocket: 'unknown',
    graphql: 'unknown',
    s3: 'unknown'
  });

  // ========================================================================
  // AUTHENTICATION CHECK
  // ========================================================================
  
  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-600">
        <div className="text-center text-white p-8">
          <Logo size="large" variant="white" className="mb-6 mx-auto" />
          <h1 className="text-3xl font-light mb-4">Authentication Error</h1>
          <p className="text-lg opacity-90">Auth context not available</p>
        </div>
      </div>
    );
  }

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white p-8">
          <Logo size="large" variant="white" className="mb-6 mx-auto" />
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-3xl font-light mb-2">Loading...</h1>
          <p className="text-lg opacity-90">Checking authentication status</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600">
        <div className="text-center text-white p-8 max-w-md">
          <Logo size="large" variant="white" className="mb-6 mx-auto" />
          <h1 className="text-3xl font-light mb-4">Authentication Required</h1>
          <p className="text-lg mb-6 opacity-90">
            Please sign in to access the debug page
          </p>
          <button
            onClick={() => auth.signinRedirect()}
            className="px-8 py-3 bg-white/20 text-white border border-white/30 rounded-xl text-lg font-medium transition-all duration-300 hover:bg-white/30 hover:scale-105 active:scale-95"
          >
            🔐 Sign In
          </button>
        </div>
      </div>
    );
  }

  // ========================================================================
  // DEBUG CONTENT
  // ========================================================================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Logo size="medium" variant="default" />
              <h1 className="text-2xl font-semibold text-gray-900">Debug Console</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Logged in as: {auth.user?.profile?.email || 'Unknown'}
              </span>
              <button
                onClick={() => auth.signoutRedirect()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:bg-red-700 hover:scale-105 active:scale-95"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Connection Status */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">🔌 Connection Status</h2>
            
            <ConnectionStatusCard
              title="WebSocket Connection"
              status={connectionStatus.websocket}
              description="Real-time message delivery"
              icon="🔌"
            />
            
            <ConnectionStatusCard
              title="GraphQL API"
              status={connectionStatus.graphql}
              description="Data queries and mutations"
              icon="📡"
            />
            
            <ConnectionStatusCard
              title="S3 Storage"
              status={connectionStatus.s3}
              description="File upload and storage"
              icon="☁️"
            />
          </div>

          {/* User Information */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">👤 User Information</h2>
            
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="space-y-4">
                <InfoRow label="User ID" value={auth.user?.profile?.sub || 'Not available'} />
                <InfoRow label="Username" value={auth.user?.profile?.preferred_username || 'Not available'} />
                <InfoRow label="Email" value={auth.user?.profile?.email || 'Not available'} />
                <InfoRow label="Name" value={auth.user?.profile?.name || 'Not available'} />
                <InfoRow label="Token Expires" value={getTokenExpiry(auth.user?.expires_at)} />
              </div>
            </div>

            {/* Environment Variables */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🌍 Environment</h3>
              <div className="space-y-3">
                <InfoRow 
                  label="AppSync URL" 
                  value={process.env.NEXT_PUBLIC_APPSYNC_URL ? '✅ Set' : '❌ Not set'} 
                />
                <InfoRow 
                  label="S3 Bucket" 
                  value={process.env.NEXT_PUBLIC_S3_BUCKET_NAME ? '✅ Set' : '❌ Not set'} 
                />
                <InfoRow 
                  label="AWS Region" 
                  value={process.env.NEXT_PUBLIC_AWS_REGION ? '✅ Set' : '❌ Not set'} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/chat'}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:scale-105 hover:shadow-xl active:scale-95"
            >
              🚀 Go to Chat
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-4 bg-white text-gray-700 border border-gray-300 rounded-xl text-lg font-semibold transition-all duration-300 hover:bg-gray-50 hover:scale-105 hover:shadow-lg active:scale-95"
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function ConnectionStatusCard({ title, status, description, icon }: {
  title: string;
  status: string;
  description: string;
  icon: string;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'connecting': return 'text-yellow-600 bg-yellow-100';
      case 'disconnected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '✅';
      case 'connecting': return '🔄';
      case 'disconnected': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-3">{description}</p>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
              {getStatusIcon(status)} {status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0 gap-4">
      <span className="text-sm font-medium text-gray-600 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded break-all text-right min-w-0">
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTokenExpiry(expiresAt?: number): string {
  if (!expiresAt) return 'Not available';
  
  const expiryDate = new Date(expiresAt * 1000);
  const now = new Date();
  const timeLeft = expiryDate.getTime() - now.getTime();
  
  if (timeLeft <= 0) return 'Expired';
  
  const minutes = Math.floor(timeLeft / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
  return `${minutes}m remaining`;
}
