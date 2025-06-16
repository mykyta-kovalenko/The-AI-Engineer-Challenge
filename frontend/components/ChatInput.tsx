import BlinkingCursor from './BlinkingCursor';

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  disabled?: boolean;
  showCursor?: boolean;
};

export default function ChatInput({ 
  value, 
  onChange, 
  onSubmit, 
  disabled, 
  showCursor = true 
}: ChatInputProps) {
  return (
    <div className="flex items-baseline font-mono text-lg" style={{ color: '#00ff41' }}>
      <span className="mr-1">{'>'}</span>
      <div className="flex-1 relative">
        <input
          className="terminal-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && value.trim() && !disabled) {
              onSubmit(value);
            }
          }}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            caretColor: 'transparent',
            color: '#00ff41',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        />
        <span className="absolute left-0 top-0 pointer-events-none">
          {value}
          {showCursor && <BlinkingCursor />}
        </span>
      </div>
    </div>
  );
}
