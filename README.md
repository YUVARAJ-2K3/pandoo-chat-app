# Pandoo Chat - Humanized Codebase

A real-time messaging application powered by AWS AppSync, featuring a clean, readable, and debuggable codebase.

## 🎯 Code Humanization Goals

This codebase has been restructured and improved to achieve:

- **🔍 Easy Debugging**: Clear logging with emojis and structured prefixes
- **📖 Easy Understanding**: Well-organized components with clear separation of concerns
- **🧩 Modular Design**: Reusable components and logical function grouping
- **📝 Comprehensive Documentation**: JSDoc comments and inline explanations
- **🎨 Visual Clarity**: Consistent formatting and visual hierarchy

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── AutoUserCreator.tsx    # Automatic user profile creation
│   ├── FileMessage.tsx        # File message display
│   └── FilePreview.tsx        # File upload preview
├── graphql/             # GraphQL operations and schema
│   └── operations.ts    # All GraphQL queries, mutations, and subscriptions
├── lib/                 # Utility libraries and configurations
│   ├── apollo.ts        # Apollo Client configuration for AWS AppSync
│   ├── s3.ts           # S3 file upload utilities
│   └── useAutoCreateUser.ts  # Hook for automatic user creation
├── pages/               # Next.js page components
│   ├── _app.tsx        # App wrapper with providers
│   ├── index.tsx       # Landing page with authentication states
│   ├── chat.tsx        # Main chat interface
│   └── debug.tsx       # Connection debugging tools
└── styles/              # Global CSS styles
    └── globals.css     # Global styles and CSS variables
```

## 🚀 Key Features

### 🔐 Authentication
- **AWS Cognito Integration**: Secure user authentication
- **Auto Profile Creation**: Automatic user profile setup on first login
- **Multiple Auth States**: Clear handling of loading, error, and success states

### 💬 Real-time Chat
- **WebSocket Subscriptions**: Real-time message delivery via AWS AppSync
- **AJAX Polling Fallback**: Reliable message delivery when WebSocket fails
- **File Sharing**: Support for various file types with S3 storage
- **Voice Messages**: Audio recording and sharing capabilities

### 📱 Responsive Design
- **Mobile-First**: Optimized for all device sizes
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Accessibility**: Semantic HTML and keyboard navigation support

## 🛠️ Development Features

### 🔍 Enhanced Debugging
- **Structured Logging**: All console logs use consistent prefixes and emojis
- **Error Tracking**: Comprehensive error handling with detailed logging
- **State Monitoring**: Real-time state changes logged for debugging

### 📚 Code Organization
- **Component Separation**: Each component has a single responsibility
- **Hook Organization**: Custom hooks are well-documented and reusable
- **Type Safety**: TypeScript interfaces for better development experience

### 🎨 Visual Improvements
- **Consistent Styling**: Unified design system across components
- **Loading States**: Clear visual feedback for all async operations
- **Error States**: User-friendly error messages and recovery options

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- AWS Account with AppSync and Cognito configured
- S3 bucket for file storage

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_APPSYNC_URL=your_appsync_endpoint
NEXT_PUBLIC_S3_BUCKET_NAME=your_s3_bucket
NEXT_PUBLIC_AWS_REGION=your_aws_region
```

### Development
```bash
npm run dev
```

## 🔧 Debugging Guide

### Console Logging
The application uses structured logging with prefixes:

- `[APOLLO]` - Apollo Client and GraphQL operations
- `[AUTO_USER]` - User profile creation
- `[QUERY]` - GraphQL queries
- `[MUTATION]` - GraphQL mutations
- `[SUBSCRIPTION]` - WebSocket subscriptions
- `[POLLING]` - AJAX polling fallback
- `[SEND]` - Message sending operations

### Common Debugging Scenarios

1. **WebSocket Connection Issues**
   - Check browser console for `[APOLLO]` logs
   - Verify AWS AppSync endpoint configuration
   - Check Cognito token validity

2. **File Upload Problems**
   - Monitor `[SEND]` logs for upload progress
   - Verify S3 bucket permissions
   - Check file size and type restrictions

3. **Authentication Issues**
   - Review `[AUTO_USER]` logs for profile creation
   - Verify Cognito User Pool configuration
   - Check environment variables

## 📖 Code Style Guide

### Component Structure
```typescript
// ============================================================================
// COMPONENT NAME
// ============================================================================

/**
 * Component description
 * @param prop - prop description
 */
export function ComponentName({ prop }: { prop: string }) {
  // ========================================================================
  // STATE AND HOOKS
  // ========================================================================
  
  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================
  
  // ========================================================================
  // RENDERING
  // ========================================================================
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### Logging Standards
```typescript
// Success operations
console.log('✅ [PREFIX] Operation completed successfully');

// Information and progress
console.log('🔄 [PREFIX] Operation in progress...');

// Warnings
console.log('⚠️ [PREFIX] Warning message');

// Errors
console.error('❌ [PREFIX] Error occurred:', error);

// Debug information
console.log('🔧 [PREFIX] Debug info:', data);
```

## 🤝 Contributing

1. Follow the established code structure and naming conventions
2. Add comprehensive JSDoc comments for new functions
3. Use consistent logging prefixes and emojis
4. Ensure all components are properly typed with TypeScript
5. Test on both desktop and mobile devices

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- AWS AppSync for real-time GraphQL capabilities
- Next.js for the React framework
- Apollo Client for GraphQL client management
- Tailwind CSS for utility-first styling
