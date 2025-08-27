import React, { useState } from 'react';
import { getFileIcon, formatFileSize, getPresignedDownloadUrl } from '../lib/s3';

interface FileMessageProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  mediaKey: string;
  isMyMessage: boolean;
}

export function FileMessage({ fileName, fileSize, fileType, mediaKey, isMyMessage }: FileMessageProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileIcon = getFileIcon(fileType);
  const isImage = fileType.startsWith('image/');
  
  const handleDownload = async () => {
    if (downloadUrl) {
      // If we already have a download URL, use it
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.click();
      return;
    }
    
    setIsDownloading(true);
    try {
      // Get fresh download URL
      const url = await getPresignedDownloadUrl(mediaKey);
      setDownloadUrl(url);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error('Failed to get download URL:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: isMyMessage ? '#007bff' : '#f8f9fa',
      border: `1px solid ${isMyMessage ? '#0056b3' : '#e9ecef'}`,
      borderRadius: '16px',
      maxWidth: '400px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative'
    }}
    onMouseEnter={(e) => {
      if (!isMyMessage) {
        e.currentTarget.style.backgroundColor = '#e9ecef';
      }
    }}
    onMouseLeave={(e) => {
      if (!isMyMessage) {
        e.currentTarget.style.backgroundColor = '#f8f9fa';
      }
    }}
    onClick={handleDownload}
    title="Click to download"
    >
      {/* File Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: isMyMessage ? 'rgba(255, 255, 255, 0.2)' : '#007bff',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: isMyMessage ? 'white' : 'white'
        }}>
          {fileIcon}
        </div>
        
        {/* File Info */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: isMyMessage ? 'white' : '#212529',
            marginBottom: '2px',
            wordBreak: 'break-word'
          }}>
            {fileName}
          </div>
          <div style={{
            fontSize: '12px',
            color: isMyMessage ? 'rgba(255, 255, 255, 0.8)' : '#6c757d'
          }}>
            {formatFileSize(fileSize)} • {fileType}
          </div>
        </div>
      </div>
      
      {/* Download Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          fontSize: '12px',
          color: isMyMessage ? 'rgba(255, 255, 255, 0.8)' : '#6c757d',
          fontStyle: 'italic'
        }}>
          {isDownloading ? 'Preparing download...' : 'Click to download'}
        </div>
        
        {isDownloading && (
          <div style={{
            width: '16px',
            height: '16px',
            border: `2px solid ${isMyMessage ? 'rgba(255, 255, 255, 0.3)' : '#e9ecef'}`,
            borderTop: `2px solid ${isMyMessage ? 'white' : '#007bff'}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}
      </div>
      
      {/* Image Preview (if it's an image) */}
      {isImage && mediaKey && (
        <div style={{
          marginTop: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: isMyMessage ? 'rgba(255, 255, 255, 0.8)' : '#6c757d',
            marginBottom: '8px'
          }}>
            📷 Image Preview
          </div>
        </div>
      )}
    </div>
  );
}
