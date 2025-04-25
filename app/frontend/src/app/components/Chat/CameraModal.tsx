import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((mediaStream) => {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        })
        .catch((err) => {
          setError('Unable to access camera');
        });
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setError(null);
    }
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.png`, { type: 'image/png' });
          onCapture(file);
          onClose();
        }
      }, 'image/png');
    }
  };

  return (
    <Modal
      title="Take a picture"
      isOpen={isOpen}
      onClose={onClose}
      variant={ModalVariant.small}>
      <ModalHeader title="Add a picture to the conversation" labelId="variant-modal-title" />
      <ModalBody id="modal-box-body-variant">
      {error ? (
        <div>{error}</div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: 300 }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}
      </ModalBody>
      <ModalFooter>
          <Button key="confirm" variant="primary" onClick={handleCapture}>
            Take the picture!
          </Button>
          <Button key="cancel" variant="link" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
    </Modal>

  );
};

export default CameraModal;
