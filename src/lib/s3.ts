import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET_NAME!;

// Debug logging
console.log('[S3] Client configuration:', {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-1',
  hasAccessKey: !!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  bucketName: BUCKET_NAME,
  accessKeyPreview: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID?.substring(0, 10) + '...'
});

export interface FileUploadResult {
  success: boolean;
  fileKey?: string;
  downloadUrl?: string;
  error?: string;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

// Generate a unique file key for S3
export function generateFileKey(file: File, userId: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop() || '';
  return `uploads/${userId}/${timestamp}_${randomId}.${extension}`;
}

// Get presigned upload URL
export async function getPresignedUploadUrl(
  fileKey: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    console.log('[S3] Generating presigned URL for:', { fileKey, contentType, bucket: BUCKET_NAME });
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    console.log('[S3] Generated presigned URL successfully');
    return url;
  } catch (error) {
    console.error('[S3] Error generating presigned URL:', error);
    throw error;
  }
}

// Get presigned download URL
export async function getPresignedDownloadUrl(
  fileKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Upload file to S3 using presigned URL
export async function uploadFileToS3(
  file: File,
  fileKey: string,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> {
  try {
    console.log('[S3] Starting upload for file:', file.name, 'to key:', fileKey);
    console.log('[S3] File type:', file.type, 'File size:', file.size);
    
    // Get presigned upload URL
    console.log('[S3] Getting presigned upload URL...');
    const uploadUrl = await getPresignedUploadUrl(fileKey, file.type);
    console.log('[S3] Got presigned URL:', uploadUrl.substring(0, 100) + '...');
    
    // Upload file using fetch with progress tracking
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          console.log('[S3] Upload progress:', progress + '%');
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        console.log('[S3] XHR load event, status:', xhr.status);
        if (xhr.status === 200) {
          console.log('[S3] Upload successful, getting download URL...');
          // Get download URL
          getPresignedDownloadUrl(fileKey).then(downloadUrl => {
            console.log('[S3] Got download URL:', downloadUrl.substring(0, 100) + '...');
            resolve({
              success: true,
              fileKey,
              downloadUrl,
            });
          });
        } else {
          console.error('[S3] Upload failed with status:', xhr.status);
          resolve({
            success: false,
            error: `Upload failed with status: ${xhr.status}`,
          });
        }
      });

      xhr.addEventListener('error', (error) => {
        console.error('[S3] XHR error event:', error);
        resolve({
          success: false,
          error: 'Upload failed due to network error',
        });
      });

      xhr.addEventListener('abort', () => {
        console.log('[S3] XHR abort event');
        resolve({
          success: false,
          error: 'Upload was aborted',
        });
      });

      console.log('[S3] Opening XHR connection to:', uploadUrl.substring(0, 100) + '...');
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      console.log('[S3] Sending file...');
      xhr.send(file);
    });
  } catch (error) {
    console.error('[S3] Error in uploadFileToS3:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Validate file before upload
export function validateFile(file: File): string | null {
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  
  if (file.size > maxSize) {
    return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit`;
  }
  
  // Check if it's an image or common file type
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not supported`;
  }
  
  return null;
}

// Get file icon based on type
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
  if (fileType.includes('text')) return '📄';
  return '📎';
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
