// src/pages/index.tsx
// Main landing page for Pandoo Chat application
import { useAuth } from "react-oidc-context";
import Link from "next/link";
import Logo from "../components/Logo";

// ============================================================================
// MAIN HOME PAGE COMPONENT
// ============================================================================

export default function HomePage() {
  const auth = useAuth();

  // ========================================================================
  // AUTHENTICATION STATE HANDLING
  // ========================================================================
  
  // Auth context not found
  if (!auth) {
    return <AuthContextNotFound />;
  }

  // Authentication loading
  if (auth.isLoading) {
    return <AuthenticationLoading />;
  }

  // Authentication error
  if (auth.error) {
    return <AuthenticationError error={auth.error} onRetry={() => auth.signinRedirect()} />;
  }

  // User not authenticated
  if (!auth.isAuthenticated) {
    return <SignInPrompt onSignIn={() => auth.signinRedirect()} />;
  }

  // User authenticated - show dashboard
  return <AuthenticatedDashboard auth={auth} />;
}

// ============================================================================
// AUTHENTICATION STATE COMPONENTS
// ============================================================================

/**
 * Component shown when authentication context is not available
 */
function AuthContextNotFound() {
  return (
    <PageLayout>
      <div className="text-center text-white p-10 max-w-md mx-auto">
        <Logo size="large" variant="white" className="mb-8 mx-auto" />
        <h1 className="text-4xl font-light mb-6">
          Pandoo Chat
        </h1>
        <p className="text-xl mb-8 opacity-90 leading-relaxed">
          Real-time messaging powered by AWS AppSync
        </p>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <p className="text-lg mb-4 flex items-center justify-center gap-2">
            🔧 Auth context not found
          </p>
          <p className="text-sm opacity-80 leading-relaxed">
            Please check your authentication configuration
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

/**
 * Component shown during authentication loading
 */
function AuthenticationLoading() {
  return (
    <PageLayout>
      <div className="text-center text-white p-10 max-w-md mx-auto">
        <Logo size="large" variant="white" className="mb-8 mx-auto" />
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-normal mb-2">
            🔐 Signing you in...
          </h2>
          <p className="opacity-80 leading-relaxed">
            Please wait while we authenticate your account
          </p>
        </div>
        
        {/* Loading animation dots */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </PageLayout>
  );
}

/**
 * Component shown when authentication fails
 */
function AuthenticationError({ error, onRetry }: { error: any; onRetry: () => void }) {
  return (
    <PageLayout>
      <div className="text-center text-white p-10 max-w-md mx-auto">
        <Logo size="large" variant="white" className="mb-8 mx-auto" />
        <h1 className="text-4xl font-light mb-6">
          Pandoo Chat
        </h1>
        <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30 mb-8">
          <h2 className="text-2xl text-red-300 mb-4 flex items-center justify-center gap-2">
            ❌ Authentication Error
          </h2>
          <p className="text-base opacity-90 leading-relaxed">
            {error.message}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="group relative px-8 py-4 bg-white/20 text-white border border-white/30 rounded-xl text-lg cursor-pointer backdrop-blur-lg transition-all duration-300 hover:bg-white/30 hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <span className="relative z-10">🔄 Try Again</span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </div>
    </PageLayout>
  );
}

/**
 * Component shown when user needs to sign in
 */
function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
  return (
    <PageLayout>
      <div className="text-center text-white p-10 max-w-2xl mx-auto">
        <Logo size="xl" variant="white" className="mb-8 mx-auto" />
        <h1 className="text-5xl font-light mb-6">
          Pandoo Chat
        </h1>
        <p className="text-xl mb-10 opacity-90 leading-relaxed max-w-lg mx-auto">
          Connect with friends and colleagues through real-time messaging. 
          Powered by AWS AppSync for lightning-fast communication.
        </p>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-10 border border-white/20 mb-10">
          <h2 className="text-3xl font-normal mb-6">
            🚀 Get Started
          </h2>
          <p className="text-lg mb-8 opacity-90 leading-relaxed">
            Sign in with your AWS Cognito account to start chatting. 
            Your conversations are secure and private.
          </p>
          <button
            onClick={onSignIn}
            className="group relative w-full px-8 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl text-xl font-semibold transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:scale-105 hover:shadow-2xl active:scale-95"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              🔐 Sign In with Cognito
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>

        <FeatureGrid />
      </div>
    </PageLayout>
  );
}

/**
 * Component shown when user is authenticated
 */
function AuthenticatedDashboard({ auth }: { auth: any }) {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto text-center text-white p-10">
        <Logo size="xl" variant="white" className="mb-8 mx-auto" />
        <h1 className="text-5xl font-light mb-6">
          🎉 Welcome to Pandoo Chat!
        </h1>
        <p className="text-xl mb-10 opacity-90 leading-relaxed">
          You're successfully signed in and ready to start chatting
        </p>

        <UserAccountInfo auth={auth} />
        <ActionButtons />
        <SignOutButtons auth={auth} />
      </div>
    </PageLayout>
  );
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

/**
 * Main page layout wrapper
 */
function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Feature grid for the sign-in page
 */
function FeatureGrid() {
  const features = [
    { 
      icon: '🔒', 
      title: 'Secure', 
      description: 'End-to-end encryption',
      color: 'from-green-500 to-emerald-600'
    },
    { 
      icon: '⚡', 
      title: 'Fast', 
      description: 'Real-time updates',
      color: 'from-yellow-500 to-orange-600'
    },
    { 
      icon: '☁️', 
      title: 'Cloud', 
      description: 'AWS powered',
      color: 'from-blue-500 to-cyan-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {features.map((feature, index) => (
        <div 
          key={index} 
          className="group bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:shadow-xl"
        >
          <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-3xl mb-4 mx-auto group-hover:scale-110 transition-transform duration-300`}>
            {feature.icon}
          </div>
          <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
          <p className="text-sm opacity-80 leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * User account information display
 */
function UserAccountInfo({ auth }: { auth: any }) {
  const getUserDisplayName = () => {
    return auth.user?.profile?.preferred_username || 
           auth.user?.profile?.name || 
           auth.user?.profile?.email?.split('@')[0] || 
           'User';
  };

  const getUserEmail = () => {
    return auth.user?.profile?.email || 'Not provided';
  };

  const getUserId = () => {
    return auth.user?.profile?.sub?.substring(0, 12) + '...';
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-10 border border-white/20 mb-10">
      <h2 className="text-3xl font-normal mb-8 flex items-center justify-center gap-3">
        👤 Your Account
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <InfoCard label="Username" value={getUserDisplayName()} />
        <InfoCard label="Email" value={getUserEmail()} />
        <InfoCard label="User ID" value={getUserId()} isMonospace />
      </div>
    </div>
  );
}

/**
 * Information card component
 */
function InfoCard({ label, value, isMonospace = false }: { 
  label: string; 
  value: string; 
  isMonospace?: boolean;
}) {
  return (
    <div className="group bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:scale-105">
      <div className="text-sm opacity-70 mb-2 font-medium">{label}</div>
      <div className={`font-semibold ${isMonospace ? 'text-sm font-mono' : 'text-lg'} opacity-90 break-words overflow-hidden`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Main action buttons for authenticated users
 */
function ActionButtons() {
  return (
    <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
      <Link href="/chat" className="no-underline">
        <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl text-lg font-semibold transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:scale-105 hover:shadow-xl active:scale-95">
          <span className="relative z-10 flex items-center gap-3">
            🚀 Go to Chat
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </Link>
      
      <Link href="/debug" className="no-underline">
        <button className="group relative px-8 py-4 bg-white/20 text-white border border-white/30 rounded-2xl text-lg font-semibold transition-all duration-300 hover:bg-white/30 hover:scale-105 hover:shadow-xl active:scale-95">
          <span className="relative z-10 flex items-center gap-3">
            🔧 Debug Connection
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </Link>
    </div>
  );
}

/**
 * Sign out buttons
 */
function SignOutButtons({ auth }: { auth: any }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        onClick={() => auth.removeUser()}
        className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95"
      >
        🚪 Sign out (local)
      </button>
      
      <button
        onClick={() => auth.signoutRedirect()}
        className="px-6 py-3 bg-red-500/20 text-red-200 border border-red-500/30 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-red-500/30 hover:scale-105 active:scale-95"
      >
        🚪 Sign out (Cognito)
      </button>
    </div>
  );
}
