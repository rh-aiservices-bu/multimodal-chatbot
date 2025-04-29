import React, {  } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { ChatbotDisplayMode, ChatbotModal } from '@patternfly/chatbot';

interface ImageModalProps {
  isOpen: boolean;
  onClose: (_event: React.MouseEvent | MouseEvent | KeyboardEvent) => void;
  fileName?: string;
  base64Image?: string;
  displayMode?: ChatbotDisplayMode;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, fileName, base64Image, displayMode }) => {

  return (
    <ChatbotModal
      title={fileName}
      isOpen={isOpen}
      onClose={onClose}
      variant={ModalVariant.small}
      displayMode={displayMode}>
      <ModalHeader title={fileName} labelId="variant-modal-title" />
      <ModalBody id="modal-box-body-variant">
        {base64Image ? (
          <img
            src={base64Image}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', margin: '0 auto' }}
          />
        ) : (
          <div>No image available</div>
        )}
      </ModalBody>
      <ModalFooter>
          <Button key="close" variant="link" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
    </ChatbotModal>

  );
};

export default ImageModal;
