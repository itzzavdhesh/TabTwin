// Collapsible in-session chat panel for the host's TabTwin popup.
import React, { useEffect, useRef, useState } from 'react';

const REACTION_EMOJIS = ['👍', '😂', '❤️', '👀', '🎉'];

export default function ChatPanel({ messages = [], unreadCount = 0, onSend, onReact, onMarkRead }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (next) onMarkRead();
      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={toggle}
        type="button"
      >
        <span className="text-sm font-semibold text-slate-950">Session chat</span>
        <span className="flex items-center gap-2">
          {!open && unreadCount > 0 ? (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
          <span className="text-xs text-slate-400">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open ? (
        <div className="border-t border-slate-200 p-3">
          <div className="max-h-40 space-y-2 overflow-y-auto" ref={listRef}>
            {messages.length === 0 ? (
              <p className="text-xs text-slate-400">No messages yet.</p>
            ) : (
              messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  onReact={(emoji) => onReact(message.id, emoji)}
                />
              ))
            )}
          </div>
          <form className="mt-2 flex items-center gap-2" onSubmit={handleSubmit}>
            <input
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-950 outline-none ring-teal-500 focus:ring-2"
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              value={draft}
            />
            <button
              className="rounded-md bg-teal-600 px-2 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!draft.trim()}
              type="submit"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function ChatBubble({ message, onReact }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div
      className="relative rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-800"
      onMouseEnter={() => setShowPicker(true)}
      onMouseLeave={() => setShowPicker(false)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {message.senderName}
      </p>
      <p className="mt-0.5 break-words">{message.content}</p>
      {message.reactions?.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {message.reactions.map((reaction, index) => (
            <span
              className="rounded-full bg-white px-1 py-0.5 text-[10px]"
              key={`${reaction.emoji}-${index}`}
              title={reaction.senderName}
            >
              {reaction.emoji}
            </span>
          ))}
        </div>
      ) : null}
      {showPicker ? (
        <div className="absolute -top-7 right-0 flex gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-md">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              className="text-xs transition-transform hover:scale-125"
              key={emoji}
              onClick={() => onReact(emoji)}
              type="button"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
