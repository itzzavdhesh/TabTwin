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
    anthropicApiKey: '',
    allowAgentClick: false,
    allowAgentType: false,
    allowAgentNavigate: false
  },
  agentPlan: null,
  sessionStats: null,
  finalSummary: null
};

export default function Popup() {
  // TODO: Add dark mode to popup UI.
  const [screen, setScreen] = useState('idle');
  const [state, setState] = useState(DEFAULT_STATE);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'popup:get-state' }, (response) => {
      const next = response || DEFAULT_STATE;
      setState(next);
      setScreen(next.finalSummary ? 'summary' : (next.session ? 'active' : 'idle'));
    });

    const listener = (message) => {
      if (message.type === 'popup:state-changed' && message.payload) {
        setState(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  function send(type, payload = {}) {
    return new Promise((resolve) => chrome.runtime.sendMessage({ type, payload }, resolve));
  }

  async function startSession() {
    setBusy(true);
    const response = await send('session:start');
    setBusy(false);
    if (response?.session) {
      setState((current) => ({ ...current, session: response.session, activityLog: response.activityLog || [] }));
      setScreen('active');
    }
  }

  async function endSession() {
    const response = await send('session:end');
    if (response) {
      setState(response);
      setScreen('summary');
    }
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

  async function confirmAgentAction() {
    const response = await send('agent:confirm-action');
    if (response) setState(response);
  }

  async function skipAgentAction() {
    const response = await send('agent:skip-action');
    if (response) setState(response);
  }

  async function cancelAgentPlan() {
    const response = await send('agent:cancel-plan');
    if (response) setState(response);
  }

  async function closeSummary() {
    const response = await send('settings:clear-summary');
    if (response) {
      setState(response);
      setScreen('idle');
    }
  }

  function exportSummaryJSON() {
    if (!state.finalSummary) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.finalSummary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tabtwin-session-${state.finalSummary.sessionId}-summary.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  if (screen === 'settings') {
    return <Settings state={state} onBack={() => setScreen(state.session ? 'active' : 'idle')} onSave={saveSettings} />;
  }

  if (screen === 'summary' || state.finalSummary) {
    return <SessionSummary summary={state.finalSummary} onExport={exportSummaryJSON} onClose={closeSummary} />;
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
          <p className="mt-3 text-xs text-slate-500">Settings include AI keys and agent permissions.</p>
        </section>
      ) : (
        <section className="mt-5 space-y-4">
          <SessionControls session={state.session} onEnd={endSession} />
          <GuestList guests={state.guests} onRevoke={revokeControl} />
          <AICommandInput onRun={runAgent} />
          {state.agentPlan && (
            <AgentPlanStatus
              plan={state.agentPlan}
              onConfirm={confirmAgentAction}
              onSkip={skipAgentAction}
              onCancel={cancelAgentPlan}
            />
          )}
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
      <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="api-key">Claude API key</label>
      <input
        id="api-key"
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
        type="password"
        value={settings.anthropicApiKey}
        onChange={(event) => update('anthropicApiKey', event.target.value)}
        placeholder="sk-ant-..."
      />
      <div className="mt-5 space-y-3">
        <Toggle label="Allow agent to click" checked={settings.allowAgentClick} onChange={(value) => update('allowAgentClick', value)} />
        <Toggle label="Allow agent to type" checked={settings.allowAgentType} onChange={(value) => update('allowAgentType', value)} />
        <Toggle label="Allow agent to navigate tabs" checked={settings.allowAgentNavigate} onChange={(value) => update('allowAgentNavigate', value)} />
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

function AgentPlanStatus({ plan, onConfirm, onSkip, onCancel }) {
  if (!plan) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-950">AI Agent Plan</h2>
        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold tracking-wider ${
          plan.status === 'executing' ? 'bg-blue-100 text-blue-800' :
          plan.status === 'pending_confirmation' ? 'bg-amber-100 text-amber-800 animate-pulse' :
          plan.status === 'completed' ? 'bg-green-100 text-green-800' :
          'bg-slate-100 text-slate-800'
        }`}>
          {plan.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-xs text-slate-600 italic">"{plan.summary}"</p>
      
      <div className="max-h-40 overflow-y-auto space-y-2 mt-2">
        {plan.actions.map((action, idx) => {
          const isCurrent = idx === plan.currentIndex;
          const isExecuted = idx < plan.currentIndex;
          const conf = action.confidence ?? 1.0;
          
          let confColor = 'text-green-600 bg-green-50 border-green-200';
          if (conf < 0.6) confColor = 'text-red-600 bg-red-50 border-red-200';
          else if (conf < 0.8) confColor = 'text-yellow-600 bg-yellow-50 border-yellow-200';

          return (
            <div 
              key={idx} 
              className={`flex items-center justify-between rounded-md p-2 border text-xs ${
                isCurrent ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500' : 
                isExecuted ? 'border-slate-100 bg-slate-50/50 opacity-60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">
                  {idx + 1}. {action.type.toUpperCase()}
                </span>
                {action.selector && (
                  <span className="text-slate-500 font-mono text-[10px] max-w-[100px] truncate">
                    {action.selector}
                  </span>
                )}
                {action.url && (
                  <span className="text-slate-500 text-[10px] max-w-[100px] truncate">
                    {action.url}
                  </span>
                )}
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${confColor}`}>
                {(conf * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {plan.status === 'pending_confirmation' && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
          <p className="text-xs text-amber-800 font-medium">
            ⚠️ The next action is low-confidence. Please confirm to proceed.
          </p>
          <div className="flex gap-2">
            <button 
              className="flex-1 rounded bg-teal-600 hover:bg-teal-700 text-white px-2 py-1.5 text-xs font-semibold"
              onClick={onConfirm}
            >
              Confirm
            </button>
            <button 
              className="flex-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 px-2 py-1.5 text-xs font-semibold"
              onClick={onSkip}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {plan.status !== 'completed' && (
        <button 
          className="w-full text-center text-xs text-red-600 hover:text-red-700 font-medium pt-1"
          onClick={onCancel}
        >
          Cancel Agent Plan
        </button>
      )}
    </section>
  );
}

function SessionSummary({ summary, onExport, onClose }) {
  if (!summary) return null;

  const avgConf = summary.averageConfidence ?? 0;
  let confColor = 'text-green-700 bg-green-50 border-green-200';
  if (avgConf < 0.6) confColor = 'text-red-700 bg-red-50 border-red-200';
  else if (avgConf < 0.8) confColor = 'text-yellow-700 bg-yellow-50 border-yellow-200';

  return (
    <main className="min-h-[540px] bg-slate-50 p-4 flex flex-col justify-between">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Session Summary</h1>
          <p className="text-xs text-slate-500 mt-1">Session ID: {summary.sessionId}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm text-center">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Actions</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalActions}</p>
          </div>
          <div className={`rounded-lg border p-3 shadow-sm text-center ${confColor}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">Avg Confidence</span>
            <p className="text-2xl font-black mt-1">{(avgConf * 100).toFixed(0)}%</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
            Low Confidence Actions ({summary.lowConfidenceActions.length})
          </h2>
          <div className="mt-2 max-h-44 overflow-y-auto space-y-2">
            {summary.lowConfidenceActions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No low confidence actions were executed.</p>
            ) : (
              summary.lowConfidenceActions.map((action, idx) => (
                <div key={idx} className="rounded border border-red-100 bg-red-50/30 p-2 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800">{action.type.toUpperCase()}</p>
                    {action.details && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">
                        {action.details}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-red-600 bg-red-100/50 px-1 py-0.5 rounded border border-red-200">
                    {(action.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <button 
          className="w-full rounded-md bg-slate-950 hover:bg-slate-900 px-4 py-3 text-sm font-semibold text-white" 
          onClick={onExport} 
          type="button"
        >
          Export Summary JSON
        </button>
        <button 
          className="w-full rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700" 
          onClick={onClose} 
          type="button"
        >
          Close Summary
        </button>
      </div>
    </main>
  );
}
