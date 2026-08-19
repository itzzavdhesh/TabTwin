// Collapsible in-session chat overlay with ephemeral messages and emoji reactions.
import React, { useEffect, useRef, useState } from 'react';

const REACTION_EMOJIS = ['👍', '😂', '❤️', '👀', '🎉'];

export default function ChatPanel({ session }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const messages = session.chatMessages ?? [];
  const unreadCount = session.unreadChatCount ?? 0;

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (next) session.markChatRead();
      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    session.sendChatMessage(trimmed);
    setDraft('');
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {open ? (
        <div className="flex h-96 w-80 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
            <p className="text-sm font-semibold text-slate-950">Session chat</p>
            <button
              aria-label="Close chat"
              className="text-slate-400 hover:text-slate-600"
              onClick={toggle}
              type="button"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2" ref={listRef}>
            {messages.length === 0 ? (
              <p className="text-xs text-slate-400">No messages yet. Say hi!</p>
            ) : (
              messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  onReact={(emoji) => session.sendChatReaction(message.id, emoji)}
                />
              ))
            )}
          </div>
          <form
            className="flex items-center gap-2 border-t border-slate-200 p-2"
            onSubmit={handleSubmit}
          >
            <input
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none ring-teal-500 focus:ring-2"
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              value={draft}
            />
            <button
              className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!draft.trim()}
              type="submit"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
      <button
        aria-label="Toggle chat"
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-xl text-white shadow-lg hover:bg-slate-800"
        onClick={toggle}
        type="button"
      >
        💬
        {!open && unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function ChatBubble({ message, onReact }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div
      className="group relative rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800"
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
              className="rounded-full bg-white px-1.5 py-0.5 text-xs"
              key={`${reaction.emoji}-${index}`}
              title={reaction.senderName}
            >
              {reaction.emoji}
            </span>
          ))}
        </div>
      ) : null}
      {showPicker ? (
        <div className="absolute -top-9 right-0 flex gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-md">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              className="text-sm transition-transform hover:scale-125"
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
