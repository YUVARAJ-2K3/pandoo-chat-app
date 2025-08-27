// src/graphql/operations.ts
import { gql } from "@apollo/client";

export const MY_CONVERSATIONS = gql`
  query MyConversations {
    myConversations {
      id
      title
      members
      createdAt
      updatedAt
      isGroup
    }
  }
`;

export const MESSAGES = gql`
  query Messages($conversationId: ID!, $limit: Int, $nextToken: String) {
    messages(conversationId: $conversationId, limit: $limit, nextToken: $nextToken) {
      items {
        conversationId
        msgId
        senderId
        createdAt
        body
        type
        sk
        mediaKey
        readBy
      }
      nextToken
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID!, $type: MessageType!, $body: String, $mediaKey: String) {
    sendMessage(conversationId: $conversationId, type: $type, body: $body, mediaKey: $mediaKey) {
      conversationId
      msgId
      senderId
      createdAt
      body
      type
      sk
      mediaKey
      readBy
    }
  }
`;

export const ON_MESSAGE_ADDED = gql`
  subscription OnMessageAdded($conversationId: ID!) {
    onMessageAdded(conversationId: $conversationId) {
      conversationId
      msgId
      senderId
      createdAt
      body
      type
      sk
      mediaKey
      readBy
    }
  }
`;

// New operations for conversation management
export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($memberIds: [ID!]!, $title: String) {
    createConversation(memberIds: $memberIds, title: $title) {
      id
      title
      members
      createdAt
      updatedAt
      isGroup
    }
  }
`;

export const CREATE_DIRECT_CONVERSATION = gql`
  mutation CreateDirectConversation($otherUserId: ID!) {
    createDirectConversation(otherUserId: $otherUserId) {
      id
      title
      members
      createdAt
      updatedAt
      isGroup
    }
  }
`;

export const GET_OR_CREATE_CONVERSATION = gql`
  query GetOrCreateConversation($userIds: [ID!]!) {
    getOrCreateConversation(userIds: $userIds) {
      id
      title
      members
      createdAt
      updatedAt
      isGroup
    }
  }
`;

export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: ID!) {
    getUserProfile(userId: $userId) {
      id
      username
      email
      name
      avatar
      status
    }
  }
`;

export const CREATE_USER_PROFILE = gql`
  mutation CreateUserProfile($input: CreateUserProfileInput!) {
    createUserProfile(input: $input) {
      id
      username
      email
      name
      avatar
      status
      createdAt
      updatedAt
    }
  }
`;
