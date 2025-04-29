// ============================================================================
// Preview Attachment - Chatbot Image Viewer
// ============================================================================
import React from 'react';
import { ChatbotDisplayMode } from '@patternfly/chatbot/src/Chatbot';
import ImageModal from './ImageModal';

export interface PreviewImageAttachmentProps {
  /** Text shown in code editor */
  base64Image: string;
  /** Filename, including extension, of file shown in modal */
  fileName: string;
  /** Function called when dismiss button is clicked */
  onDismiss?: (event: React.MouseEvent | MouseEvent | KeyboardEvent) => void;
  /** Function called when modal is toggled */
  handleModalToggle: (event: React.MouseEvent | MouseEvent | KeyboardEvent) => void;
  /** Whether modal is open */
  isModalOpen: boolean;
  /** Display mode for the Chatbot parent; this influences the styles applied */
  displayMode?: ChatbotDisplayMode;
}

export const PreviewImageAttachment: React.FunctionComponent<PreviewImageAttachmentProps> = ({
  fileName,
  base64Image,
  handleModalToggle,
  isModalOpen,
  onDismiss = undefined,
  displayMode = ChatbotDisplayMode.default,
}: PreviewImageAttachmentProps) => {

  const handleDismiss = (_event: React.MouseEvent | MouseEvent | KeyboardEvent) => {
    handleModalToggle(_event);
    onDismiss && onDismiss(_event);
  };

  return (
    <ImageModal
      fileName={fileName}
      base64Image={base64Image}
      isOpen={isModalOpen}
      onClose={handleDismiss}
      displayMode={displayMode}
    />
  );
};

export default PreviewImageAttachment;
