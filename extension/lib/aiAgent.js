// Calls Claude to convert a host command and tab content into a structured browser action plan.

export async function runClaudeAgent({ apiUrl, sessionId, command, tabs, permissions }) {
  if (!sessionId || !apiUrl) {
    return fallbackPlan(command, tabs);
  }

  const response = await fetch(`${apiUrl}/api/agent/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      command,
      tabs,
      permissions
    })
  });

  if (!response.ok) {
    return fallbackPlan(command, tabs, `Claude API error: ${response.status}`);
  }

  const body = await response.json();
  const text = body.content?.find((part) => part.type === 'text')?.text || '{}';

  try {
    return sanitizePlan(JSON.parse(text), permissions);
  } catch {
    return fallbackPlan(command, tabs, 'Claude returned invalid JSON.');
  }
}

function sanitizePlan(plan, permissions) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  return {
    summary: String(plan.summary || 'Agent plan generated.'),
    actions: actions.filter((action) => {
      if (action.type === 'click') return permissions.click;
      if (action.type === 'type') return permissions.type;
      if (action.type === 'navigate') return permissions.navigate;
      return true;
    })
  };
}

function fallbackPlan(command, tabs, reason = 'No Claude API key configured.') {
  return {
    summary: `${reason} Prepared a read-only plan for: ${command}`,
    actions: tabs.slice(0, 3).map((_tab, index) => ({ type: 'read', tabIndex: index }))
  };
}

// TODO: Add OpenAI as an alternative AI agent provider behind the same action-plan interface.
