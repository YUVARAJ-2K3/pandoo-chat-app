# File Upload Setup Guide

This guide explains how to set up file uploads to Amazon S3 for the Pandoo chat application.

## Prerequisites

1. **AWS Account** with S3 access
2. **S3 Bucket** for storing uploaded files
3. **IAM User** with S3 permissions

## AWS Setup

### 1. Create S3 Bucket

1. Go to AWS S3 Console
2. Create a new bucket (e.g., `pandoo-chat-files`)
3. Choose your preferred region (e.g., `ap-south-1`)
4. Configure bucket settings:
   - Block all public access: **Enabled** (for security)
   - Versioning: Optional
   - Encryption: **Enabled** (recommended)

### 2. Create IAM User

1. Go to AWS IAM Console
2. Create a new user (e.g., `pandoo-file-upload`)
3. Attach the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

4. Create access keys for the user

### 3. Environment Variables

Add these to your `.env.local` file:

```bash
# AWS Configuration for S3 File Uploads
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_access_key_here
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_secret_key_here
NEXT_PUBLIC_S3_BUCKET_NAME=your-s3-bucket-name
```

## Features

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, TXT, DOC, DOCX, XLS, XLSX
- **Archives**: ZIP, RAR
- **Audio**: MP3, WAV, OGG
- **Video**: MP4, AVI, MOV, WMV

### File Size Limit
- **Maximum**: 50MB per file

### Security Features
- **Presigned URLs**: Secure upload/download without exposing credentials
- **User Isolation**: Files are stored in user-specific folders
- **Access Control**: Only authenticated users can upload/download

## How It Works

1. **File Selection**: User clicks "Attach" button and selects a file
2. **Validation**: File type and size are validated
3. **Upload**: File is uploaded to S3 using presigned URLs
4. **Message**: A file message is sent to the chat
5. **Download**: Other users can click to download the file

## File Storage Structure

```
your-s3-bucket/
├── uploads/
│   ├── user-id-1/
│   │   ├── timestamp_randomid1.jpg
│   │   └── timestamp_randomid2.pdf
│   └── user-id-2/
│       └── timestamp_randomid3.docx
```

## Troubleshooting

### Common Issues

1. **"Access Denied" errors**
   - Check IAM user permissions
   - Verify bucket name in environment variables

2. **"Invalid credentials" errors**
   - Verify AWS access keys
   - Check region configuration

3. **Upload failures**
   - Check file size (max 50MB)
   - Verify file type is supported
   - Check network connectivity

### Debug Mode

Enable console logging by checking the browser console for:
- File validation messages
- Upload progress updates
- S3 operation results

## Security Considerations

1. **Never expose AWS credentials** in client-side code
2. **Use presigned URLs** for secure file access
3. **Implement file type validation** on both client and server
4. **Consider implementing virus scanning** for uploaded files
5. **Set up S3 bucket policies** to restrict access

## Cost Optimization

1. **Lifecycle policies**: Automatically delete old files
2. **Storage classes**: Use appropriate S3 storage classes
3. **Monitoring**: Set up CloudWatch alerts for costs
4. **Compression**: Consider compressing large files before upload
