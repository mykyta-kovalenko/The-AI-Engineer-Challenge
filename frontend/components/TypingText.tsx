import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

type TypingTextProps = {
  lines: string[];
  onDone?: () => void;
  onStart?: () => void;
  onUpdate?: () => void;
  speed?: number;
};

export type TypingTextRef = {
  cancel: () => void;
};

const TypingText = forwardRef<TypingTextRef, TypingTextProps>(({ 
  lines, 
  onDone, 
  onStart,
  onUpdate,
  speed = 50 
}, ref) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  // Expose cancel function to parent
  useImperativeHandle(ref, () => ({
    cancel: () => {
      console.log('TypingText: Cancel requested');
      isCancelledRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }));

  useEffect(() => {
    console.log('TypingText: Starting with lines:', lines);
    
    // Reset cancellation flag
    isCancelledRef.current = false;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset state
    setDisplayText('');
    setIsComplete(false);
    
    // Join all lines into one text with line breaks
    const fullText = lines.join('\n');
    console.log('TypingText: Full text to type:', JSON.stringify(fullText));
    
    if (!fullText) {
      console.log('TypingText: No text to type');
      return;
    }

    let currentIndex = 0;
    let hasStarted = false;

    const typeNextChar = () => {
      // Check if cancelled
      if (isCancelledRef.current) {
        console.log('TypingText: Typing cancelled');
        return;
      }
      
      console.log(`TypingText: Typing char ${currentIndex} of ${fullText.length}`);
      
      if (!hasStarted) {
        hasStarted = true;
        console.log('TypingText: Calling onStart');
        onStart?.();
      }

      if (currentIndex >= fullText.length) {
        console.log('TypingText: Typing complete');
        setIsComplete(true);
        onDone?.();
        return;
      }

      const nextChar = fullText[currentIndex];
      console.log('TypingText: Adding char:', JSON.stringify(nextChar));
      
      setDisplayText(prev => {
        const newText = prev + nextChar;
        console.log('TypingText: New display text:', JSON.stringify(newText));
        return newText;
      });
      
      onUpdate?.();
      currentIndex++;
      
      timeoutRef.current = setTimeout(typeNextChar, speed);
    };

    // Start typing after a small delay
    console.log('TypingText: Starting typing in 100ms');
    timeoutRef.current = setTimeout(typeNextChar, 100);

    // Cleanup
    return () => {
      console.log('TypingText: Cleanup');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [lines.join('|'), speed]); // Using | as separator to avoid conflicts

  console.log('TypingText: Rendering with displayText:', JSON.stringify(displayText));

  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {displayText}
    </div>
  );
});

TypingText.displayName = 'TypingText';

export default TypingText;
