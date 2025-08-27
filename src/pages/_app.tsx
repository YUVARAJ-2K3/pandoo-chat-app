// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { useMemo } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import { ApolloProvider } from "@apollo/client";
import { makeApolloClient } from "../lib/apollo";
import { AutoUserCreator } from "../components/AutoUserCreator";
import "../styles/globals.css";

const cognitoAuthConfig = {
  authority: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY!,
  client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  redirect_uri: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!,
  response_type: "code",
  scope: (process.env.NEXT_PUBLIC_COGNITO_SCOPE || "openid profile email").replace(/,/g, " "),
};

const APPSYNC_HTTP_URL = process.env.NEXT_PUBLIC_APPSYNC_URL!; // must end with /graphql

function ApolloFromAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (!auth || auth.isLoading) return null;            // wait for token
  if (auth.error) return <p style={{ padding: 24 }}>Auth error: {auth.error.message}</p>;

  const idToken = auth.user?.id_token ?? "";
  const client = useMemo(() => makeApolloClient(idToken, APPSYNC_HTTP_URL), [idToken]);

  return (
    <ApolloProvider client={client}>
      <AutoUserCreator />
      {children}
    </ApolloProvider>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider {...cognitoAuthConfig}>
      <ApolloFromAuth>
        <Component {...pageProps} />
      </ApolloFromAuth>
    </AuthProvider>
  );
}
