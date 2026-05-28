// Captures host AI agent commands and sends them to the TabTwin background worker.
import React, { useState } from 'react';

export default function AICommandInput({ onRun }) {
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!command.trim()) return;
    setBusy(true);
    await onRun(command.trim());
    setBusy(false);
    setCommand('');
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={submit}>
      <label className="text-sm font-semibold text-slate-950" htmlFor="agent-command">AI command</label>
      <textarea
        id="agent-command"
        className="mt-3 h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
        placeholder="Summarize these tabs and draft a reply in Gmail"
        value={command}
        onChange={(event) => setCommand(event.target.value)}
      />
      <button className="mt-3 w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={busy} type="submit">
        {busy ? 'Running...' : 'Run Agent'}
      </button>
    </form>
  );
}
