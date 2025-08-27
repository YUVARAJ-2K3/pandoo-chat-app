// src/pages/chat.tsx
"use client";

import { useAuth } from "react-oidc-context";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import {
  MY_CONVERSATIONS,
  MESSAGES,
  SEND_MESSAGE,
  ON_MESSAGE_ADDED,
  CREATE_DIRECT_CONVERSATION,
  GET_OR_CREATE_CONVERSATION,
  GET_USER_PROFILE,
} from "../graphql/operations";
import { useEffect, useState, useCallback } from "react";
import { FilePreview } from "../components/FilePreview";
import { FileMessage } from "../components/FileMessage";
import Logo from "../components/Logo";
import { 
  uploadFileToS3, 
  validateFile, 
  generateFileKey,
  getFileIcon,
  formatFileSize,
  getPresignedDownloadUrl
} from "../lib/s3";

export default function ChatPage() {
  const auth = useAuth();
  if (!auth) return <p style={{ padding: 24 }}>Auth context not found.</p>;
  if (auth.isLoading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (auth.error) return <p style={{ padding: 24 }}>Auth error: {auth.error.message}</p>;
  if (!auth.isAuthenticated) {
    return (
      <p style={{ padding: 24 }}>
        Please{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); auth.signinRedirect(); }}>
          sign in
        </a>.
      </p>
    );
  }

  return <ChatUI />;
}

// Component to display conversation title with async profile fetching
function ConversationTitle({ conversation, userProfiles, getConversationTitle }: { 
  conversation: any, 
  userProfiles: Record<string, any>,
  getConversationTitle: (conversation: any) => Promise<string>
}) {
  const [title, setTitle] = useState('Loading...');
  
  console.log("[ConversationTitle] Rendering for conversation:", conversation.id);
  console.log("[ConversationTitle] userProfiles:", userProfiles);
  
  useEffect(() => {
    console.log("[ConversationTitle] useEffect triggered for conversation:", conversation.id);
    const updateTitle = async () => {
      try {
        console.log("[ConversationTitle] Calling getConversationTitle for:", conversation.id);
        const newTitle = await getConversationTitle(conversation);
        console.log("[ConversationTitle] Got title:", newTitle, "for conversation:", conversation.id);
        setTitle(newTitle);
      } catch (error) {
        console.error('Error getting conversation title:', error);
        setTitle('Chat');
      }
    };
    
    updateTitle();
  }, [conversation.id, userProfiles, getConversationTitle]);
  
  return (
    <div style={{ fontWeight: '600', color: '#212529', marginBottom: '6px', fontSize: '15px' }}>
      {title}
    </div>
  );
}

// Component to display chat header title
function ChatHeaderTitle({ 
  conversationId, 
  conversations, 
  userProfiles, 
  getConversationTitle 
}: { 
  conversationId: string | null, 
  conversations: any[] | undefined, 
  userProfiles: Record<string, any>,
  getConversationTitle: (conversation: any) => Promise<string>
}) {
  const [title, setTitle] = useState('Chat');
  
  console.log("[ChatHeaderTitle] Rendering with conversationId:", conversationId);
  console.log("[ChatHeaderTitle] conversations:", conversations);
  console.log("[ChatHeaderTitle] userProfiles:", userProfiles);
  
  useEffect(() => {
    console.log("[ChatHeaderTitle] useEffect triggered");
    if (conversationId && conversations) {
      const conversation = conversations.find((c: any) => c.id === conversationId);
      console.log("[ChatHeaderTitle] Found conversation:", conversation);
      if (conversation) {
        console.log("[ChatHeaderTitle] Calling getConversationTitle for:", conversation.id);
        getConversationTitle(conversation).then(setTitle);
      }
    }
  }, [conversationId, conversations, userProfiles, getConversationTitle]);
  
  return (
    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500', color: '#212529' }}>
      {title}
    </h3>
  );
}

function ChatUI() {
  const auth = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("pandoo:lastConvId") : null)
  );
  const [text, setText] = useState("");
  const [realtime, setRealtime] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState("");
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Conversations
  const convs = useQuery(MY_CONVERSATIONS, {
    onCompleted: (d) => {
      console.log("[q] myConversations:", d);
      console.log("[q] myConversations data:", d.data);
      console.log("[q] myConversations length:", d.data?.myConversations?.length);
      if (d.data?.myConversations) {
        d.data.myConversations.forEach((conv: any, index: number) => {
          console.log(`[q] Conversation ${index}:`, conv);
          console.log(`[q] Conversation ${index} members:`, conv.members);
        });
      }
    },
    onError: (e) => console.error("[q] myConversations error:", e),
    fetchPolicy: "network-only",
  });

  // Auto-select first conversation if none chosen yet
  useEffect(() => {
    if (!conversationId && convs.data?.myConversations?.length) {
      const first = convs.data.myConversations[0].id as string;
      setConversationId(first);
      localStorage.setItem("pandoo:lastConvId", first);
      setRealtime([]);
      console.log("[ui] auto-selected conversation:", first);
    }
  }, [convs.data, conversationId]);

  // Auto-fetch user profiles for conversations
  useEffect(() => {
    console.log("[DEBUG] useEffect triggered - convs.data:", convs.data);
    console.log("[DEBUG] useEffect triggered - myConversations:", convs.data?.myConversations);
    
    if (convs.data?.myConversations) {
      console.log("[DEBUG] Conversations data:", convs.data.myConversations);
      console.log("[DEBUG] Current user ID:", auth.user?.profile?.sub);
      console.log("[DEBUG] Current userProfiles state:", userProfiles);
      
      const fetchProfiles = async () => {
        for (const conversation of convs.data.myConversations) {
          console.log("[DEBUG] Processing conversation:", conversation);
          console.log("[DEBUG] Conversation members:", conversation.members);
          
          if (conversation.members && conversation.members.length > 0) {
            const memberIds = conversation.members.map((m: any) => m.S || m);
            console.log("[DEBUG] Member IDs after mapping:", memberIds);
            
            const otherMembers = memberIds.filter((id: string) => id !== auth.user?.profile?.sub);
            console.log("[DEBUG] Other members (excluding current user):", otherMembers);
            
            // Fetch profiles for other members in direct conversations
            if (otherMembers.length === 1) {
              console.log("[DEBUG] Fetching profile for user:", otherMembers[0]);
              await fetchUserProfile(otherMembers[0]);
            }
          }
        }
      };
      
      fetchProfiles();
    }
  }, [convs.data?.myConversations, auth.user?.profile?.sub, userProfiles]);

  // Messages list
  const msgs = useQuery(MESSAGES, {
    variables: { conversationId: conversationId as string, limit: 50 },
    skip: !conversationId,
    fetchPolicy: "network-only",
    onCompleted: (d) => {
      console.log("[q] messages:", d);
      // Set the last message time for polling
      if (d.data?.messages?.items?.length > 0) {
        const lastMsg = d.data.messages.items[d.data.messages.items.length - 1];
        setLastMessageTime(new Date(lastMsg.createdAt));
      }
    },
    onError: (e) => console.error("[q] messages error:", e),
  });

  // Send message mutation
  const [sendMessage, { error: sendErr, loading: sendLoading }] = useMutation(SEND_MESSAGE, {
    onCompleted: (d) => console.log("[mut] sendMessage:", d),
    onError: (e) => console.error("[mut] sendMessage error:", e),
  });

  // Create direct conversation mutation
  const [createDirectConversation, { loading: createLoading }] = useMutation(CREATE_DIRECT_CONVERSATION, {
    onCompleted: (d) => {
      console.log("[mut] createDirectConversation:", d);
      if (d.data?.createDirectConversation) {
        const newConversation = d.data.createDirectConversation;
        setConversationId(newConversation.id);
        localStorage.setItem("pandoo:lastConvId", newConversation.id);
        setRealtime([]);
        setShowNewChat(false);
        setNewChatUserId("");
        // Refresh conversations list
        convs.refetch();
      }
    },
    onError: (e) => {
      console.error("[mut] createDirectConversation error:", e);
      alert(`Failed to create chat: ${e.message}`);
    },
  });

  // ========================================================================
  // WEBSOCKET SUBSCRIPTION
  // ========================================================================
  const subscription = useSubscription(ON_MESSAGE_ADDED, {
    variables: { conversationId: conversationId as string },
    skip: !conversationId,
    onData: ({ data }) => {
      console.log("[sub] event", data.data?.onMessageAdded);
      if (data.data?.onMessageAdded) {
        const newMessage = data.data.onMessageAdded;
        
        // Check if message is already in real-time to avoid duplicates
        setRealtime((prev) => {
          const exists = prev.some(msg => msg.msgId === newMessage.msgId);
          if (exists) {
            console.log("[sub] Message already exists, skipping duplicate");
            return prev;
          }
          console.log("[sub] Adding new message to real-time:", newMessage);
          return [...prev, newMessage];
        });
        
        // Update last message time for polling
        setLastMessageTime(new Date(newMessage.createdAt));
      }
    },
    onError: (e) => {
      console.error("[sub] error", e);
      console.log("[sub] WebSocket failed, falling back to AJAX polling");
      
      // Log detailed error information
      if (e.graphQLErrors?.length) {
        console.error("[sub] GraphQL errors:", e.graphQLErrors);
      }
      if (e.networkError) {
        console.error("[sub] Network error:", e.networkError);
      }
      if (e.message) {
        console.error("[sub] Error message:", e.message);
      }
    },
    onComplete: () => {
      console.log("[sub] completed");
    },
  });
  
  // Reset realtime messages when conversation changes
  useEffect(() => {
    setRealtime([]);
    setLastMessageTime(null);
  }, [conversationId]);

  // AJAX Polling for new messages (fallback when WebSocket fails)
  const pollForNewMessages = useCallback(async () => {
    if (!conversationId || isPolling) return;
    
    setIsPolling(true);
    try {
      const httpUrl = process.env.NEXT_PUBLIC_APPSYNC_URL!;
      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth.user?.id_token || '',
        },
        body: JSON.stringify({
          query: `
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
                }
                nextToken
              }
            }
          `,
          variables: {
            conversationId: conversationId,
            limit: 10
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.data?.messages?.items || [];
        
        if (newMessages.length > 0) {
          // If we have a lastMessageTime, filter for newer messages
          if (lastMessageTime) {
            const recentMessages = newMessages.filter((msg: any) => {
              const msgTime = new Date(msg.createdAt);
              return msgTime > lastMessageTime;
            });
            
            if (recentMessages.length > 0) {
              console.log("[poll] Found", recentMessages.length, "new messages");
              
              // Add new messages to real-time
              setRealtime((prev) => {
                const existingIds = new Set(prev.map((m: any) => m.msgId));
                const trulyNew = recentMessages.filter((m: any) => !existingIds.has(m.msgId));
                return [...prev, ...trulyNew];
              });
            }
          } else {
            // First time polling - just log that we're checking
            console.log("[poll] First poll - checking for messages");
          }
          
          // Always update last message time to the latest message
          const latestMsg = newMessages[newMessages.length - 1];
          setLastMessageTime(new Date(latestMsg.createdAt));
        } else {
          console.log("[poll] No messages found in conversation");
        }
      }
    } catch (error) {
      console.error("[poll] Error polling for messages:", error);
    } finally {
      setIsPolling(false);
    }
  }, [conversationId, lastMessageTime, isPolling, auth.user?.id_token]);

  // Set up polling interval
  useEffect(() => {
    if (!conversationId) return;
    
    console.log("[poll] Starting polling interval for conversation:", conversationId);
    
    // Poll every 2 seconds for new messages
    const interval = setInterval(() => {
      console.log("[poll] Polling for new messages...");
      pollForNewMessages();
    }, 2000);
    
    return () => {
      console.log("[poll] Clearing polling interval for conversation:", conversationId);
      clearInterval(interval);
    };
  }, [conversationId, pollForNewMessages]);

  // Subscription with better error handling
  // ========================================================================
  // WEBSOCKET SUBSCRIPTION
  // ========================================================================

  const onSend = async () => {
    if (!conversationId) return;
    
    // Check if we have text, file, or voice message to send
    if (!text.trim() && !selectedFile && !audioBlob) return;
    
    try {
      let mediaKey = null;
      
      // Upload file if selected
      if (selectedFile) {
        console.log('[CHAT] Starting file upload for:', selectedFile.name);
        setIsUploading(true);
        setUploadProgress(0);
        
        const userId = auth.user?.profile?.sub || 'unknown';
        const fileKey = generateFileKey(selectedFile, userId);
        console.log('[CHAT] Generated file key:', fileKey);
        console.log('[CHAT] User ID:', userId);
        
        try {
          const uploadResult = await uploadFileToS3(
            selectedFile, 
            fileKey, 
            (progress) => setUploadProgress(progress)
          );
          
          console.log('[CHAT] Upload result:', uploadResult);
          
          if (!uploadResult.success) {
            console.error('[CHAT] Upload failed:', uploadResult.error);
            alert(`File upload failed: ${uploadResult.error}`);
            setIsUploading(false);
            setUploadProgress(0);
            return;
          }
          
          console.log('[CHAT] Upload successful, mediaKey:', uploadResult.fileKey);
          mediaKey = uploadResult.fileKey;
          setIsUploading(false);
          setUploadProgress(0);
        } catch (error) {
          console.error('[CHAT] Error during upload:', error);
          alert(`File upload error: ${error}`);
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }
      }

      // Upload voice message if recorded
      if (audioBlob) {
        console.log('[CHAT] Starting voice message upload');
        setIsUploading(true);
        setUploadProgress(0);
        
        const userId = auth.user?.profile?.sub || 'unknown';
        // Convert audio blob to file
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
          type: 'audio/webm'
        });
        
        const fileKey = generateFileKey(audioFile, userId);
        console.log('[CHAT] Generated voice file key:', fileKey);
        
        try {
          const uploadResult = await uploadFileToS3(
            audioFile, 
            fileKey, 
            (progress) => setUploadProgress(progress)
          );
          
          console.log('[CHAT] Voice upload result:', uploadResult);
          
          if (!uploadResult.success) {
            console.error('[CHAT] Voice upload failed:', uploadResult.error);
            alert(`Voice message upload failed: ${uploadResult.error}`);
            setIsUploading(false);
            setUploadProgress(0);
            return;
          }
          
          console.log('[CHAT] Voice upload successful, mediaKey:', uploadResult.fileKey);
          mediaKey = uploadResult.fileKey;
          setIsUploading(false);
          setUploadProgress(0);
        } catch (error) {
          console.error('[CHAT] Error during voice upload:', error);
          alert(`Voice message upload error: ${error}`);
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }
      }
      
      // Send message with or without file/voice
      const messageType = selectedFile || audioBlob ? "file" : "text";
      const messageBody = text.trim() || selectedFile?.name || "File shared";
      
      // For file/voice messages, include metadata in the body
      let finalMessageBody = messageBody;
      if (selectedFile && messageType === "file") {
        const fileMetadata = {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
          mediaKey: mediaKey
        };
        finalMessageBody = JSON.stringify(fileMetadata);
        console.log('[CHAT] File metadata:', fileMetadata);
        console.log('[CHAT] Final message body:', finalMessageBody);
      }
      
      if (audioBlob && messageType === "file") {
        const voiceMetadata = {
          fileName: `Voice Message ${formatRecordingTime(recordingTime)}`,
          fileSize: audioBlob.size,
          fileType: 'audio/webm',
          mediaKey: mediaKey,
          duration: recordingTime,
          isVoiceMessage: true
        };
        finalMessageBody = JSON.stringify(voiceMetadata);
        console.log('[CHAT] Voice metadata:', voiceMetadata);
        console.log('[CHAT] Final voice message body:', finalMessageBody);
      }
      
      const result = await sendMessage({ 
        variables: { 
          conversationId, 
          type: messageType, 
          body: finalMessageBody,
          mediaKey: mediaKey
        } 
      });
      
      // Add the sent message to real-time immediately for instant feedback
      if (result.data?.sendMessage) {
        const sentMessage = result.data.sendMessage;
        
        // For file messages, ensure we have the complete metadata
        if (selectedFile && messageType === "file") {
          sentMessage.body = finalMessageBody; // Use the metadata-enriched body
        }
        
        setRealtime((prev) => [...prev, sentMessage]);
        
        // Update last message time for polling
        setLastMessageTime(new Date(sentMessage.createdAt));
        
        // Force an immediate poll to get any other new messages
        setTimeout(() => pollForNewMessages(), 500);
      }
      
      // Clear input, selected file, and voice message
      setText("");
      setSelectedFile(null);
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

    const startNewChat = async () => {
    if (!newChatUserId.trim()) return;

    // Validate that user is not trying to chat with themselves
    if (newChatUserId.trim() === auth.user?.profile?.sub) {
      alert("You cannot start a chat with yourself!");
      return;
    }

    setIsCreatingChat(true);
    try {
      await createDirectConversation({ 
        variables: { otherUserId: newChatUserId.trim() } 
      });
    } catch (error) {
      console.error("Failed to start new chat:", error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Generate unique conversation ID for user pairs
  const generateConversationId = (userId1: string, userId2: string) => {
    // Sort user IDs to ensure consistent conversation ID regardless of who initiates
    const sortedIds = [userId1, userId2].sort();
    // Create a deterministic hash-like string
    const combined = sortedIds.join('_');
    return `conv_${btoa(combined).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
  };

  const isMyMessage = (senderId: string) => {
    return senderId === auth.user?.profile?.sub;
  };

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }
    
    setSelectedFile(file);
    setUploadProgress(0);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  // Voice message functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer for recording
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Store references for cleanup
      (window as any).currentMediaRecorder = mediaRecorder;
      (window as any).currentTimer = timer;
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    const mediaRecorder = (window as any).currentMediaRecorder;
    const timer = (window as any).currentTimer;
    
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
    
    if (timer) {
      clearInterval(timer);
    }
  };

  const cancelRecording = () => {
    const mediaRecorder = (window as any).currentMediaRecorder;
    const timer = (window as any).currentTimer;
    
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
    
    if (timer) {
      clearInterval(timer);
    }
    
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Search functionality
  const getFilteredMessages = () => {
    if (!searchQuery.trim()) {
      return msgs.data?.messages?.items || [];
    }
    
    const allMessages = [...(msgs.data?.messages?.items || []), ...realtime];
    const query = searchQuery.toLowerCase();
    
    return allMessages.filter((message) => {
      // Search in message body
      if (message.body?.toLowerCase().includes(query)) return true;
      
      // Search in file metadata if it's a file message
      if (message.type === 'file') {
        try {
          const metadata = JSON.parse(message.body);
          if (metadata.fileName?.toLowerCase().includes(query)) return true;
        } catch (e) {
          // If not JSON, search in the body
          if (message.body?.toLowerCase().includes(query)) return true;
        }
      }
      
      return false;
    });
  };

  // Function to fetch user profile from Cognito
  const fetchUserProfile = async (userId: string) => {
    if (userProfiles[userId]) return userProfiles[userId];
    
    try {
      const httpUrl = process.env.NEXT_PUBLIC_APPSYNC_URL!;
      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth.user?.id_token || '',
        },
        body: JSON.stringify({
          query: `
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
          `,
          variables: { userId }
        }),
      });
      
      const result = await response.json();
      if (result.data?.getUserProfile) {
        const profile = result.data.getUserProfile;
        setUserProfiles(prev => ({ ...prev, [userId]: profile }));
        return profile;
      }
    } catch (error) {
      console.error(`Failed to fetch profile for user ${userId}:`, error);
    }
    return null;
  };

  const getConversationTitle = async (conversation: any) => {
    console.log("[title] Processing conversation:", conversation);
    console.log("[title] Conversation members:", conversation.members);
    console.log("[title] Current user ID:", auth.user?.profile?.sub);
    
    // For conversations with members, show usernames (prioritize over hardcoded title)
    if (conversation.members && conversation.members.length > 0) {
      const memberIds = conversation.members.map((m: any) => m.S || m);
      console.log("[title] Member IDs after mapping:", memberIds);
      console.log("[title] Current user ID:", auth.user?.profile?.sub);
      
      // Filter out current user and get other members
      const otherMembers = memberIds.filter((id: string) => id !== auth.user?.profile?.sub);
      console.log("[title] Other members:", otherMembers);
      
      if (otherMembers.length === 0) {
        // Self chat - show current user's username
        const displayName = getCurrentUserDisplayName();
        console.log("[title] Self chat, showing:", displayName);
        return displayName;
      } else if (otherMembers.length === 1) {
        // Direct message - show other user's username
        const otherUserId = otherMembers[0];
        
        // Try to get the user profile from our cache first
        let profile = userProfiles[otherUserId];
        console.log("[title] Profile from cache for", otherUserId, ":", profile);
        
        if (!profile) {
          // Fetch the profile if not cached
          console.log("[title] Fetching profile for", otherUserId);
          profile = await fetchUserProfile(otherUserId);
          console.log("[title] Fetched profile:", profile);
        }
        
        if (profile?.name || profile?.username) {
          const displayName = profile.name || profile.username;
          console.log("[title] Direct message with profile, showing:", displayName);
          return displayName;
        } else {
          // Fallback to user ID if no profile available
          const displayName = `Chat with ${otherUserId.substring(0, 8)}...`;
          console.log("[title] Direct message without profile, showing:", displayName);
          return displayName;
        }
      } else {
        // Group chat - show member count
        const displayName = `Group (${otherMembers.length} members)`;
        console.log("[title] Group chat, showing:", displayName);
        return displayName;
      }
    }
    
    // Only use hardcoded title if no members or if it's not a generic title
    if (conversation.title && conversation.title !== "Direct Chat" && conversation.title !== "self chat") {
      console.log("[title] Using existing title:", conversation.title);
      return conversation.title;
    }
    
    console.log("[title] Fallback to 'Chat'");
    // Fallback
    return "Chat";
  };

  const getConversationSubtitle = (conversation: any) => {
    if (conversation.members && conversation.members.length > 0) {
      const memberIds = conversation.members.map((m: any) => m.S || m);
      
      // Filter out current user
      const otherMembers = memberIds.filter((id: string) => id !== auth.user?.profile?.sub);
      
      if (otherMembers.length === 0) {
        // Self chat
        const username = getCurrentUserDisplayName();
        return `Just you (${username})`;
      } else if (otherMembers.length === 1) {
        // Direct message
        return `Direct message`;
      } else {
        // Group chat
        return `${otherMembers.length} other members`;
      }
    }
    return "No members";
  };

  // Utility function to get current user's display name
  const getCurrentUserDisplayName = () => {
    return auth.user?.profile?.preferred_username || 
           auth.user?.profile?.name || 
           auth.user?.profile?.email?.split('@')[0] || 
           'Self Chat';
  };

    const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowSidebar(false);
      } else {
        setShowSidebar(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      backgroundColor: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e9ecef;
          border-top: 2px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @media (max-width: 768px) {
          .sidebar {
            position: fixed !important;
            left: 0;
            top: 0;
            height: 100vh;
            z-index: 1000;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          
          .sidebar.show {
            transform: translateX(0);
          }
          
          .main-content {
            width: 100% !important;
          }
          
          .message-bubble {
            max-width: 85% !important;
            margin: 8px 0 !important;
          }
          
          input, button, label {
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
      
      {/* Mobile Menu Toggle */}
      {isMobile && (
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1001,
            padding: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
          title="Toggle menu"
        >
          {showSidebar ? '✕' : '☰'}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}
      
      {/* Left Sidebar - Conversations */}
      <div className={`sidebar ${showSidebar ? 'show' : ''}`} style={{ 
        width: isMobile ? '280px' : '320px', 
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        borderRight: '1px solid #e9ecef',
        transition: 'transform 0.3s ease'
      }}>
          {/* Header */}
          <div style={{ 
            padding: '24px', 
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginBottom: '16px' 
            }}>
              <Logo size="small" variant="default" />
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              ✨ New Chat
            </button>
          </div>

        {/* New Chat Modal */}
        {showNewChat && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: '400px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#007bff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    overflow: 'hidden'
                  }}>
                    <Logo />
                  </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#212529' }}>
                  Start New Chat
                </h3>
                <p style={{ margin: 0, fontSize: '16px', color: '#6c757d', lineHeight: 1.5 }}>
                  Connect with another user by entering their Cognito User ID
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  User ID (sub)
                </label>
                <input
                  type="text"
                  placeholder="e.g., us-east-1_abc123def"
                  value={newChatUserId}
                  onChange={(e) => setNewChatUserId(e.target.value)}
                  className="input"
                />
                <p style={{ 
                  margin: '8px 0 0 0', 
                  fontSize: '12px', 
                  color: '#6c757d',
                  lineHeight: 1.4
                }}>
                  You can find this in the AWS Cognito console or ask the other user for their User ID
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={startNewChat}
                  disabled={!newChatUserId.trim() || isCreatingChat}
                  className={`btn ${newChatUserId.trim() && !isCreatingChat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, opacity: newChatUserId.trim() && !isCreatingChat ? 1 : 0.6 }}
                >
                  {isCreatingChat ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div className="loading-spinner" />
                      Creating...
                    </span>
                  ) : (
                    'Start Chat'
                  )}
                </button>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057', marginBottom: '8px' }}>
                  💡 How to find a User ID:
                </div>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '20px', 
                  fontSize: '13px', 
                  color: '#6c757d',
                  lineHeight: 1.5
                }}>
                  <li>Ask the other user to share their Cognito User ID</li>
                  <li>Check the AWS Cognito console under Users</li>
                  <li>Look for the "sub" field in their user profile</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {convs.data?.myConversations?.map((c: any) => (
            <div
              key={c.id}
              onClick={() => {
                setConversationId(c.id);
                localStorage.setItem("pandoo:lastConvId", c.id);
                setRealtime([]);
                console.log("[ui] selected conversation:", c.id);
              }}
              className={`sidebar-item ${conversationId === c.id ? 'active' : ''}`}
            >
              <ConversationTitle conversation={c} userProfiles={userProfiles} getConversationTitle={getConversationTitle} />
              <div style={{ fontSize: '13px', color: '#6c757d', lineHeight: '1.4' }}>
                {getConversationSubtitle(c)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="main-content" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        width: isMobile ? '100%' : 'auto'
      }}>
        {conversationId ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <ChatHeaderTitle 
                    conversationId={conversationId} 
                    conversations={convs.data?.myConversations} 
                    userProfiles={userProfiles}
                    getConversationTitle={getConversationTitle}
                  />
                  <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                    Conversation ID: {conversationId.substring(0, 8)}...
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* AJAX Polling Status */}
                  <div className={`status-indicator ${isPolling ? 'status-loading' : 'status-online'}`}>
                    <div className={isPolling ? 'pulse' : ''} style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'currentColor'
                    }} />
                    {isPolling ? 'Polling...' : 'Live'}
                  </div>
                  {/* Manual Refresh Button */}
                  <button
                    onClick={() => {
                      pollForNewMessages();
                      msgs.refetch();
                    }}
                    className="btn btn-ghost"
                    style={{ padding: '8px', fontSize: '14px' }}
                    title="Refresh messages"
                  >
                    🔄
                  </button>
                </div>
              </div>
              
              {/* Message Search Bar */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 40px',
                      border: '1px solid #e9ecef',
                      borderRadius: '24px',
                      fontSize: '14px',
                      backgroundColor: '#f8f9fa',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.backgroundColor = 'white'}
                    onBlur={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    color: '#6c757d'
                  }}>
                    🔍
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        fontSize: '18px',
                        color: '#6c757d',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#f8f9fa'
            }}>
              {/* Search Results */}
              {searchQuery && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    🔍 <strong>Search Results for: "{searchQuery}"</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#1976d2' }}>
                    Found {getFilteredMessages().length} matching messages
                  </div>
                </div>
              )}
              
              {/* Historical Messages */}
              {getFilteredMessages().map((m: any) => (
                <MessageBubble
                  key={m.msgId}
                  message={m}
                  isMyMessage={isMyMessage(m.senderId)}
                />
              ))}
              
              {/* Real-time Messages */}
              {!searchQuery && realtime.map((m) => (
                <MessageBubble
                  key={m.msgId}
                  message={m}
                  isMyMessage={isMyMessage(m.senderId)}
                />
              ))}
            </div>

            {/* Message Input */}
            <div style={{
              padding: '20px',
              backgroundColor: 'white',
              borderTop: '1px solid #e9ecef'
            }}>
                            {/* File Preview */}
              {selectedFile && (
                <FilePreview
                  file={selectedFile}
                  onRemove={removeSelectedFile}
                  uploadProgress={uploadProgress}
                  isUploading={isUploading}
                />
              )}

              {/* Audio Preview */}
              {audioBlob && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '12px',
                  marginTop: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    🎵 <strong>Voice Message</strong>
                    <button
                      onClick={() => setAudioBlob(null)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <audio controls style={{ width: '100%' }}>
                    <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                    Your browser does not support audio playback.
                  </audio>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                    Duration: {formatRecordingTime(Math.ceil(audioBlob.size / 16000))} • Size: {(audioBlob.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              )}
              
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                flexDirection: isMobile ? 'column' : 'row',
                width: '100%'
              }}>
                {/* File Upload Button */}
                <label
                  htmlFor="file-upload"
                  style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: '#495057',
                    transition: 'all 0.2s ease',
                    minWidth: 'fit-content'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  title="Attach file (max 50MB)"
                >
                  📎 Attach
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip,.rar,.mp3,.wav,.mp4,.avi,.mov,.wmv"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Voice Message Button */}
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    style={{
                      padding: '12px',
                      backgroundColor: '#dc3545',
                      border: '1px solid #dc3545',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: 'white',
                      transition: 'all 0.2s ease',
                      minWidth: 'fit-content'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#c82333';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc3545';
                    }}
                    title="Record voice message"
                  >
                    🎤 Record
                  </button>
                ) : (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#dc3545',
                    borderRadius: '12px',
                    color: 'white'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      animation: 'pulse 1s infinite'
                    }} />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                      {formatRecordingTime(recordingTime)}
                    </span>
                    <button
                      onClick={stopRecording}
                      style={{
                        padding: '8px',
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#dc3545',
                        fontSize: '16px'
                      }}
                      title="Stop recording"
                    >
                      ⏹️
                    </button>
                    <button
                      onClick={cancelRecording}
                      style={{
                        padding: '8px',
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#dc3545',
                        fontSize: '16px'
                      }}
                      title="Cancel recording"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                <input
                  className="input input-search"
                  style={{ flex: 1, borderRadius: '24px' }}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && onSend()}
                />
                
                <button
                  onClick={onSend}
                  disabled={sendLoading || (!text.trim() && !selectedFile && !audioBlob)}
                  className={`btn ${(text.trim() || selectedFile || audioBlob) ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: '24px' }}
                >
                  {sendLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="loading-spinner" />
                      Sending...
                    </span>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
              {sendErr && (
                <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '8px' }}>
                  Error sending message: {sendErr.message}
                </p>
              )}
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ textAlign: 'center', color: '#6c757d' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Select a conversation</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Choose a conversation from the left to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message, isMyMessage }: { message: any; isMyMessage: boolean }) {
  // Check if this is a file message (including voice messages)
  const isFileMessage = message.type === 'file' && message.mediaKey;
  
  // State for audio URL
  const [audioUrl, setAudioUrl] = useState<string>('');
  
  // Get presigned URL for voice messages
  useEffect(() => {
    if (isFileMessage && message.mediaKey) {
      // Check if this is a voice message
      try {
        const metadata = JSON.parse(message.body);
        if (metadata.fileType === 'audio/webm' && metadata.duration) {
          // Generate presigned URL for audio
          const generateAudioUrl = async () => {
            try {
              const url = await getPresignedDownloadUrl(message.mediaKey);
              setAudioUrl(url);
            } catch (error) {
              console.error('Error generating audio URL:', error);
              // Fallback to direct S3 URL
              setAudioUrl(`https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${message.mediaKey}`);
            }
          };
          generateAudioUrl();
        }
      } catch (e) {
        // Not a voice message
      }
    }
  }, [message, isFileMessage]);
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
      marginBottom: '16px'
    }}>
      <div className={`message-bubble ${isMyMessage ? 'my-message' : 'other-message'}`}>
        {/* File Message (including voice messages) */}
        {isFileMessage ? (() => {
          // Parse file metadata from message body
          let fileName = message.body;
          let fileSize = 0;
          let fileType = 'application/octet-stream';
          let duration = 0;
          let isVoiceMessage = false;
          
          try {
            // Try to parse JSON metadata first
            const metadata = JSON.parse(message.body);
            if (metadata.fileName && metadata.fileSize && metadata.fileType) {
              fileName = metadata.fileName;
              fileSize = metadata.fileSize;
              fileType = metadata.fileType;
                        // Check if this is a voice message
          if (metadata.duration && metadata.fileType === 'audio/webm') {
            isVoiceMessage = true;
            duration = metadata.duration;
            console.log('[MessageBubble] Voice message detected:', { duration, metadata });
          }
            }
          } catch (e) {
            // If not JSON, use the body as filename and try to get type from mediaKey
            fileName = message.body;
            fileType = message.mediaKey?.split('.').pop() || 'application/octet-stream';
          }
          
          // Render voice message differently
          if (isVoiceMessage) {
            return (
              <div style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                minWidth: '200px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  🎵 <strong>{fileName}</strong>
                </div>
                {audioUrl ? (
                  <audio controls style={{ width: '100%' }}>
                    <source src={audioUrl} type="audio/webm" />
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#6c757d'
                  }}>
                    🔄 Loading audio...
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                  Duration: {duration ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : 'Unknown'} • Size: {(fileSize / 1024).toFixed(1)} KB
                </div>
              </div>
            );
          }
          
          // Render regular file message
          return (
            <FileMessage
              fileName={fileName}
              fileSize={fileSize}
              fileType={fileType}
              mediaKey={message.mediaKey}
              isMyMessage={isMyMessage}
            />
          );
        })() : (
          /* Text Message */
          <div style={{ fontSize: '14px', lineHeight: '1.4', marginBottom: '8px' }}>
            {message.body}
          </div>
        )}
        
        <div style={{
          fontSize: '11px',
          color: isMyMessage ? 'rgba(255,255,255,0.7)' : '#6c757d',
          textAlign: 'right',
          opacity: 0.8,
          marginTop: '8px'
        }}>
          {new Date(message.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
}
