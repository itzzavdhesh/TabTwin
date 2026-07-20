// Hosts the active guest-side TabTwin session surface and bottom controls.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AnnotationLayer from '../components/AnnotationLayer.jsx';
import ControlBar from '../components/ControlBar.jsx';
import GhostCursor from '../components/GhostCursor.jsx';
import PlaybackControls from '../components/PlaybackControls.jsx';
import RecordingBadge from '../components/RecordingBadge.jsx';
import SessionStatus from '../components/SessionStatus.jsx';
import Timeline from '../components/Timeline.jsx';
import { useCursor } from '../hooks/useCursor.js';
import { useSession } from '../hooks/useSession.js';
import { PlaybackEngine } from '../recording/PlaybackEngine.js';
import SessionError from './SessionError.jsx';

export default function Session({ sessionId }) {
  const params = new URLSearchParams(window.location.search);
  const guestName = params.get('name') || 'Guest';
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackEvents, setPlaybackEvents] = useState([]);
  const [playbackState, setPlaybackState] = useState('idle');
  const playbackEngineRef = useRef(null);
  const session = useSession({ sessionId, guestName, recordingEnabled });
  const cursor = useCursor({ onMove: session.sendCursorMove });

  useEffect(() => {
    const engine = new PlaybackEngine();
    playbackEngineRef.current = engine;
    engine.setRenderer((event) => {
      setPlaybackEvents((current) => [...current, event]);
    });
    engine.setOnProgress((time) => {
      setPlaybackCurrentTime(time);
      setPlaybackState(engine.state);
    });
    return () => engine.stop();
  }, []);

  useEffect(() => {
    if (!session.recording) {
      setPlaybackEvents([]);
      setPlaybackCurrentTime(0);
      setPlaybackState('idle');
      return;
    }

    playbackEngineRef.current?.load(session.recording);
    setPlaybackEvents([]);
    setPlaybackCurrentTime(0);
    setPlaybackState('idle');
  }, [session.recording]);

  const playbackDuration = useMemo(() => playbackEngineRef.current?.getDuration() ?? 0, [session.recording, playbackCurrentTime]);

  if (session.status === 'ended' && !session.recording && !recordingEnabled) {
    return <SessionError type="ended" />;
  }

  if ((session.status === 'error' || session.status === 'offline') && !session.recording && !recordingEnabled) {
    return <SessionError type="network" />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100" onPointerMove={cursor.handlePointerMove}>
      <div className="absolute inset-x-0 top-0 border-b border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guest session</p>
            <h1 className="text-xl font-bold text-slate-950">Connected as {guestName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <RecordingBadge enabled={recordingEnabled} state={playbackState === 'playing' ? 'playback' : recordingEnabled ? 'recording' : 'idle'} />
            <SessionStatus status={session.status} label={session.statusLabel} />
          </div>
        </div>
      </div>

      <section className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 pt-20 pb-28">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-teal-700">Your actions appear in the host browser</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Move your cursor to show a ghost pointer. Highlight, annotate, scroll, click, and type actions are sent as permissioned requests.
          </p>
          <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
            <Permission label="Highlight" enabled={session.permissions.canHighlight} />
            <Permission label="Click" enabled={session.permissions.canClick} />
            <Permission label="Type" enabled={session.permissions.canType} />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input checked={recordingEnabled} className="h-4 w-4 rounded border-slate-300" onChange={(event) => {
                setRecordingEnabled(event.target.checked);
                session.setRecordingEnabled(event.target.checked);
              }} type="checkbox" />
              Enable session recording
            </label>
            <p className="text-sm text-slate-500">Recorded timeline stays isolated from live collaboration and is available for playback after the session ends.</p>
          </div>
          {session.recording ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <PlaybackControls currentTime={playbackCurrentTime} duration={playbackDuration} playback={playbackEngineRef.current} recording={session.recording} />
              <Timeline recording={session.recording} />
            </div>
          ) : null}
          {playbackEvents.length ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Playback preview</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {playbackEvents.map((event, index) => (
                  <li className="rounded-md border border-slate-200 px-3 py-2" key={`${event.id || index}-${index}`}>{event.eventType}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <GhostCursor x={cursor.position.x} y={cursor.position.y} name={guestName} color={session.guest?.color || '#2563eb'} />
      <AnnotationLayer session={session} />
      <ControlBar session={session} cursor={cursor.position} />
    </main>
  );
}

function Permission({ label, enabled }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-800">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{enabled ? 'Allowed by host' : 'Needs host approval'}</p>
    </div>
  );
}
