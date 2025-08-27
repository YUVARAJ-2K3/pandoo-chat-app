// src/lib/useAutoCreateUser.ts
// Hook to automatically create user profiles when users first authenticate
import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { useMutation } from '@apollo/client';
import { CREATE_USER_PROFILE } from '../graphql/operations';

// ============================================================================
// USER PROFILE CREATION HOOK
// ============================================================================

/**
 * Hook that automatically creates a user profile when a user first authenticates.
 * This ensures that all authenticated users have a profile in the system.
 * 
 * @returns Object containing loading state and any errors
 */
export function useAutoCreateUser() {
  const auth = useAuth();
  const hasAttemptedCreation = useRef(false);
  
  // ========================================================================
  // GRAPHQL MUTATION
  // ========================================================================
  
  const [createUserProfile, { loading, error }] = useMutation(CREATE_USER_PROFILE, {
    onCompleted: (data) => {
      console.log('✅ [AUTO_USER] User profile created successfully:', data.createUserProfile);
    },
    onError: (error) => {
      console.error('❌ [AUTO_USER] Failed to create user profile:', error);
    }
  });

  // ========================================================================
  // EFFECT: AUTO-CREATE USER PROFILE
  // ========================================================================
  
  useEffect(() => {
    // Only run once when user is authenticated and we haven't attempted creation yet
    if (auth.isAuthenticated && auth.user && !hasAttemptedCreation.current) {
      console.log('🔄 [AUTO_USER] Starting automatic user profile creation...');
      hasAttemptedCreation.current = true;
      
      const createProfile = async () => {
        try {
          if (!auth.user) {
            console.log('⚠️ [AUTO_USER] No user object available');
            return;
          }
          
          const userProfile = auth.user.profile;
          
          // Validate that we have the required user ID
          if (!userProfile?.sub) {
            console.log('⚠️ [AUTO_USER] No user sub found, skipping profile creation');
            return;
          }

          // Extract user information from Cognito profile
          const userInput = {
            id: userProfile.sub,
            username: userProfile.preferred_username || 
                     userProfile.email?.split('@')[0] || 
                     userProfile.sub,
            email: userProfile.email || '',
            name: userProfile.name || 
                  userProfile.preferred_username || 
                  'User',
            avatar: '👤', // Default avatar emoji
            status: 'online'
          };

          console.log('🔄 [AUTO_USER] Creating user profile with data:', userInput);
          
          // Execute the GraphQL mutation
          await createUserProfile({
            variables: {
              input: userInput
            }
          });
          
          console.log('✅ [AUTO_USER] User profile creation completed successfully');
          
        } catch (error) {
          console.error('❌ [AUTO_USER] Error in auto-create user profile:', error);
          
          // Log additional error details for debugging
          if (error instanceof Error) {
            console.error('   📝 Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
          }
        }
      };

      // Execute the profile creation
      createProfile();
    }
  }, [auth.isAuthenticated, auth.user, createUserProfile]);

  // ========================================================================
  // RETURN VALUES
  // ========================================================================
  
  return { 
    loading, 
    error,
    // Additional debugging information
    hasAttempted: hasAttemptedCreation.current,
    isAuthenticated: auth.isAuthenticated,
    hasUser: !!auth.user
  };
}
