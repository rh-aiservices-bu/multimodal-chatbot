import { faCommentDots } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Flex, FlexItem, Grid, GridItem, PageSection, Stack, StackItem, Content, ContentVariants, Bullseye, DropEvent } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Query } from './classes';
import ChatAnswer, { ChatAnswerRef } from './ChatAnswer'
import githubLogo from '@app/assets/bgimages/github-mark.svg';
import githubLogoWhite from '@app/assets/bgimages/github-mark-white.svg';
import starLogo from '@app/assets/bgimages/star.svg';
import starLogoWhite from '@app/assets/bgimages/star-white.svg';
import { ChatbotFooter, } from '@patternfly/chatbot/dist/dynamic/ChatbotFooter';
import { MessageBarCamera } from './MessageBarCamera';
import { AttachmentEdit, Chatbot, ChatbotAlert, ChatbotDisplayMode, ChatbotHeader, ChatbotHeaderActions, ChatbotHeaderMain, ChatbotHeaderTitle, FileDetailsLabel, FileDropZone, PreviewAttachment } from '@patternfly/chatbot';
import CameraModal from './CameraModal';

interface ModalData {
  code: string;
  fileName: string;
}

interface ChatProps {
}

/**
 * Represents the Chat component.
 *
 * @component
 * @param {Object} props - The component props.
 * @returns {JSX.Element} The rendered Chat component.
 */
const Chat: React.FunctionComponent<ChatProps> = () => {

  const [isDarkTheme, setIsDarkTheme] = React.useState<boolean>(document.documentElement.classList.contains('pf-v6-theme-dark'));
  React.useEffect(() => {
    // Create a MutationObserver to watch for changes to the class list of the body element
    const observer = new MutationObserver(() => {
      setIsDarkTheme(document.documentElement.classList.contains('pf-v6-theme-dark'));
    });

    // Observe the body element for class attribute changes
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Cleanup the observer when the component unmounts
    return () => observer.disconnect();
  }, []);

  // ChatAnswer Refs
  const childRefs = React.useRef<(ChatAnswerRef | null)[]>([]);

  // Maximum number of ChatAnswer instances
  const searchParams = new URLSearchParams(window.location.search);
  const maxChats = parseInt(searchParams.get('maxchat') || '4', 10);

  // ChatAnswer instances
  const [items, setItems] = React.useState<JSX.Element[]>([
    <ChatAnswer key={1} ref={(el) => (childRefs.current[1] = el)} />
  ]);
  const addItem = () => {
    if (items.length < maxChats) {
      const newItem = (
        <ChatAnswer key={items.length + 1} ref={(el) => (childRefs.current[items.length + 1] = el)} />
      );
      setItems([...items, newItem]);
    }
  };
  const removeItem = () => {
    setItems(items.slice(0, -1));
  };
  const resetChats = () => {
    childRefs.current.forEach((childRef) => {
      if (childRef) {
        childRef.resetMessageHistory();
      }
    });
  };

  //i18n
  const { t, i18n } = useTranslation();

  // Fetch GitHub stars and forks 
  const [repoStars, setRepoStars] = React.useState<number | null>(null);
  React.useEffect(() => {
    fetch('https://api.github.com/repos/rh-aiservices-bu/multimodal-chatbot')
      .then((response) => response.json())
      .then((data) => {
        setRepoStars(data.stargazers_count);
      })
      .catch((error) => {
        console.error('Failed to fetch GitHub stars:', error);
      });
  }, []);

  // Chat elements
  const [error, setError] = React.useState<string>();
  const [file, setFile] = React.useState<File>();
  const [isLoadingFile, setIsLoadingFile] = React.useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState<boolean>(false);
  const [currentModalData, setCurrentModalData] = React.useState<ModalData>();
  const [showAlert, setShowAlert] = React.useState<boolean>(false);

  // Ref for the hidden camera input
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // Camera modal state
  const [isCameraModalOpen, setIsCameraModalOpen] = React.useState(false);

  const readFile = (file: File) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
      // you can use reader.readAsText(file) for human-readable file types;
    });

  // handle file drop/selection
  const handleFile = (fileArr: File[]) => {
    setIsLoadingFile(true);
    // any custom validation you may want
    if (fileArr.length > 1) {
      setShowAlert(true);
      setFile(undefined);
      setError('Uploaded more than one file.');
      return;
    }
    // this is 25MB in bytes; size is in bytes
    if (fileArr[0].size > 25000000) {
      setShowAlert(true);
      setFile(undefined);
      setError('File is larger than 25MB.');
      return;
    }

    readFile(fileArr[0])
      .then((data) => {
        // eslint-disable-next-line no-console
        setFile(fileArr[0]);
        setShowAlert(false);
        setError(undefined);
        // this is just for demo purposes, to make the loading state really obvious
        setTimeout(() => {
          setIsLoadingFile(false);
        }, 1000);
      })
      .catch((error: DOMException) => {
        setError(`Failed to read file: ${error.message}`);
      });
  };

  const handleFileDrop = (event: DropEvent, data: File[]) => {
    handleFile(data);
  };

  const handleAttach = (data: File[]) => {
    handleFile(data);
  };

  const onClose = () => {
    setFile(undefined);
  };

  /**
   * Sends the query text to the server via WebSocket.
   * Saves the previous response, sources, query, and message history, and create a new Message History from them.
   * Clears the query text, previous response, and previous sources.
   * If the query text is empty, sets the previous response to ['Please enter a query...'].
   */
  const handleSendMessage = (message: string | number) => {
    const query = new Query(message as string, i18n.language, new Date());
    if (file) {
      query.file = file;
    }

    if (message !== "" || file) {
      childRefs.current.forEach((childRef) => {
        if (childRef) {
          childRef.sendQuery(query);
        }
      });
    }
    setFile(undefined);
    setIsLoadingFile(false);
    setShowAlert(false);
    setError(undefined);
  }

  // Utility to detect mobile devices
  function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  }

  function handleCamera(event: React.MouseEvent<HTMLButtonElement>): void {
    if (isMobileDevice()) {
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
        cameraInputRef.current.click();
      }
    } else {
      setIsCameraModalOpen(true);
    }
  }

  // Handle file selection from camera modal
  const handleCameraModalCapture = (file: File) => {
    handleFile([file]);
  };

  // Handle file selection from camera
  const handleCameraFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFile(Array.from(event.target.files));
    }
  };

  return (
    <PageSection hasBodyWrapper={false}
      className='chat-page'>
      <Flex direction={{ default: 'column' }}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Chat Window */}
        <FlexItem style={{ flex: 1, minHeight: 0 }}>
          <Chatbot displayMode={ChatbotDisplayMode.embedded} className='chat'>
            <ChatbotHeader className='chat-header'>
              <ChatbotHeaderMain>
                <ChatbotHeaderTitle className='chat-header-title'>
                  <Bullseye>
                    <Content>
                      <Content component={ContentVariants.h3} className='chat-header-title'>
                        <FontAwesomeIcon icon={faCommentDots} />&nbsp;{t('chat.title')}
                      </Content>
                    </Content>
                  </Bullseye>
                </ChatbotHeaderTitle>
              </ChatbotHeaderMain>
              <ChatbotHeaderActions>
                <Flex>
                  <FlexItem>
                    <Button onClick={addItem} variant="primary">
                      Add LLM
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button onClick={removeItem} variant="danger" isDisabled={items.length === 1}>
                      Remove last LLM
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button onClick={resetChats} variant="danger" isDisabled={items.length === 0}>
                      Reset Chat(s)
                    </Button>
                  </FlexItem>
                </Flex>
              </ChatbotHeaderActions>
            </ChatbotHeader>

            <Grid hasGutter
              className="chat-grid">
              {items.map((item, index) => (
                <GridItem key={index} className='chat-grid-item' span={Math.floor(12 / (items.length)) as any}>
                  {/* ChatAnswer component */}
                  {item}
                </GridItem>
              ))}
            </Grid>
            
              <ChatbotFooter className='chat-footer'>
                {showAlert && (
                  <ChatbotAlert
                    variant="danger"
                    title={t('chat.error')}
                    onClose={() => setShowAlert(false)}
                  >
                    {error}
                  </ChatbotAlert>
                )}
                {file && (
                  <div>
                    <FileDetailsLabel fileName={file.name} isLoading={isLoadingFile} onClose={onClose} />
                  </div>
                )}
                <FileDropZone onFileDrop={handleFileDrop}>
                  {/* Hidden input for camera capture (mobile) */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleCameraFileChange}
                  />
                  <MessageBarCamera
                    hasMicrophoneButton
                    hasCameraButton
                    hasAttachButton={true}
                    handleAttach={handleAttach}
                    handleCamera={handleCamera}
                    onSendMessage={handleSendMessage}
                    buttonProps={{
                      microphone: { language: t('language_code') }
                    }}
                  />
                  <CameraModal
                    isOpen={isCameraModalOpen}
                    onClose={() => setIsCameraModalOpen(false)}
                    onCapture={handleCameraModalCapture}
                    displayMode={ChatbotDisplayMode.embedded}
                  />
                </FileDropZone>
              </ChatbotFooter>
          </Chatbot>
        </FlexItem>
        <FlexItem>
          <Stack>
            {/* Disclaimer section */}
            <StackItem>
              <Content component="p" className='chat-disclaimer'>{t('chat.disclaimer1')} {t('chat.disclaimer2')}<br />
                PoC App by <a href='http://red.ht/cai-team' target='_blank'>red.ht/cai-team</a>&nbsp;&nbsp;-&nbsp;&nbsp;
                <a href='https://github.com/rh-aiservices-bu/multimodal-chatbot' target='_blank'>Source</a>&nbsp;&nbsp;
                <img src={isDarkTheme ? githubLogoWhite : githubLogo} alt="GitHub Logo" style={{ height: '15px', marginRight: '0.5rem', verticalAlign: 'text-top' }} />
                <span style={{ textDecoration: 'none', color: 'inherit' }}>{repoStars !== null ? `${repoStars}` : ''}&nbsp;</span>
                {repoStars !== null &&
                  <img src={isDarkTheme ? starLogoWhite : starLogo} alt="Star Logo" style={{ height: '15px', marginRight: '0.5rem', verticalAlign: 'text-top' }} />
                }
              </Content>
            </StackItem>
          </Stack>
        </FlexItem>
      </Flex>
    </PageSection>
  );
}

export { Chat };
