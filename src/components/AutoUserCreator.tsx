// src/components/AutoUserCreator.tsx
// Component that automatically creates user profiles for new authenticated users
import { useAutoCreateUser } from '../lib/useAutoCreateUser';

/**
 * AutoUserCreator Component
 * 
 * This component automatically creates user profiles when users first authenticate.
 * It uses the useAutoCreateUser hook to handle the profile creation logic.
 * 
 * The component doesn't render anything visible - it's purely functional.
 * It will only run once per user session to ensure profile creation.
 */
export function AutoUserCreator() {
  // This hook will only run after Apollo Client is ready
  const { loading, error, hasAttempted, isAuthenticated, hasUser } = useAutoCreateUser();
  
  // Log component state for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 [AutoUserCreator] Component state:', {
      loading,
      error: error?.message,
      hasAttempted,
      isAuthenticated,
      hasUser
    });
  }
  
  // This component doesn't render anything visible
  return null;
}
