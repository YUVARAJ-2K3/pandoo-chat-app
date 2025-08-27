import React from 'react';
import { getFileIcon, formatFileSize } from '../lib/s3';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  uploadProgress?: number;
  isUploading?: boolean;
}

export function FilePreview({ file, onRemove, uploadProgress, isUploading }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/');
  const fileIcon = getFileIcon(file.type);
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '12px',
      marginBottom: '16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Upload Progress Bar */}
      {isUploading && uploadProgress !== undefined && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: '#e9ecef'
        }}>
          <div style={{
            height: '100%',
            width: `${uploadProgress}%`,
            backgroundColor: '#007bff',
            transition: 'width 0.3s ease',
            borderRadius: '0 2px 2px 0'
          }} />
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* File Icon/Preview */}
        {isImage ? (
          <div style={{ position: 'relative' }}>
            <img 
              src={URL.createObjectURL(file)} 
              alt="Preview" 
              style={{ 
                width: '60px', 
                height: '60px', 
                objectFit: 'cover',
                borderRadius: '8px',
                border: '2px solid #e9ecef'
              }} 
            />
            {isUploading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {uploadProgress}%
              </div>
            )}
          </div>
        ) : (
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#007bff',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white',
            border: '2px solid #e9ecef'
          }}>
            {fileIcon}
          </div>
        )}
        
        {/* File Information */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#212529',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {fileIcon} {file.name}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#6c757d',
            marginBottom: '8px'
          }}>
            {formatFileSize(file.size)} • {file.type}
          </div>
          {isUploading && (
            <div style={{
              fontSize: '12px',
              color: '#007bff',
              fontWeight: '500'
            }}>
              {uploadProgress === 100 ? 'Processing...' : 'Uploading...'}
            </div>
          )}
        </div>
        
        {/* Remove Button */}
        {!isUploading && (
          <button
            onClick={onRemove}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc3545',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              fontSize: '18px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8d7da';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Remove file"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
