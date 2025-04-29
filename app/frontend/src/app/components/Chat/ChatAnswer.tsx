import userAvatar from '@app/assets/bgimages/default-user.svg';
import orb from '@app/assets/bgimages/orb.svg';
import { useUser } from '@app/components/UserContext/UserContext';
import config from '@app/config';
import { ChatbotContent, ChatbotDisplayMode, Message, MessageBox } from '@patternfly/chatbot';
import { Content, Flex, FlexItem, FormSelect, FormSelectOption } from "@patternfly/react-core";
import React, { forwardRef, Ref, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Answer, MessageContent, MessageHistory, Models, Query } from './classes';
import { PreviewImageAttachment } from './PreviewImageAttachment'
import Emitter from '../../utils/emitter';

interface ChatAnswerProps {
}

export interface ChatAnswerRef {
  sendQuery: (query: Query) => void;
  resetMessageHistory: () => void;
}

const ChatAnswer = forwardRef((props: ChatAnswerProps, ref: Ref<ChatAnswerRef>) => {
  // Handles to receive messages from the parent component
  useImperativeHandle(ref, () => ({
    sendQuery(query) {
      sendQuery(query);
    },
    resetMessageHistory() {
      resetMessageHistory();
    }
  }));

  // User information
  const { userName } = useUser(); // Get the username from the context

  // Translation handling
  const { t, i18n } = useTranslation();
  const [userLanguage, setUserLanguage] = React.useState<string>(t('language_code'));

  React.useEffect(() => {
    const languageCode = t('language_code');
    if (languageCode !== userLanguage) {
      resetMessageHistory();
      setUserLanguage(languageCode);
    }
  }, [i18n, t]);

  // Models
  const [llms, setLlms] = React.useState<Models[]>([]); // The list of models
  const [selectedLLM, setSelectedLlm] = React.useState<string>(''); // The selected model

  // Load available models at startup
  React.useEffect(() => {
    const fetchLLMs = async () => {
      const response = await fetch(`${config.backend_api_url}/llms`);
      const data = await response.json();
      setLlms(data);
      setSelectedLlm(data[0].name);
    }
    fetchLLMs();
  }
    , []);

  // Handle model selection change
  const onChangeLlm = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    setSelectedLlm(value);
  }

  // Chat content initialization
  const [answer, setAnswer] = React.useState<Answer>(new Answer('', new Date())); // The answer text
  const [messageHistory, setMessageHistory] = React.useState<MessageHistory>(
    new MessageHistory([
      new MessageContent(new Answer(t('chat.content.greeting'), new Date())),
    ])
  ); // The message history

  // Stopwatch and timer for tokens stats
  const startTime = useRef<number | null>(null);
  const [tokens, setTokens] = React.useState<number>(0);
  const [ttft, setTtft] = React.useState<number>(0);
  const [tps, setTps] = React.useState<number>(0);

  // Websocket definition
  const wsUrl = config.backend_api_url.replace(/http/, 'ws').replace(/\/api$/, '/ws'); // WebSocket URL
  const connection = React.useRef<WebSocket | null>(null); // WebSocket connection
  const uuid = Math.floor(Math.random() * 1000000000); // Generate a random number between 0 and 999999999

  // Open the Websocket and listen for messages
  React.useEffect(() => {
    const ws = new WebSocket(wsUrl + '/query/' + uuid) || {};

    ws.onopen = () => {
      console.log('opened ws connection')
    }
    ws.onclose = (e) => {
      console.log('close ws connection: ', e.code, e.reason)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data['type'] === 'token') {
        setTokens((prevTokens) => {
          if (prevTokens === 1) {
            focusOnNewAnswer();
          }
          const newTokens = prevTokens + 1;
          if (newTokens === 1) {
            if (startTime.current !== null) {
              setTtft((Date.now() - startTime.current) / 1000);
            }

          }
          if (startTime.current !== null) {
            setTps(newTokens / ((Date.now() - startTime.current) / 1000));
          }
          return newTokens;
        });
        setAnswer(answer => new Answer(
          answer?.content + data['token'],
          answer?.timestamp || new Date()
        ));
        return;
      } else if (data['type'] === 'error') {
        Emitter.emit('notification', { variant: 'warning', title: 'LLM Error', description: data['message'] });
      }
    }

    connection.current = ws;

    // Clean up function
    return () => {
      if (connection.current) {
        connection.current.close();
        console.log('WebSocket connection closed');
      }
    };
  }, []);

  // Utility to convert a File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  /**
   * Sends the query text to the server via WebSocket.
   * Saves the previous response, sources, query, and message history, and create a new Message History from them.
   * Clears the query text, previous response, and previous sources.
   * If the query text is empty, sets the previous response to ['Please enter a query...'].
   */
  const sendQuery = async (query: Query) => {
    if (connection.current?.readyState === WebSocket.OPEN) {
      if (query.content !== "" || query.file !== null) { // Make sure we have something to send
        const previousAnswer = new MessageContent(
          new Answer(answer.content, answer.timestamp)
        );
        const previousQuery = new MessageContent(
          new Query(query.content, '', new Date(), query.file)
        );
        const previousMessageHistory = new MessageHistory(messageHistory.messages);
        setMessageHistory(new MessageHistory(
          [...previousMessageHistory.messages, previousAnswer, previousQuery]
        ));
        const previousFile = query.file;
        setAnswer(new Answer('', new Date()));
        setTokens(0);
        setTps(0);
        setTtft(0);

        // Build the messages object with base64 payloads if files are present
        const messages = await Promise.all(messageHistory.messages.map(async (message) => {
          if (message.messageContent.type === "Query") {
            const msgObj: any = {
              "role": "user",
            };
            if (message.messageContent.file) {
              const payload = await fileToBase64(message.messageContent.file);
              msgObj.content = [{
                "type": "text",
                "text": message.messageContent.content
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": payload,
                }
              }]
            } else {
              msgObj.content = message.messageContent.content;
            }
            return msgObj;
          } else if (message.messageContent.type === "Answer" && message.messageContent.content !== "") {
            return {
              "role": "assistant",
              "content": message.messageContent.content
            };
          }
          return null;
        }));
        // Add the last answer to the messages if not empty
        if (previousAnswer.messageContent.content !== "") {
          messages.push({ "role": "assistant", "content": (previousAnswer.messageContent.content) });
        }
        // Add the new query to the messages, with base64 payload if file present
        let newQueryMsg: any = { "role": "user" };
        if (query.file) {
          const payload = await fileToBase64(query.file);
          newQueryMsg.content = [{
            "type": "text",
            "text": query.content
          },
          {
            "type": "image_url",
            "image_url": {
              "url": payload,
            }
          }]
        } else {
          newQueryMsg.content = query.content;
        }
        messages.push(newQueryMsg);

        // Put the query in a JSON object to send to the server
        let data = {
          model: selectedLLM,
          messages: messages.filter((m) => m !== null),
          language: query.language
        };
        startTime.current = Date.now();
        connection.current?.send(JSON.stringify(data));
      }
    }
  }

  /**
   * Resets the message history and clears the previous response.
   * Sets the message history to a new Message History with a greeting message.
   */
  const resetMessageHistory = () => {
    setMessageHistory(new MessageHistory([
      new MessageContent(new Answer(t('chat.content.greeting'), new Date())),
    ]));
    setAnswer(new Answer('', new Date())); // Clear the previous response
  };


  // Scroll to the new answer handler
  const scrollToRef = React.useRef<HTMLDivElement>(null);
  const focusOnNewAnswer = () => {
    scrollToRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Copies the given content to the clipboard.
   * Uses the Clipboard API to write text to the clipboard.
   *
   * @param content - The text content to copy.
   */
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('Content copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy content: ', err);
    });
  };

  /**
   * Reads aloud the given content using the Web Speech API.
   * Supports different languages if specified.
   *
   * @param content - The text content to read aloud.
   */
  const readAloud = (content: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis is not supported in this browser.');
      return;
    }

    const language = t('language_code') || 'en-US';
    const synth = window.speechSynthesis;

    const speak = () => {
      synth.cancel();

      const voices = synth.getVoices();
      console.log('Available voices:', voices);

      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = language;
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.pitch = 1;

      // Find a voice that matches the desired language
      const matchingVoice = voices.find(v => v.lang.startsWith(language));

      if (matchingVoice) {
        utterance.voice = matchingVoice;
        console.log('Using voice:', matchingVoice.name);
      } else {
        console.warn(`No matching voice found for language: ${language}`);
      }

      synth.speak(utterance);
    };

    if (synth.getVoices().length !== 0) {
      speak();
    } else {
      synth.addEventListener('voiceschanged', speak, { once: true });
    }
  };

  // Attachment handling
  interface ModalData {
    base64Image: string;
    fileName: string;
  }

  const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState<boolean>(false);
  const [currentModalData, setCurrentModalData] = React.useState<ModalData>();

  const onClick = async (event: React.MouseEvent, name: string, id: string | number | undefined) => {
    if (typeof id !== 'number' || !messageHistory.messages[id]?.messageContent?.file) {
      console.error("Invalid message index or file not found for attachment click.");
      Emitter.emit('notification', { variant: 'danger', title: 'Error', description: 'Could not load attachment preview.' });
      return;
    }

    try {
      const base64String = await fileToBase64(messageHistory.messages[id].messageContent.file as File);
      setCurrentModalData({ fileName: name, base64Image: base64String });
      setIsPreviewModalOpen(true);
    } catch (error) {
      Emitter.emit('notification', { variant: 'danger', title: 'Error', description: 'Could not load attachment preview.' });
    }
  };


  return (
    <Flex direction={{ default: 'column' }} className='chat-item'>
      <FlexItem >
        <Flex direction={{ default: 'row' }} className='chat-llm-select'>
          <Content component='h3' className='model-title'>Model:</Content>
          <FormSelect
            value={selectedLLM}
            onChange={onChangeLlm}
            aria-label="FormSelect Input"
            ouiaId="BasicFormSelectCategory"
            className='chat-llm-select'
          >
            {llms && llms.map((llm, index) => (
              <FormSelectOption key={index} value={llm.name} label={llm.name} />
            ))}
          </FormSelect>
          <Content className='chat-llm-stats'>
            {ttft !== 0 && (
              <Content component="p" className='chat-llm-stats'>{ttft.toFixed(2)}s tft,</Content>
            )}
            {tps !== 0 && (
              <Content component="p" className='chat-llm-stats'>{tps.toFixed(2)} t/s</Content>
            )}
          </Content>
        </Flex>
      </FlexItem>
      <FlexItem className='chat-bot-answer'>
        <ChatbotContent className='chat-bot-answer-content'>
          <MessageBox className='chat-bot-answer-box'>
            {/* Message History rendering */}
            {messageHistory.messages.map((message: MessageContent, index) => {
              const renderMessage = () => {
                if (message.messageContent.content.length != 0) {
                  if ((message.messageContent.type === "Query" || message.messageContent.type === "Answer") && message.messageContent.content != "") {
                    return (
                      <Message
                        name={message.messageContent.type === "Query" ? userName : "Bot"}
                        role={message.messageContent.type === "Query" ? "user" : "bot"}
                        content={message.messageContent.content}
                        timestamp={message.messageContent.timestamp ? message.messageContent.timestamp.toLocaleString() : ''}
                        avatar={message.messageContent.type === "Query" ? userAvatar : orb}
                        attachments={message.messageContent.file ? [{ name: message.messageContent.file?.name ?? "", id: index, onClick }] : undefined}
                        actions={{
                          copy: {
                            onClick: () => copyToClipboard(
                              message.messageContent.content
                            )
                          },
                          listen: {
                            onClick: () => readAloud(
                              message.messageContent.content
                            )
                          }
                        }}
                      />
                    );
                  } else {
                    {/* If the message is of an unknown type */ }
                    return;
                  }
                } else {
                  {/* If the message is empty */ }
                  return;
                }
              }
              return (
                <React.Fragment key={index}>
                  {renderMessage()}
                </React.Fragment>
              );
            })}

            {/* New Answer rendering */}
            {answer.content !== "" && (
              <div ref={scrollToRef}>
                <Message
                  name="Bot"
                  role="bot"
                  content={(answer.content)}
                  timestamp={answer.timestamp ? answer.timestamp.toLocaleString() : ''}
                  avatar={orb}
                  actions={{
                    copy: {
                      onClick: () => copyToClipboard(
                        answer.content
                      )
                    },
                    listen: {
                      onClick: () => readAloud(
                        answer.content
                      )
                    }
                  }}
                />
              </div>
            )}
          </MessageBox>
          {currentModalData && (
            <PreviewImageAttachment
              displayMode={ChatbotDisplayMode.embedded}
              base64Image={currentModalData?.base64Image}
              fileName={currentModalData?.fileName}
              isModalOpen={isPreviewModalOpen}
              onDismiss={() => setCurrentModalData(undefined)}
              handleModalToggle={() => setIsPreviewModalOpen(false)}
            />
          )}
        </ChatbotContent>
      </FlexItem>
    </Flex>
  );
})

export default ChatAnswer;