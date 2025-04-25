// ============================================================================
// Chatbot Footer - Message Bar - Camera
// ============================================================================
import React from 'react';

// Import PatternFly components
import { Button, ButtonProps, DropEvent, Icon, Tooltip, TooltipProps } from '@patternfly/react-core';
import { useDropzone } from 'react-dropzone';
import { CameraIcon } from '@patternfly/react-icons/dist/esm/icons/camera-icon';

export interface CameraButtonProps extends ButtonProps {
  /** Callback for when button is clicked */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback function for CameraButton when a picture is taken */
  onCameraAccepted?: (data: File[], event: DropEvent) => void;
  /** Class name for CameraButton */
  className?: string;
  /** Props to control if the CameraButton should be disabled */
  isDisabled?: boolean;
  /** Props to control the PF Tooltip component */
  tooltipProps?: Omit<TooltipProps, 'content'>;
  /** Ref applied to CameraButton and used in tooltip */
  innerRef?: React.Ref<any>;
  /** English text "Camera" used in the tooltip */
  tooltipContent?: string;
  /** Test id applied to input */
  inputTestId?: string;
}

const CameraButtonBase: React.FunctionComponent<CameraButtonProps> = ({
  onCameraAccepted,
  onClick,
  isDisabled,
  className,
  tooltipProps,
  innerRef,
  tooltipContent = 'Camera',
  inputTestId,
  ...props
}: CameraButtonProps) => {
  const { open, getInputProps } = useDropzone({
    multiple: true,
    onDropAccepted: onCameraAccepted
  });

  return (
    <>
      {/* this is required for react-dropzone to work in Safari and Firefox */}
      <input data-testid={inputTestId} {...getInputProps()} hidden />
      <Tooltip
        id="pf-chatbot__tooltip--attach"
        content={tooltipContent}
        position="top"
        entryDelay={tooltipProps?.entryDelay || 0}
        exitDelay={tooltipProps?.exitDelay || 0}
        distance={tooltipProps?.distance || 8}
        animationDuration={tooltipProps?.animationDuration || 0}
        // prevents VO announcements of both aria label and tooltip
        aria="none"
        {...tooltipProps}
      >
        <Button
          variant="plain"
          ref={innerRef}
          className={`pf-chatbot__button--attach ${className ?? ''}`}
          aria-label={props['aria-label'] || 'Camera button'}
          isDisabled={isDisabled}
          onClick={onClick ?? open}
          icon={
            <Icon iconSize="xl" isInline>
              <CameraIcon />
            </Icon>
          }
          {...props}
        />
      </Tooltip>
    </>
  );
};

export const CameraButton = React.forwardRef((props: CameraButtonProps, ref: React.Ref<any>) => (
  <CameraButtonBase innerRef={ref} {...props} />
));
