// Manages TabTwin host sessions, extension storage, WebSocket signaling, and tab action dispatch.
import { createHostWebRTC } from '../lib/webrtc.js';
import { createCrdtBridge } from '../lib/crdt.js';
import { runClaudeAgent } from '../lib/aiAgent.js';

const API_URL = 'https://tabtwinserver-production.up.railway.app';
const WS_URL = 'wss://tabtwinserver-production.up.railway.app';

const state = {
  session: null,
  guests: [],
  activityLog: [],
  settings: {
    anthropicApiKey: '',
    allowAgentClick: false,
    allowAgentType: false,
    allowAgentNavigate: false
  },
  socket: null,
  rtc: null,
  crdt: createCrdtBridge(),
  agentPlan: null,
  sessionStats: null,
  finalSummary: null
};

// TODO: Add session recording/playback feature for reviewed collaboration sessions.
// TODO: Add voice chat layer between host and guest during session.
// TODO: Add mobile companion app with view-only mode.
// TODO: Allow guests to install the extension mid-session to upgrade from view-only to full tab access.
// TODO: Build a standalone desktop app with Electron wrapping the extension and web app.

chrome.runtime.onInstalled.addListener(async () => {
  const saved = await chrome.storage.local.get(['tabTwinSettings']);
  state.settings = { ...state.settings, ...(saved.tabTwinSettings || {}) };
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'popup:get-state':
      return snapshot();
    case 'session:start':
      return startSession();
    case 'session:end':
      return endSession();
    case 'control:revoke':
      sendSocket('control:revoke', { guestId: message.payload.guestId });
      addLog('Control revoked');
      return snapshot();
    case 'agent:run':
      return runAgent(message.payload.command);
    case 'agent:confirm-action':
      if (state.agentPlan && state.agentPlan.status === 'pending_confirmation') {
        const action = state.agentPlan.actions[state.agentPlan.currentIndex];
        action.confirmed = true;
        state.agentPlan.status = 'executing';
        executeNextAgentAction();
      }
      return snapshot();
    case 'agent:skip-action':
      if (state.agentPlan && state.agentPlan.status === 'pending_confirmation') {
        const action = state.agentPlan.actions[state.agentPlan.currentIndex];
        addLog(`Skipped agent action: ${action.type}`);
        state.agentPlan.currentIndex += 1;
        state.agentPlan.status = state.agentPlan.currentIndex < state.agentPlan.actions.length ? 'executing' : 'completed';
        if (state.agentPlan.status === 'executing') {
          executeNextAgentAction();
        } else {
          addLog('Agent plan execution completed');
        }
      }
      return snapshot();
    case 'agent:cancel-plan':
      if (state.agentPlan) {
        state.agentPlan.status = 'cancelled';
        addLog('Agent plan execution cancelled');
      }
      return snapshot();
    case 'settings:clear-summary':
      state.finalSummary = null;
      return snapshot();
    case 'settings:save':
      state.settings = { ...state.settings, ...message.payload };
      await chrome.storage.local.set({ tabTwinSettings: state.settings });
      return snapshot();
    case 'settings:clear-session':
      await chrome.storage.local.remove(['tabTwinSession']);
      state.session = null;
      return snapshot();
    case 'content:cursor-ready':
      return snapshot();
    case 'content:action-complete':
      addLog(`Action completed: ${message.payload.type}`);
      if (state.agentPlan && state.agentPlan.status === 'executing') {
        const action = state.agentPlan.actions[state.agentPlan.currentIndex];
        if (action) {
          updateSessionStats(action);
        }
        state.agentPlan.currentIndex += 1;
        setTimeout(executeNextAgentAction, 300);
      }
      return snapshot();
    default:
      return snapshot();
  }
}

async function startSession() {
  const response = await fetch(`${API_URL}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName: 'Host' })
  });
  const session = await response.json();
  state.session = { id: session.session_id, link: session.link };
  state.guests = [];
  state.sessionStats = {
    totalActions: 0,
    averageConfidence: 0,
    confidenceSum: 0,
    lowConfidenceActions: []
  };
  state.finalSummary = null;
  state.agentPlan = null;
  addLog('Session started');
  connectSocket();
  await chrome.storage.local.set({ tabTwinSession: state.session });
  return snapshot();
}

async function endSession() {
  if (state.session) {
    await fetch(`${API_URL}/api/session/${state.session.id}`, { method: 'DELETE' }).catch(() => {});
  }
  state.finalSummary = {
    sessionId: state.session?.id || 'unknown',
    endedAt: new Date().toISOString(),
    totalActions: state.sessionStats?.totalActions || 0,
    averageConfidence: state.sessionStats?.averageConfidence ? Number(state.sessionStats.averageConfidence.toFixed(2)) : 0,
    lowConfidenceActions: state.sessionStats?.lowConfidenceActions || []
  };
  state.socket?.close();
  state.socket = null;
  state.session = null;
  state.guests = [];
  state.rtc = null;
  state.agentPlan = null;
  state.sessionStats = null;
  addLog('Session ended');
  await chrome.storage.local.remove(['tabTwinSession']);
  return snapshot();
}

function connectSocket() {
  if (!state.session) return;
  state.socket?.close();
  state.socket = new WebSocket(WS_URL);
  state.rtc = createHostWebRTC({ sendSignal: sendSocket, onDataMessage: handleRealtimeMessage });

  state.socket.addEventListener('open', () => {
    sendSocket('host:connect', { sessionId: state.session.id });
  });

  state.socket.addEventListener('message', async (event) => {
    const message = JSON.parse(event.data);
    await handleServerEvent(message);
  });
}

async function handleServerEvent({ event, payload = {} }) {
  if (event === 'session:joined') {
    state.guests = payload.guests || mergeGuest(payload.guest);
    addLog(`${payload.guest?.name || 'Guest'} joined`);
    return;
  }

  if (event === 'session:guest-left') {
    state.guests = payload.guests || [];
    addLog('Guest left');
    return;
  }

  if (event === 'cursor:move') {
    await sendToActiveTab({ type: 'cursor:move', payload });
    return;
  }

  if (event === 'action:request') {
    await sendToActiveTab({ type: 'action:request', payload });
    addLog(`Action requested: ${payload.type}`);
    return;
  }

  if (event === 'crdt:update') {
    state.crdt.applyRemoteUpdate(payload);
    await sendToActiveTab({ type: 'annotation:add', payload });
    return;
  }

  if (event === 'webrtc:offer') {
    await state.rtc.handleOffer(payload.offer, payload.guestId);
    return;
  }

  if (event === 'webrtc:ice-candidate') {
    await state.rtc.addIceCandidate(payload.candidate);
  }
}

function handleRealtimeMessage(message) {
  if (message.event === 'cursor:move') sendToActiveTab({ type: 'cursor:move', payload: message.payload });
  if (message.event === 'action:request') sendToActiveTab({ type: 'action:request', payload: message.payload });
}

async function runAgent(command) {
  if (!state.session) return snapshot();
  const tabs = await collectOpenTabContent();
  const plan = await runClaudeAgent({
    apiKey: state.settings.anthropicApiKey,
    command,
    tabs,
    permissions: {
      click: state.settings.allowAgentClick,
      type: state.settings.allowAgentType,
      navigate: state.settings.allowAgentNavigate
    }
  });

  state.agentPlan = {
    command,
    summary: plan.summary,
    actions: plan.actions,
    currentIndex: 0,
    status: plan.actions.length > 0 ? 'executing' : 'completed'
  };

  addLog(plan.summary || 'Agent plan ready');
  sendSocket('agent:command', { command, summary: plan.summary, actions: plan.actions });

  if (state.agentPlan.status === 'executing') {
    executeNextAgentAction();
  }

  return snapshot();
}

async function collectOpenTabContent() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const results = [];

  for (const tab of tabs.slice(0, 8)) {
    let content = '';
    try {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body?.innerText?.slice(0, 12000) || ''
      });
      content = injection?.result || '';
    } catch {
      content = '';
    }

    results.push({ title: tab.title, url: tab.url, content });
  }

  return results;
}

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, message).catch(() => {});
}

function sendSocket(event, payload = {}) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return;
  state.socket.send(JSON.stringify({ event, payload: { sessionId: state.session?.id, ...payload } }));
}

function mergeGuest(guest) {
  if (!guest) return state.guests;
  const without = state.guests.filter((item) => item.id !== guest.id);
  return [...without, guest];
}

function addLog(message) {
  state.activityLog = [{ message, at: Date.now() }, ...state.activityLog].slice(0, 5);
}

function snapshot() {
  return {
    session: state.session,
    guests: state.guests,
    activityLog: state.activityLog,
    settings: state.settings,
    agentPlan: state.agentPlan,
    sessionStats: state.sessionStats,
    finalSummary: state.finalSummary
  };
}

async function executeNextAgentAction() {
  if (!state.agentPlan || state.agentPlan.status !== 'executing') return;
  const { actions, currentIndex } = state.agentPlan;

  if (currentIndex >= actions.length) {
    state.agentPlan.status = 'completed';
    addLog('Agent plan execution completed');
    chrome.runtime.sendMessage({ type: 'popup:state-changed', payload: snapshot() }).catch(() => {});
    return;
  }

  const action = actions[currentIndex];

  if (action.confidence < 0.6 && !action.confirmed) {
    state.agentPlan.status = 'pending_confirmation';
    addLog(`Action pending host confirmation: ${action.type}`);
    chrome.runtime.sendMessage({ type: 'popup:state-changed', payload: snapshot() }).catch(() => {});
    return;
  }

  addLog(`Executing agent action ${currentIndex + 1}/${actions.length}: ${action.type}`);
  await sendToActiveTab({ type: 'action:request', payload: action });
}

function updateSessionStats(action) {
  if (!state.sessionStats) {
    state.sessionStats = {
      totalActions: 0,
      averageConfidence: 0,
      confidenceSum: 0,
      lowConfidenceActions: []
    };
  }
  
  if (typeof action.confidence === 'number') {
    state.sessionStats.totalActions += 1;
    state.sessionStats.confidenceSum += action.confidence;
    state.sessionStats.averageConfidence = state.sessionStats.confidenceSum / state.sessionStats.totalActions;
    
    if (action.confidence < 0.6) {
      state.sessionStats.lowConfidenceActions.push({
        type: action.type,
        confidence: action.confidence,
        timestamp: Date.now(),
        details: action.selector || action.url || action.text || ''
      });
    }
  }
}

// TODO: Support Firefox extension Manifest V3 differences.
