// Standalone recording viewer: loads a downloaded .tabtwin.json file and
// replays it locally, with no live session or WebSocket connection needed.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PlaybackControls from '../components/PlaybackControls.jsx';
import PlaybackView from '../components/PlaybackView.jsx';
import Timeline from '../components/Timeline.jsx';
import { usePlaybackReplay } from '../hooks/usePlaybackReplay.js';
import { fromTabTwinJson } from '../recording/exportRecording.js';
import { PlaybackEngine } from '../recording/PlaybackEngine.js';

export default function Viewer() {
  const [recording, setRecording] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const engineRef = useRef(null);
  const { cursors, annotations, attach } = usePlaybackReplay();

  useEffect(() => {
    const engine = new PlaybackEngine();
    engineRef.current = engine;
    attach(engine);
    engine.setOnProgress((time) => setCurrentTime(time));
    return () => engine.stop();
  }, [attach]);

  const duration = useMemo(() => engineRef.current?.getDuration() ?? 0, [recording, currentTime]);

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const parsed = fromTabTwinJson(data);
        if (!parsed || !parsed.events.length) throw new Error('empty');
        setRecording(parsed);
        engineRef.current?.load(parsed);
      } catch (err) {
        setError('Could not read this file as a valid TabTwin recording.');
        setRecording(null);
      }
    };
    reader.readAsText(file);
  }

  return (
    <main className="relative min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">TabTwin</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Recording Viewer</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Load a downloaded{' '}
          <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">.tabtwin.json</code> recording
          and replay it locally — no live session required.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700" htmlFor="recording-file">
            Recording file
          </label>
          <input
            accept=".json,.tabtwin.json"
            className="mt-2 block w-full text-sm text-slate-600"
            id="recording-file"
            onChange={handleFile}
            type="file"
          />
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        {recording ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <PlaybackControls
              currentTime={currentTime}
              duration={duration}
              playback={engineRef.current}
              recording={recording}
            />
            <Timeline recording={recording} />
          </div>
        ) : null}
      </div>

      <PlaybackView annotations={annotations} cursors={cursors} />
    </main>
  );
}
