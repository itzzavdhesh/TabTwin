// Routes TabTwin web app pages based on the current browser path.
import React from 'react';
import Landing from './pages/Landing.jsx';
import Join from './pages/Join.jsx';
import Session from './pages/Session.jsx';
import NotFound from './pages/NotFound.jsx';
export default function App() {
  const path = window.location.pathname;

  if (path === '/') return <Landing />;
  if (path.startsWith('/join/')) return <Join sessionId={path.split('/').filter(Boolean)[1]} />;
  if (path.startsWith('/session/')) return <Session sessionId={path.split('/').filter(Boolean)[1]} />;
  return <NotFound />;
}
