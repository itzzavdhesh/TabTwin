// Coordinates the TabTwin popup screens for idle, active session, and settings states.
import React, { useEffect, useState } from 'react';
import AICommandInput from './AICommandInput.jsx';
import GuestList from './GuestList.jsx';
import SessionControls from './SessionControls.jsx';

const DEFAULT_STATE = {
  session: null,
  guests: [],
  activityLog: [],
  settings: {
    allowAgentClick: false,
    allowAgentType: false,
    allowAgentNavigate: false,
    enableAiOnboarding: false
  }
};

export default function Popup() {
  // TODO: Add dark mode to popup UI.
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState('idle');
  const [state, setState] = useState(DEFAULT_STATE);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'popup:get-state' }, (response) => {
      const next = response || DEFAULT_STATE;
      setState(next);
      setScreen(next.session ? 'active' : 'idle');
    });
  }, []);

  function send(type, payload = {}) {
    return new Promise((resolve) => chrome.runtime.sendMessage({ type, payload }, resolve));
  }

  async function startSession() {
  setBusy(true);
  setError(null);
  try {
    const response = await send('session:start');
    if (response?.session) {
      setState((current) => ({ ...current, session: response.session, activityLog: response.activityLog || [] }));
      setScreen('active');
    } else {
      setError(response?.activityLog?.[0]?.message ?? 'Failed to start session. Is the server running?');
    }
  } catch (err) {
    setError(err.message ?? 'Unexpected error. Please try again.');
  } finally {
    setBusy(false);
  }
}

  async function endSession() {
    const response = await send('session:end');
    setState(response || DEFAULT_STATE);
    setScreen('idle');
  }

  async function revokeControl(guestId) {
    const response = await send('control:revoke', { guestId });
    if (response) setState(response);
  }

  async function runAgent(command) {
    const response = await send('agent:run', { command });
    if (response) setState(response);
  }

  async function saveSettings(settings) {
    const response = await send('settings:save', settings);
    if (response) setState(response);
    setScreen(state.session ? 'active' : 'idle');
  }

  if (screen === 'settings') {
    return <Settings state={state} onBack={() => setScreen(state.session ? 'active' : 'idle')} onSave={saveSettings} />;
  }

  return (
    <main className="min-h-[540px] bg-slate-50 p-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">TabTwin</h1>
          <p className="mt-1 text-sm text-slate-600">Ghost cursor collaboration for Chrome tabs.</p>
        </div>
        <button className="rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200" onClick={() => setScreen('settings')} type="button">
          Settings
        </button>
      </header>

      {!state.session ? (
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm leading-6 text-slate-600">Start a session, share the link, and watch your guest appear as a ghost cursor in the active tab.</p>
          <button className="mt-5 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-400" disabled={busy} onClick={startSession} type="button">
            {busy ? 'Starting...' : 'Start Session'}
          </button>
          {error && (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          )}
          <p className="mt-3 text-xs text-slate-500">Settings include AI keys and agent permissions.</p>
        </section>
      ) : (
        <section className="mt-5 space-y-4">
          <SessionControls session={state.session} onEnd={endSession} />
          <GuestList guests={state.guests} onRevoke={revokeControl} />
          <AICommandInput onRun={runAgent} />
          <ActivityLog items={state.activityLog} />
        </section>
      )}
    </main>
  );
}

function Settings({ state, onBack, onSave }) {
  const [settings, setSettings] = useState(state.settings || DEFAULT_STATE.settings);

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="min-h-[540px] bg-slate-50 p-4">
      <button className="text-sm font-semibold text-slate-600" onClick={onBack} type="button">Back</button>
      <h1 className="mt-3 text-2xl font-bold text-slate-950">Settings</h1>

      <div className="mt-5 space-y-3">
        <Toggle label="Allow agent to click" checked={settings.allowAgentClick} onChange={(value) => update('allowAgentClick', value)} />
        <Toggle label="Allow agent to type" checked={settings.allowAgentType} onChange={(value) => update('allowAgentType', value)} />
        <Toggle label="Allow agent to navigate tabs" checked={settings.allowAgentNavigate} onChange={(value) => update('allowAgentNavigate', value)} />
        <Toggle label="Enable AI onboarding for guests" checked={settings.enableAiOnboarding} onChange={(value) => update('enableAiOnboarding', value)} />
      </div>
      <button className="mt-6 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white" onClick={() => onSave(settings)} type="button">
        Save Settings
      </button>
      <button className="mt-3 w-full rounded-md border border-red-200 px-4 py-3 text-sm font-semibold text-red-700" onClick={() => chrome.runtime.sendMessage({ type: 'settings:clear-session' })} type="button">
        Clear Session Data
      </button>
    </main>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800">
      {label}
      <input className="h-5 w-5 accent-teal-600" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ActivityLog({ items = [] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">Live activity</h2>
      <ul className="mt-3 space-y-2 text-xs text-slate-600">
        {(items.length ? items : [{ message: 'No activity yet.' }]).slice(0, 5).map((item, index) => (
          <li key={`${item.message}-${index}`}>{item.message}</li>
        ))}
      </ul>
    </section>
  );
}
