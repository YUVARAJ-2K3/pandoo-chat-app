// src/lib/apollo.ts
// Apollo Client configuration for AWS AppSync with WebSocket subscriptions
import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// ============================================================================
// WEB SOCKET DEBUGGING UTILITIES
// ============================================================================

/**
 * Logs detailed WebSocket connection information for debugging
 * @param wsUrl - WebSocket URL
 * @param idToken - JWT token for authentication
 */
function logWebSocketDebugInfo(wsUrl: string, idToken: string) {
  console.log("🔌 [APOLLO] WebSocket Debug Information:");
  console.log("   📍 URL:", wsUrl);
  console.log("   🔑 Token length:", idToken.length);
  console.log("   🔑 Token preview:", idToken.substring(0, 20) + "...");
  console.log("   🌐 Environment:", typeof window !== "undefined" ? "browser" : "server");
  console.log("   🔌 WebSocket available:", typeof window !== "undefined" && "WebSocket" in window);
}

/**
 * Logs WebSocket close codes with human-readable descriptions
 * @param code - WebSocket close code
 */
function logWebSocketCloseCode(code: number) {
  const closeCodeDescriptions: Record<number, string> = {
    1000: "Normal closure",
    1001: "Going away - page unload",
    1002: "Protocol error",
    1003: "Unsupported data",
    1006: "Abnormal closure - connection lost",
    1011: "Server error",
    1012: "Service restart",
    1013: "Try again later",
    1015: "TLS handshake failed"
  };
  
  const description = closeCodeDescriptions[code] || "Unknown close code";
  console.log(`🔌 [APOLLO] WebSocket closed with code ${code}: ${description}`);
}

// ============================================================================
// APOLLO CLIENT FACTORY
// ============================================================================

/**
 * Creates and configures an Apollo Client instance for AWS AppSync
 * @param idToken - JWT token from Cognito User Pools
 * @param httpUrl - AppSync HTTP endpoint URL
 * @returns Configured Apollo Client instance
 */
export function makeApolloClient(idToken: string, httpUrl: string) {
  console.log("🚀 [APOLLO] Creating Apollo Client...");
  console.log("   📍 HTTP URL:", httpUrl);
  
  // Convert HTTP URL to WebSocket URL for subscriptions
  const wsUrl = httpUrl
    .replace(/^https:/, "wss:")
    .replace("appsync-api", "appsync-realtime-api");
  
  console.log("   🔌 WebSocket URL:", wsUrl);
  
  // Log debug information for WebSocket connections
  logWebSocketDebugInfo(wsUrl, idToken);

  // ========================================================================
  // HTTP LINK CONFIGURATION
  // ========================================================================
  
  const httpLink = new HttpLink({
    uri: httpUrl,
    headers: { 
      Authorization: idToken // Cognito User Pools: raw JWT
    },
  });

  let link: any = httpLink;

  // ========================================================================
  // WEB SOCKET LINK CONFIGURATION (BROWSER ONLY)
  // ========================================================================
  
  if (typeof window !== "undefined") {
    console.log("🔌 [APOLLO] Setting up WebSocket link for browser environment");
    
    const wsLink = new GraphQLWsLink(
      createClient({
        url: wsUrl,
        webSocketImpl: window.WebSocket,
        
        // Connection parameters for authentication
        connectionParams: async () => {
          console.log("🔌 [APOLLO] Establishing WebSocket connection with token length:", idToken.length);
          return {
            Authorization: idToken, // IMPORTANT: Required for AppSync + Cognito
          };
        },
        
        // WebSocket event handlers
        on: {
          // Connection established successfully
          connected: () => {
            console.log("✅ [APOLLO] WebSocket connected successfully");
            // Dispatch custom event for UI updates
            window.dispatchEvent(new CustomEvent('websocket-connected'));
          },
          
          // Connection closed
          closed: (event: any) => {
            const closeCode = event?.code;
            logWebSocketCloseCode(closeCode);
            
            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('websocket-closed', { detail: event }));
          },
          
          // Connection error
          error: (error: any) => {
            console.error("❌ [APOLLO] WebSocket connection error:", error);
            
            // Log additional error details
            if (error instanceof Error) {
              console.error("   📝 Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack
              });
            }
            
            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('websocket-error', { detail: error }));
          },
        },
        
        // Retry configuration
        retryAttempts: 10,
        retryWait: (retryCount: number) => {
          // Exponential backoff with jitter for better retry behavior
          const baseDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          const jitter = Math.random() * 1000;
          const totalDelay = baseDelay + jitter;
          
          console.log(`🔄 [APOLLO] Retry attempt ${retryCount + 1}, waiting ${totalDelay}ms`);
          return new Promise(resolve => setTimeout(resolve, totalDelay));
        },
        
        // Retry decision logic
        shouldRetry: (errorOrCloseEvent: any) => {
          // Retry on network errors
          if (errorOrCloseEvent instanceof Error) {
            console.log("🔄 [APOLLO] Retrying due to error:", errorOrCloseEvent.message);
            return true;
          }
          
          // Check close codes for retry decisions
          const closeEvent = errorOrCloseEvent as { code?: number };
          const closeCode = closeEvent?.code;
          
          // Don't retry on normal closure or going away
          if (closeCode === 1000 || closeCode === 1001) {
            console.log(`🔄 [APOLLO] Not retrying due to close code: ${closeCode}`);
            return false;
          }
          
          // Retry on other close codes
          console.log(`🔄 [APOLLO] Retrying due to close code: ${closeCode}`);
          return true;
        },
      })
    );

    // ========================================================================
    // LINK SPLITTING (HTTP vs WebSocket)
    // ========================================================================
    
    // Split operations: subscriptions go to WebSocket, queries/mutations to HTTP
    link = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition?.kind === "OperationDefinition" && 
               definition?.operation === "subscription";
      },
      wsLink,  // WebSocket for subscriptions
      httpLink // HTTP for queries and mutations
    );
    
    console.log("🔌 [APOLLO] WebSocket link configured and split with HTTP link");
  } else {
    console.log("🌐 [APOLLO] Server-side rendering detected, using HTTP link only");
  }

  // ========================================================================
  // APOLLO CLIENT INSTANCE
  // ========================================================================
  
  const client = new ApolloClient({ 
    link, 
    cache: new InMemoryCache(),
    // Additional client options can be added here
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });
  
  console.log("✅ [APOLLO] Apollo Client created successfully");
  return client;
}
