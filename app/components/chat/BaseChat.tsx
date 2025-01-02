/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { Message } from 'ai';
import React, { type RefCallback, useCallback, useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { MODEL_LIST, PROVIDER_LIST, initializeModelList } from '~/utils/constants';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import { APIKeyManager, getApiKeysFromCookies } from './APIKeyManager';
import Cookies from 'js-cookie';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useTranslations } from '~/lib/hooks/useTranslations';

import styles from './BaseChat.module.scss';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { ImportButtons } from '~/components/chat/chatExportAndImport/ImportButtons';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import GitCloneButton from './GitCloneButton';

import FilePreview from './FilePreview';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import type { IProviderSetting, ProviderInfo } from '~/types/model';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { toast } from 'react-toastify';
import StarterTemplates from './StarterTemplates';
import type { ActionAlert } from '~/types/actions';
import ChatAlert from './ChatAlert';
import { LLMManager } from '~/lib/modules/llm/manager';

const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  messages?: Message[];
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  providerList?: ProviderInfo[];
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (props, ref) => {
    const t = useTranslations();
    const TEXTAREA_MAX_HEIGHT = props.chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState<Record<string, string>>(getApiKeysFromCookies());
    const [modelList, setModelList] = useState(MODEL_LIST);
    const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [transcript, setTranscript] = useState('');
    const [isModelLoading, setIsModelLoading] = useState<string | undefined>('all');

    const getProviderSettings = useCallback(() => {
      let providerSettings: Record<string, IProviderSetting> | undefined = undefined;

      try {
        const savedProviderSettings = Cookies.get('providers');

        if (savedProviderSettings) {
          const parsedProviderSettings = JSON.parse(savedProviderSettings);

          if (typeof parsedProviderSettings === 'object' && parsedProviderSettings !== null) {
            providerSettings = parsedProviderSettings;
          }
        }
      } catch (error) {
        console.error('Error loading Provider Settings from cookies:', error);

        // Clear invalid cookie data
        Cookies.remove('providers');
      }

      return providerSettings;
    }, []);
    useEffect(() => {
      console.log(transcript);
    }, [transcript]);

    useEffect(() => {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          setTranscript(transcript);

          if (props.handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            props.handleInputChange(syntheticEvent);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    }, []);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const providerSettings = getProviderSettings();
        let parsedApiKeys: Record<string, string> | undefined = {};

        try {
          parsedApiKeys = getApiKeysFromCookies();
          setApiKeys(parsedApiKeys);
        } catch (error) {
          console.error('Error loading API keys from cookies:', error);

          // Clear invalid cookie data
          Cookies.remove('apiKeys');
        }
        setIsModelLoading('all');
        initializeModelList({ apiKeys: parsedApiKeys, providerSettings })
          .then((modelList) => {
            // console.log('Model List: ', modelList);
            setModelList(modelList);
          })
          .catch((error) => {
            console.error('Error initializing model list:', error);
          })
          .finally(() => {
            setIsModelLoading(undefined);
          });
      }
    }, [props.providerList]);

    const onApiKeysChange = async (providerName: string, apiKey: string) => {
      const newApiKeys = { ...apiKeys, [providerName]: apiKey };
      setApiKeys(newApiKeys);
      Cookies.set('apiKeys', JSON.stringify(newApiKeys));

      const provider = LLMManager.getInstance(import.meta.env || process.env || {}).getProvider(providerName);

      if (provider && provider.getDynamicModels) {
        setIsModelLoading(providerName);

        try {
          const providerSettings = getProviderSettings();
          const staticModels = provider.staticModels;
          const dynamicModels = await provider.getDynamicModels(
            newApiKeys,
            providerSettings,
            import.meta.env || process.env || {},
          );

          setModelList((preModels) => {
            const filteredOutPreModels = preModels.filter((x) => x.provider !== providerName);
            return [...filteredOutPreModels, ...staticModels, ...dynamicModels];
          });
        } catch (error) {
          console.error('Error loading dynamic models:', error);
        }
        setIsModelLoading(undefined);
      }
    };

    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    const handleSendMessage = (event: React.UIEvent, messageInput?: string) => {
      if (props.sendMessage) {
        props.sendMessage(event, messageInput);

        if (recognition) {
          recognition.abort(); // Stop current recognition
          setTranscript(''); // Clear transcript
          setIsListening(false);

          // Clear the input by triggering handleInputChange with empty value
          if (props.handleInputChange) {
            const syntheticEvent = {
              target: { value: '' },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            props.handleInputChange(syntheticEvent);
          }
        }
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            props.setUploadedFiles?.([...props.uploadedFiles, file]);
            props.setImageDataList?.([...props.imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              props.setUploadedFiles?.([...props.uploadedFiles, file]);
              props.setImageDataList?.([...props.imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    return (
      <div className={styles.container} ref={ref}>
        <div className="flex h-full">
          <ClientOnly>{() => <Menu />}</ClientOnly>
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto" ref={props.scrollRef}>
              {props.messages && props.messages.length > 0 ? (
                <Messages ref={props.messageRef} messages={props.messages} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <ExamplePrompts />
                  <StarterTemplates />
                </div>
              )}
            </div>

            <div className="border-t border-bolt-elements-border">
              {props.actionAlert && <ChatAlert alert={props.actionAlert} clearAlert={props.clearAlert} />}

              <div className="container mx-auto max-w-3xl">
                <div className="flex flex-col gap-4 p-4 pt-2">
                  <div className="flex flex-wrap gap-2">
                    {props.uploadedFiles.map((file, index) => (
                      <FilePreview
                        key={index}
                        file={file}
                        onRemove={() => {
                          const newFiles = [...props.uploadedFiles];
                          newFiles.splice(index, 1);
                          props.setUploadedFiles?.(newFiles);

                          const newDataList = [...props.imageDataList];
                          newDataList.splice(index, 1);
                          props.setImageDataList?.(newDataList);
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <textarea
                        ref={props.textareaRef}
                        className={classNames(
                          'w-full rounded-lg border border-bolt-elements-border bg-bolt-elements-background-depth-2 px-3 py-2 outline-none placeholder:text-bolt-elements-text-muted focus:border-bolt-elements-border-focus',
                          styles.textarea,
                        )}
                        rows={1}
                        placeholder={t.chat.placeholder}
                        value={props.input}
                        onChange={props.handleInputChange}
                        onPaste={handlePaste}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleSendMessage(event);
                          }
                        }}
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <IconButton
                        title={t.chat.uploadFile}
                        className="transition-all"
                        onClick={() => handleFileUpload()}
                      >
                        <div className="i-ph:paperclip text-xl" />
                      </IconButton>

                      {props.enhancePrompt && (
                        <IconButton
                          title={t.chat.enhancePrompt}
                          className="transition-all"
                          onClick={props.enhancePrompt}
                          disabled={props.enhancingPrompt || !props.input}
                        >
                          <div className="i-ph:sparkle text-xl" />
                        </IconButton>
                      )}

                      {props.isStreaming ? (
                        <IconButton
                          title={t.chat.stopGeneration}
                          className="transition-all"
                          onClick={props.handleStop}
                        >
                          <div className="i-ph:stop-circle text-xl" />
                        </IconButton>
                      ) : (
                        <SendButton onClick={handleSendMessage} disabled={!props.input && !props.uploadedFiles.length} />
                      )}

                      <SpeechRecognitionButton
                        onStart={startListening}
                        onStop={stopListening}
                        disabled={!recognition}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <ModelSelector
                        model={props.model}
                        setModel={props.setModel}
                        provider={props.provider}
                        setProvider={props.setProvider}
                        providerList={props.providerList}
                      />

                      <APIKeyManager
                        provider={props.provider}
                        onApiKeysChange={onApiKeysChange}
                      />
                    </div>

                    <div className="flex gap-2">
                      <ExportChatButton onClick={props.exportChat} />
                      <ImportButtons onImport={props.importChat} />
                      <GitCloneButton />
                      <ScreenshotStateManager />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
