# 🔧 Pandoo Chat Debugging Guide

This guide provides comprehensive debugging information for the Pandoo Chat application, helping developers quickly identify and resolve common issues.

## 📋 Table of Contents

1. [Console Logging System](#console-logging-system)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [WebSocket Troubleshooting](#websocket-troubleshooting)
4. [Authentication Debugging](#authentication-debugging)
5. [File Upload Issues](#file-upload-issues)
6. [Performance Monitoring](#performance-monitoring)
7. [Development Tools](#development-tools)

## 🔍 Console Logging System

### Log Prefixes
The application uses structured logging with consistent prefixes for easy filtering:

| Prefix | Category | Description |
|--------|----------|-------------|
| `[APOLLO]` | GraphQL Client | Apollo Client operations, WebSocket connections |
| `[AUTO_USER]` | User Management | Automatic user profile creation |
| `[QUERY]` | Data Fetching | GraphQL queries and responses |
| `[MUTATION]` | Data Changes | GraphQL mutations and results |
| `[SUBSCRIPTION]` | Real-time | WebSocket subscriptions and events |
| `[POLLING]` | Fallback | AJAX polling when WebSocket fails |
| `[SEND]` | Messaging | Message sending and file uploads |
| `[EFFECT]` | React Effects | useEffect hooks and side effects |

### Log Levels with Emojis
- ✅ **Success**: `console.log('✅ [PREFIX] Operation completed')`
- 🔄 **Progress**: `console.log('🔄 [PREFIX] Operation in progress...')`
- ⚠️ **Warning**: `console.log('⚠️ [PREFIX] Warning message')`
- ❌ **Error**: `console.error('❌ [PREFIX] Error occurred:', error)`
- 🔧 **Debug**: `console.log('🔧 [PREFIX] Debug info:', data)`

## 🚨 Common Issues & Solutions

### 1. Application Won't Load

**Symptoms:**
- White screen or loading spinner
- Console shows authentication errors

**Debugging Steps:**
1. Check browser console for `[AUTO_USER]` logs
2. Verify environment variables are set correctly
3. Check AWS Cognito configuration
4. Ensure AppSync endpoint is accessible

**Common Solutions:**
```bash
# Check environment variables
echo $NEXT_PUBLIC_APPSYNC_URL
echo $NEXT_PUBLIC_S3_BUCKET_NAME
echo $NEXT_PUBLIC_AWS_REGION

# Verify AWS credentials
aws sts get-caller-identity
```

### 2. Messages Not Sending

**Symptoms:**
- Send button appears disabled
- No error messages displayed
- Messages don't appear in chat

**Debugging Steps:**
1. Check `[SEND]` logs for upload progress
2. Verify file size limits (50MB max)
3. Check S3 bucket permissions
4. Monitor GraphQL mutation errors

**Console Commands:**
```javascript
// Check current conversation state
console.log('Current conversation:', conversationId);
console.log('Selected file:', selectedFile);
console.log('Text input:', text);

// Force message send
onSend();
```

### 3. Real-time Updates Not Working

**Symptoms:**
- Messages only appear after refresh
- WebSocket connection errors
- Polling fallback not working

**Debugging Steps:**
1. Check `[SUBSCRIPTION]` logs for WebSocket status
2. Monitor `[POLLING]` logs for fallback behavior
3. Verify AppSync real-time endpoint
4. Check Cognito token expiration

## 🔌 WebSocket Troubleshooting

### Connection Status Check
```javascript
// Listen for WebSocket events
window.addEventListener('websocket-connected', () => {
  console.log('🔌 WebSocket connected successfully');
});

window.addEventListener('websocket-closed', (event) => {
  console.log('🔌 WebSocket closed:', event.detail);
});

window.addEventListener('websocket-error', (event) => {
  console.error('🔌 WebSocket error:', event.detail);
});
```

### Common WebSocket Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | Invalid endpoint URL | Check `NEXT_PUBLIC_APPSYNC_URL` |
| Authentication failed | Expired/invalid token | Refresh Cognito token |
| Protocol error | AppSync configuration | Verify real-time API settings |
| Network timeout | Firewall/proxy blocking | Check network configuration |

### WebSocket Debug Commands
```javascript
// Check WebSocket status in console
console.log('WebSocket URL:', wsUrl);
console.log('Token valid:', !!auth.user?.id_token);
console.log('Connection state:', subscription.connectionState);
```

## 🔐 Authentication Debugging

### User Profile Creation
Monitor `[AUTO_USER]` logs for profile creation issues:

```javascript
// Check user profile state
console.log('User authenticated:', auth.isAuthenticated);
console.log('User profile:', auth.user?.profile);
console.log('User ID:', auth.user?.profile?.sub);

// Force profile creation
useAutoCreateUser();
```

### Common Auth Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Profile not created | User exists but no profile | Check `[AUTO_USER]` logs |
| Token expired | 401 errors, re-auth prompts | Implement token refresh |
| Missing permissions | Access denied errors | Verify Cognito group membership |
| Invalid redirect | Stuck on auth page | Check redirect URI configuration |

## 📁 File Upload Issues

### Upload Progress Monitoring
```javascript
// Monitor upload progress
console.log('Upload progress:', uploadProgress);
console.log('Is uploading:', isUploading);
console.log('Selected file:', selectedFile);

// Check file validation
const error = validateFile(selectedFile);
if (error) console.error('File validation error:', error);
```

### File Upload Debugging

| Issue | Cause | Solution |
|-------|-------|----------|
| Upload fails | File too large | Check 50MB limit |
| Invalid file type | Unsupported format | Verify file extensions |
| S3 access denied | Bucket permissions | Check IAM policies |
| Network timeout | Slow connection | Implement retry logic |

### S3 Configuration Check
```bash
# Verify S3 bucket access
aws s3 ls s3://your-bucket-name

# Check bucket policy
aws s3api get-bucket-policy --bucket your-bucket-name

# Test file upload
aws s3 cp test.txt s3://your-bucket-name/
```

## 📊 Performance Monitoring

### Key Metrics to Monitor
1. **Message Delivery Time**: WebSocket vs Polling latency
2. **File Upload Speed**: S3 transfer rates
3. **Memory Usage**: React component memory leaks
4. **Network Requests**: GraphQL query performance

### Performance Debug Commands
```javascript
// Monitor message delivery
console.time('message-delivery');
// ... send message ...
console.timeEnd('message-delivery');

// Check memory usage
console.log('Memory usage:', performance.memory);

// Monitor network requests
console.log('GraphQL cache size:', apolloClient.cache.extract());
```

## 🛠️ Development Tools

### Browser Extensions
- **React Developer Tools**: Component state inspection
- **Apollo Client DevTools**: GraphQL operation monitoring
- **Network Tab**: HTTP/WebSocket traffic analysis
- **Console Filtering**: Filter logs by prefix

### Debug Mode
Enable enhanced debugging in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [DEBUG] Enhanced logging enabled');
  console.log('🔧 [DEBUG] Component state:', componentState);
}
```

### Environment-Specific Logging
```typescript
// Production: Minimal logging
if (process.env.NODE_ENV === 'production') {
  console.log = () => {}; // Disable console logs
}

// Development: Full logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [DEV] Full debugging enabled');
}
```

## 📝 Debug Checklist

Before reporting an issue, verify:

- [ ] Environment variables are set correctly
- [ ] AWS services are accessible and configured
- [ ] Browser console shows relevant logs
- [ ] Network tab shows successful requests
- [ ] User authentication is valid
- [ ] File permissions are correct
- [ ] No browser extensions interfering

## 🆘 Getting Help

### Information to Include
1. **Error Messages**: Exact console errors and stack traces
2. **Environment**: Browser, OS, Node.js version
3. **Steps to Reproduce**: Detailed reproduction steps
4. **Console Logs**: Relevant log output with prefixes
5. **Network Tab**: Failed request details
6. **Configuration**: Environment variables and AWS settings

### Debug Commands Summary
```bash
# Check application status
npm run dev
npm run build
npm run start

# Verify dependencies
npm list
npm audit

# Check environment
echo $NODE_ENV
echo $NEXT_PUBLIC_APPSYNC_URL

# Monitor logs
tail -f .next/server.log
```

---

**Remember**: The structured logging system is your best friend for debugging. Always check the console first and look for the relevant prefix to narrow down the issue area.
