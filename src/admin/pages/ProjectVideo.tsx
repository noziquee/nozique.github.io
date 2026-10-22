import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getVideoUrl, removeVideo, saveVideoLink, uploadVideo } from '../data/video';
import { validateVideoFile, validateVideoLink } from '../data/videoRules';
import { ErrorMessage, Loading } from '../ui/states';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function ProjectVideo({ postId }: { postId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [attempt, setAttempt] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getVideoUrl(postId)
      .then((value) => {
        if (cancelled) return;
        setUrl(value);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(messageOf(error));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [postId, attempt]);

  async function run(action: () => Promise<string | null>, done: string) {
    setBusy(true);
    setProblem(null);
    setNotice(null);
    try {
      setUrl(await action());
      setNotice(done);
    } catch (error) {
      setProblem(messageOf(error));
    }
    setBusy(false);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const found = validateVideoFile(file);
    if (found) {
      setProblem(found);
      return;
    }
    void run(() => uploadVideo(postId, file, url), 'Video uploaded.');
  }

  function onLink(event: FormEvent) {
    event.preventDefault();
    const found = validateVideoLink(link);
    if (found) {
      setProblem(found);
      return;
    }
    void run(async () => {
      const saved = await saveVideoLink(postId, link, url);
      setLink('');
      return saved;
    }, 'Video link saved.');
  }

  function onRemove() {
    if (!window.confirm('Remove the video from this project?')) return;
    void run(async () => {
      await removeVideo(postId, url);
      return null;
    }, 'Video removed.');
  }

  return (
    <section className="images">
      <h2>Video</h2>
      <p className="muted">
        For animation projects. Your site shows it in the project’s Animation section when the
        category is an animation one.
      </p>

      {state === 'loading' && <Loading label="Loading video…" />}
      {state === 'error' && (
        <ErrorMessage title="Could not load the video" onRetry={() => setAttempt((n) => n + 1)}>
          {loadError}
        </ErrorMessage>
      )}

      {state === 'ready' && (
        <>
          {url && url.startsWith('https://') ? (
            <div className="video-preview">
              <video src={url} controls playsInline preload="metadata" />
              <button type="button" className="danger" disabled={busy} onClick={onRemove}>
                Remove video
              </button>
            </div>
          ) : (
            <p className="muted">No video yet.</p>
          )}

          <div className="dropzone">
            <input ref={input} type="file" accept="video/mp4,video/webm" hidden onChange={onPick} />
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {url ? 'Replace with a file' : 'Upload a video'}
            </button>
            <span className="muted">MP4 or WebM, up to 50 MB</span>
          </div>

          <form className="add-row" onSubmit={onLink} noValidate>
            <input
              aria-label="Link to a video file"
              placeholder="Or paste a link to an .mp4 / .webm file (https://…)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <button type="submit" disabled={busy || !link.trim()}>
              Use link
            </button>
          </form>

          {busy && (
            <p className="notice" role="status">
              Working… large videos can take a minute.
            </p>
          )}
          {notice && !busy && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {problem && (
            <p className="error" role="alert">
              {problem}
            </p>
          )}
        </>
      )}
    </section>
  );
}
