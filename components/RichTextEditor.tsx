import React, { useRef, useState } from 'react';
import { Bold, Underline, Strikethrough, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (openTag: string, closeTag: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + openTag + selectedText + closeTag + text.substring(end);
    
    onChange(newText);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, end + openTag.length);
    }, 0);
  };

  const onEmojiClick = (emojiObject: any) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, start) + emojiObject.emoji + text.substring(end);
    onChange(newText);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emojiObject.emoji.length, start + emojiObject.emoji.length);
    }, 0);
  };

  return (
    <div className="border border-wedding-300 rounded bg-white focus-within:ring-1 focus-within:ring-wedding-500 focus-within:border-wedding-500 relative">
      <div className="bg-wedding-50 border-b border-wedding-200 p-2 flex items-center gap-2 relative">
        <button
          type="button"
          onClick={() => insertTag('<b>', '</b>')}
          className="p-1.5 text-wedding-700 hover:bg-wedding-200 rounded transition-colors"
          title="Negrito"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => insertTag('<u>', '</u>')}
          className="p-1.5 text-wedding-700 hover:bg-wedding-200 rounded transition-colors"
          title="Sublinhado"
        >
          <Underline size={16} />
        </button>
        <button
          type="button"
          onClick={() => insertTag('<s>', '</s>')}
          className="p-1.5 text-wedding-700 hover:bg-wedding-200 rounded transition-colors"
          title="Riscado"
        >
          <Strikethrough size={16} />
        </button>
        <div className="w-px h-6 bg-wedding-300 mx-1"></div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 text-wedding-700 hover:bg-wedding-200 rounded transition-colors"
            title="Emojis"
          >
            <Smile size={16} />
          </button>

          {showEmojiPicker && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setShowEmojiPicker(false)}></div>
              <div className="absolute top-full left-0 mt-2 z-[100] shadow-2xl">
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  autoFocusSearch={false}
                  width={300}
                  height={400}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border-none focus:ring-0 resize-y min-h-[120px] bg-transparent rounded-b"
        placeholder={placeholder}
      />
    </div>
  );
};
