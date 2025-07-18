import { useEffect, useRef, useState } from 'react';
import TypingText, { TypingTextRef } from './TypingText';

const DEVELOPER_MESSAGE = `
You are an AI assistant integrated into a retro terminal interface. 
Keep responses concise and technical when appropriate. 
Maintain a slightly mysterious, hacker-like tone befitting the matrix aesthetic.
Be helpful but authentic to the terminal environment.

FORMAT RULES:
- Always insert 2 line breaks between major paragraphs and sections.
- NEVER EVER put punctuation inside quotes. Wrong: "object." Correct: "object".
- If a sentence ends with a quote, put the period AFTER the closing quote: She said "hello".
- Do NOT use asterisks (*), underscores (_), or backticks (\`) for formatting — just plain text.
- Use dash-based bullet points (-) for lists.
- Avoid Markdown, code blocks, and any characters not suited for a terminal display.
- NEVER use the ">" symbol — it is reserved for user input and prompt prefixing.
- When asked to provide a summary, always begin with the label: Summary:.
- Keep summaries structured and readable — use either short paragraphs or simple dash bullets if appropriate.
- When solving a math or logic problem, show clean step-by-step reasoning when necessary and always label the final result clearly using the prefix: Final answer:.
- Use plain line breaks to separate steps, and avoid excessive explanation.

Keep your responses clean and readable.`;

// Types for file management
type ProcessedChunk = {
  text: string;
  filename: string;
};

type FileInfo = {
  filename: string;
  file_type: string;
  uploaded_at: string;
  chunks_count: number;
  file_size: number;
  processed_chunks: ProcessedChunk[];
};

export default function TerminalBox() {
  const [userInput, setUserInput] = useState('');
  const [userIP, setUserIP] = useState('user.location');
  const [initialPrompt, setInitialPrompt] = useState<string[]>([]);
  const [messages, setMessages] = useState<{type: string, content: string[], id: number}[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const MAX_WORDS = 400;
  const [isResponding, setIsResponding] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showInitialPrompt, setShowInitialPrompt] = useState(true);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputDisplayRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeTypingRefs = useRef<Set<TypingTextRef>>(new Set());
  const typingRef = useRef<TypingTextRef>(null);

  // Fetch user's real IP address and mask it for privacy
  useEffect(() => {
    const maskIP = (ip: string): string => {
      const parts = ip.split('.');
      if (parts.length === 4) {
        // Show first two octets, hide last two with strikethrough style
        return `${parts[0]}.${parts[1]}.█████.█████`;
      }
      return 'unknown.location';
    };

    const fetchUserIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const realIP = data.ip;
        const maskedIP = maskIP(realIP);
        setUserIP(maskedIP);
        
        const newPrompt = [
          `Wake up, ${maskedIP}..`,
          'This is your prompt. Use it wisely.',
          '',
          'Type "cmd:help" to see available commands.',
        ];
        setInitialPrompt(newPrompt);
        
        // Initialize messages with the masked IP
        setMessages([{ type: 'system', content: newPrompt, id: 0 }]);
        setIsTyping(true); // Start typing animation
        
        console.log('User IP fetched and masked:', realIP, '->', maskedIP);
      } catch (error) {
        console.warn('Failed to fetch real IP, using fallback:', error);
        // Keep default IP and initialize messages
        const fallbackPrompt = [
          'Wake up, user..',
          'This is your prompt. Use it wisely.',
          '',
          'Type "cmd:help" to see available commands.'
        ];
        setMessages([{ type: 'system', content: fallbackPrompt, id: 0 }]);
        setIsTyping(true);
      }
    };

    fetchUserIP();
  }, []);

  // Auto-scroll to bottom when new messages are added or when responding
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isResponding]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  // Auto-scroll input display to bottom when user types
  useEffect(() => {
    if (inputDisplayRef.current) {
      inputDisplayRef.current.scrollTop = inputDisplayRef.current.scrollHeight;
    }
  }, [userInput]);

  const focusInput = () => {
    console.log('focusInput called');
    if (hiddenInputRef.current) {
      try {
        hiddenInputRef.current.focus();
        hiddenInputRef.current.click(); // Sometimes needed for mobile
        console.log('Input focused and clicked');
      } catch (error) {
        console.error('Error focusing input:', error);
      }
    } else {
      console.warn('hiddenInputRef.current is null');
    }
  };

  const handleInitialPromptDone = () => {
    console.log('Initial prompt completed');
    setShowInitialPrompt(false);
    setIsTyping(false);
    // Auto-focus after the initial prompt is done
    focusInput();
  };

  const handleTypingStart = () => {
    console.log('Typing started');
    setIsTyping(true);
  };

  const handleTypingDone = () => {
    console.log('Typing done');
    setIsTyping(false);
    // Re-focus the input after any typing animation finishes
    focusInput();
  };

  // Emergency recovery - reset typing state if stuck
  const handleEmergencyReset = () => {
    console.log('Emergency reset triggered');
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Cancel any ongoing typing animation
    if (typingRef.current) {
      typingRef.current.cancel();
    }
    
    // Reset states
    setIsTyping(false);
    setIsResponding(false);
    setUserInput('');
    
    // Add reset message
    const resetMessage = { 
      type: 'system' as const, 
      content: ['[SYSTEM RESET]', '', 'Terminal ready for input.'], 
      id: messageIdRef.current++ 
    };
    setMessages(prev => [...prev, resetMessage]);
    
    // Focus input
    setTimeout(() => {
      const input = document.querySelector('input') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  };

  // Helper function to register typing ref
  const registerTypingRef = (ref: TypingTextRef | null) => {
    if (ref) {
      activeTypingRefs.current.add(ref);
    }
  };

  // Helper function to unregister typing ref
  const unregisterTypingRef = (ref: TypingTextRef | null) => {
    if (ref) {
      activeTypingRefs.current.delete(ref);
    }
  };

  const callChatAPI = async (userMessage: string): Promise<string> => {
    console.log('Making API call with message:', userMessage);
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer_message: DEVELOPER_MESSAGE,
          user_message: userMessage,
          model: 'gpt-4.1-mini',
          uploaded_files: uploadedFiles  // Pass all uploaded file data
        }),
        signal: abortController.signal, // Add abort signal
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if this is a special response type (upload_request, file_list, etc.)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json();
        
        // Handle file deletion updates
        if (jsonResponse.type === 'file_deleted' && jsonResponse.updated_files) {
          setUploadedFiles(jsonResponse.updated_files);
        }
        
        if (jsonResponse.type === 'upload_request') {
          return jsonResponse.message;
        } else if (jsonResponse.type === 'file_list' || 
                   jsonResponse.type === 'file_deleted' || 
                   jsonResponse.type === 'supported_files' ||
                   jsonResponse.type === 'help' ||
                   jsonResponse.type === 'error') {
          return jsonResponse.message;
        }
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      console.log('Starting to read stream...');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        console.log('Received chunk:', chunk);
      }

      console.log('Final result length:', result.length);
      console.log('Final result (raw):', JSON.stringify(result));
      console.log('Final result (display):', result);
      const trimmed = result.trim();
      console.log('Trimmed result:', JSON.stringify(trimmed));
      
      if (!trimmed) {
        throw new Error('Empty response received from server');
      }
      
      return trimmed;
    } catch (error) {
      // Handle cancelled requests (from reset button)
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled by user');
      }
      
      // Handle network connectivity issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      }
      
      // Handle timeout or connection errors
      if (error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      // Re-throw other errors as-is
      throw error;
    } finally {
      // Clear the abort controller reference when done
      abortControllerRef.current = null;
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    console.log('Uploading file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`/api/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.file_info) {
        // Check if file already exists
        const existingFileIndex = uploadedFiles.findIndex(f => f.filename === result.file_info.filename);
        
        if (existingFileIndex >= 0) {
          // Replace existing file
          const newFiles = [...uploadedFiles];
          newFiles[existingFileIndex] = result.file_info;
          setUploadedFiles(newFiles);
        } else {
          // Add new file
          setUploadedFiles(prev => [...prev, result.file_info]);
        }
        
        return result.message;
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Upload failed due to network error');
    }
  };

  const triggerFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // Accept multiple file types - matches backend SUPPORTED_EXTENSIONS
    input.accept = '.pdf,.txt,.py,.js,.ts,.tsx,.jsx,.md,.json,.csv,.html,.css,.yml,.yaml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsResponding(true);
        
        // Add a processing message
        const processingMessage = { 
          type: 'response' as const, 
          content: [`Processing file: ${file.name}...`, '', 'Please wait while the document is indexed.'], 
          id: messageIdRef.current++ 
        };
        setMessages(prev => [...prev, processingMessage]);
        
        try {
          const result = await uploadFile(file);
          
          // Add success message
          const successMessage = { 
            type: 'response' as const, 
            content: [result], 
            id: messageIdRef.current++ 
          };
          setMessages(prev => [...prev, successMessage]);
        } catch (error) {
          console.error('File upload error:', error);
          
          const errorLines = [
            'FILE UPLOAD FAILED',
            '',
            error instanceof Error ? error.message : 'Unknown error occurred',
            '',
            'Please try again with a different file.'
          ];
          
          const errorMessage = { 
            type: 'error' as const, 
            content: errorLines, 
            id: messageIdRef.current++ 
          };
          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsResponding(false);
        }
      }
    };
    input.click();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && userInput.trim() && !isResponding && !isTyping) {
      const userMessage = userInput.trim();
      setUserInput('');
      
      // Check for cmd: prefix commands
      const userMessageLower = userMessage.toLowerCase();
      
      // Upload command - handle directly in frontend
      if (userMessageLower === 'cmd:upload') {
              // Add user message
      const newUserMessage = { 
        type: 'user' as const, 
        content: [userMessage], 
        id: messageIdRef.current++ 
      };
      setMessages(prev => [...prev, newUserMessage]);
        
        // Trigger file upload
        triggerFileUpload();
        return;
      }
      
      // All other cmd: commands are handled by backend
      // Regular chat messages (without cmd: prefix) go to LLM
      
      setIsResponding(true);
      
      // Add user message
      const newUserMessage = { 
        type: 'user' as const, 
        content: [userMessage], 
        id: messageIdRef.current++ 
      };
      setMessages(prev => [...prev, newUserMessage]);
      
      try {
        // Make actual API call
        const response = await callChatAPI(userMessage);
        console.log('About to add response message:', response);
        
        if (!response || response.trim() === '') {
          throw new Error('Empty response received from server');
        }
        
        // Split response into lines while preserving intentional spacing
        const responseLines = response.split('\n');
        
        // Clean up excessive empty lines but preserve paragraph spacing
        const cleanedLines: string[] = [];
        let consecutiveEmpty = 0;
        
        for (let i = 0; i < responseLines.length; i++) {
          const line = responseLines[i];
          const trimmedLine = line.trim();
          
          if (trimmedLine === '') {
            consecutiveEmpty++;
            // Allow up to 2 consecutive empty lines for paragraph spacing
            if (consecutiveEmpty <= 2) {
              cleanedLines.push('');
            }
          } else {
            consecutiveEmpty = 0;
            cleanedLines.push(line);
          }
        }
        
        // Remove trailing empty lines
        while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') {
          cleanedLines.pop();
        }
        
        const finalLines = cleanedLines.length > 0 ? cleanedLines : [response];
        console.log('Original response:', JSON.stringify(response));
        console.log('Final lines for typing:', finalLines);
        
        const newResponseMessage = { 
          type: 'response' as const, 
          content: finalLines, 
          id: messageIdRef.current++ 
        };
        console.log('Response lines for TypingText:', responseLines);
        console.log('Adding message to state:', newResponseMessage);
        setMessages(prev => {
          const newMessages = [...prev, newResponseMessage];
          console.log('New messages state:', newMessages);
          return newMessages;
        });
      } catch (error) {
        console.error('Handling error in terminal:', error);
        
        // Determine error type and create appropriate message
        let errorMessage: string;
        let errorLines: string[];
        
        if (error instanceof Error && error.message.includes('Request cancelled by user')) {
          // Don't show error for user-initiated cancellation
          return;
        } else if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
          errorMessage = 'CONNECTION_ERROR';
          errorLines = [
            'NETWORK CONNECTION FAILED',
            '',
            'Unable to establish connection to the server.',
            'Please check your internet connection and try again.',
            '',
            'If the problem persists, the backend service may be down.'
          ];
        } else if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            errorMessage = 'TIMEOUT_ERROR';
            errorLines = [
              'REQUEST TIMEOUT',
              '',
              'The server took too long to respond.',
              'Please try again or check your connection.'
            ];
          } else if (error.message.includes('Empty response')) {
            errorMessage = 'EMPTY_RESPONSE_ERROR';
            errorLines = [
              'EMPTY RESPONSE RECEIVED',
              '',
              'The server responded but sent no data.',
              'Please try again.'
            ];
          } else {
            errorMessage = 'API_ERROR';
            errorLines = [
              'API ERROR',
              '',
              error.message,
              '',
              'Please try again or contact support if the issue persists.'
            ];
          }
        } else {
          errorMessage = 'UNKNOWN_ERROR';
          errorLines = [
            'UNKNOWN ERROR OCCURRED',
            '',
            'An unexpected error happened.',
            'Please try again.'
          ];
        }
        
        const newErrorMessage = { 
          type: 'error' as const, 
          content: errorLines, 
          id: messageIdRef.current++ 
        };
        setMessages(prev => [...prev, newErrorMessage]);
      } finally {
        setIsResponding(false);
        // Focus will be handled by handleTypingDone when the error typing completes
      }
    }
  };

  // Keyboard shortcut for emergency reset (Ctrl+R or Cmd+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && (isTyping || isResponding)) {
        e.preventDefault();
        console.log('Manual reset triggered via Ctrl+R');
        handleEmergencyReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, isResponding]);

  // Determine if input should be disabled
  const isInputDisabled = isResponding || isTyping;

  // Auto-focus when input becomes available
  useEffect(() => {
    if (!isInputDisabled && !showInitialPrompt) {
      focusInput();
    }
  }, [isInputDisabled, showInitialPrompt]);

  // Focus input when ready (mobile keyboard fix)
  useEffect(() => {
    if (!isInputDisabled && !showInitialPrompt) {
      // Delay to ensure DOM is ready
      setTimeout(() => {
        focusInput();
      }, 500);
    }
  }, [isInputDisabled, showInitialPrompt]);

  return (
    <div 
      className="w-full mx-auto px-4 py-4" 
      style={{ 
        height: '70vh',
        maxWidth: '600px',
      }}
    >
      <div
        className="bg-black border border-green-500 mx-auto flex flex-col"
        style={{
          borderRadius: '8px',
          backdropFilter: 'brightness(0.7)',
          boxShadow: '0 0 20px rgba(0,255,65,0.4), inset 0 0 20px rgba(0,255,65,0.2)',
          height: '100%',
          margin: '0 16px',
          overflow: 'hidden',
        }}
      >
        {/* Window Title Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(0,255,65,0.3)',
            background: 'rgba(0,255,65,0.05)',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            color: '#00ff41',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Window controls decoration */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4444', opacity: 0.7 }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffaa00', opacity: 0.7 }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff41', opacity: 0.7 }}></div>
            </div>
            <span style={{ marginLeft: '8px', opacity: 0.8 }}>TERMINAL_v2.1</span>
          </div>
          
          {/* Ukrainian Donation Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open('https://u24.gov.ua/', '_blank');
            }}
            style={{
              background: 'transparent',
              border: '1px solid #00ff41',
              color: '#00ff41',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'Courier New, monospace',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00ff41';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#00ff41';
            }}
            title="Support Ukraine 🇺🇦"
          >
            <span style={{ fontSize: '10px' }}>🇺🇦</span>
            <span>×</span>
          </button>
        </div>

        {/* Terminal Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            minHeight: 0, // Important for flex layouts
          }}
        >
          {/* Scrollable content area */}
          <div 
            ref={scrollAreaRef}
            style={{ 
              flex: 1,
              overflowY: 'auto',
              fontFamily: 'Courier New, monospace',
              fontSize: '16px',
              lineHeight: '1.4',
              color: '#00ff41',
              minHeight: 0, // Important for flex scrolling
            }}
          >
            {messages.map((message) => (
              <div key={message.id} style={{ marginBottom: '12px' }}>
                {message.type === 'system' && showInitialPrompt && (
                  <TypingText
                    ref={registerTypingRef}
                    lines={message.content as string[]}
                    onDone={() => {
                      handleInitialPromptDone();
                    }}
                    onStart={handleTypingStart}
                    onUpdate={scrollToBottom}
                    speed={50}
                  />
                )}
                
                {message.type === 'system' && !showInitialPrompt && (
                  <div 
                    className="typing-text" 
                    style={{ 
                      wordBreak: 'break-word', 
                      whiteSpace: 'pre-wrap',
                      userSelect: 'text'
                    }}
                  >
                    {(message.content as string[]).map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
                
                {message.type === 'user' && (
                  <div style={{ 
                    wordBreak: 'break-word', 
                    whiteSpace: 'pre-wrap',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ marginRight: '8px', flexShrink: 0 }}>{'>'}</span>
                    <span>{message.content}</span>
                  </div>
                )}
                
                {message.type === 'response' && (
                  <div style={{ 
                    wordBreak: 'break-word', 
                    whiteSpace: 'pre-wrap',
                    marginTop: '8px'
                  }}>
                    <TypingText
                      ref={registerTypingRef}
                      lines={(() => {
                        console.log('Rendering response message:', message.content);
                        const lines = message.content as string[];
                        console.log('Lines to pass to TypingText:', lines);
                        console.log('Lines type:', typeof lines, Array.isArray(lines));
                        return lines;
                      })()}
                      onStart={handleTypingStart}
                      onDone={handleTypingDone}
                      onUpdate={scrollToBottom}
                      speed={30}
                    />
                  </div>
                )}

                {message.type === 'error' && (
                  <div style={{ 
                    wordBreak: 'break-word', 
                    whiteSpace: 'pre-wrap',
                    marginTop: '8px',
                    color: '#ff4444'
                  }}>
                    <TypingText
                      ref={registerTypingRef}
                      lines={message.content as string[]}
                      onStart={handleTypingStart}
                      onDone={handleTypingDone}
                      onUpdate={scrollToBottom}
                      speed={30}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isResponding && (
              <div style={{ 
                color: '#00ff41',
                fontStyle: 'italic',
                opacity: 0.7
              }}>
                <TypingText
                  ref={registerTypingRef}
                  lines={['thinking...']}
                  onStart={handleTypingStart}
                  onUpdate={scrollToBottom}
                  speed={100}
                />
              </div>
            )}
          </div>

          {/* Emergency reset button - only show if stuck (but not during initial prompt) */}
          {(isTyping || isResponding) && !showInitialPrompt && (
            <div style={{ 
              fontSize: '12px', 
              color: '#ff4444', 
              marginBottom: '8px',
              textAlign: 'center',
              opacity: 0.7
            }}>
              <button
                onClick={handleEmergencyReset}
                style={{
                  background: 'transparent',
                  border: '1px solid #ff4444',
                  color: '#ff4444',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                Reset (Ctrl+R)
              </button>
              <div style={{ marginTop: '4px', fontSize: '10px' }}>
                System stuck? Click to reset or press Ctrl+R
              </div>
            </div>
          )}

          {/* Fixed input area at bottom */}
          <div 
            style={{ 
              flexShrink: 0, // Don't shrink this area
              borderTop: '1px solid rgba(0,255,65,0.3)',
              // padding: '12px 0',
              paddingTop: '8px',
              marginTop: '12px',
              position: 'relative',
              opacity: isInputDisabled ? 0.5 : 1
            }}
            onTouchStart={(e) => {
              // Only focus when touching the input area
              console.log('Input area touched');
              e.stopPropagation();
              focusInput();
            }}
            onClick={(e) => {
              // Only focus when clicking the input area
              console.log('Input area clicked');
              e.stopPropagation();
              focusInput();
            }}
          >
            {/* Hidden input for keyboard handling */}
            <input
              ref={hiddenInputRef}
              value={userInput}
              onChange={e => {
                const newValue = e.target.value;
                const wordCount = newValue.trim().split(/\s+/).filter(word => word.length > 0).length;
                
                // Only update if within word limit or if deleting
                if (wordCount <= MAX_WORDS || newValue.length < userInput.length) {
                  setUserInput(newValue);
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={isInputDisabled}
              style={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0,
                pointerEvents: 'none',
              }}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            
            {/* Visual input display */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start',
              fontFamily: 'Courier New, monospace',
              fontSize: '16px',
              lineHeight: '1.4',
              color: '#00ff41',
              minHeight: '1.2em',
            }}>
              <span style={{ marginRight: '8px', flexShrink: 0 }}>{'>'}</span>
              <div 
                ref={inputDisplayRef}
                style={{ 
                  flex: 1,
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  minHeight: '1.4em',
                  maxHeight: '6.4em', // Allow more lines
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {userInput}
                {!isInputDisabled && (
                  <span 
                    style={{ 
                      animation: 'blink 1s infinite',
                      color: '#00ff41',
                    }}
                  >
                    _
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

