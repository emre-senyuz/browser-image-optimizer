import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowDownToLine, ArrowRight, Check, ChevronRight, ImagePlus, Layers2, LoaderCircle, LockKeyhole, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Upload, X } from 'lucide-react';
import { bytes, convert, decode, extensions, validate, type Format } from './image';

type Original = { file: File; width: number; height: number };
type Result = { blob: Blob; width: number; height: number; name: string };
function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) { setUrl(undefined); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export default function App() {
  const [original, setOriginal] = useState<Original>();
  const [result, setResult] = useState<Result>();
  const [format, setFormat] = useState<Format>('image/webp');
  const [quality, setQuality] = useState(80);
  const [resize, setResize] = useState(false);
  const [width, setWidth] = useState('1920');
  const [busy, setBusy] = useState<'loading' | 'converting' | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const dragDepth = useRef(0);
  const originalUrl = useObjectUrl(original?.file);
  const resultUrl = useObjectUrl(result?.blob);
  useEffect(() => () => { generation.current++; }, []);
  const validWidth = /^\d+$/.test(width) && Number(width) >= 1 && Number(width) <= 16384;
  const reduction = original && result ? (1 - result.blob.size / original.file.size) * 100 : 0;

  async function load(files: FileList | null) {
    if (!files?.length) return;
    if (files.length !== 1) { setError('Please choose one image at a time.'); return; }
    const id = ++generation.current;
    setError(''); setBusy('loading'); setResult(undefined);
    try {
      const file = files[0];
      await validate(file);
      const decoded = await decode(file);
      const next = { file, width: decoded.width, height: decoded.height };
      decoded.close();
      if (id === generation.current) setOriginal(next);
    } catch (e) { if (id === generation.current) setError(e instanceof Error ? e.message : 'Could not open this image.'); }
    finally { if (id === generation.current) setBusy(null); }
  }
  function reset() {
    generation.current++; setOriginal(undefined); setResult(undefined); setError(''); setBusy(null);
    setFormat('image/webp'); setQuality(80); setResize(false); setWidth('1920');
    if (input.current) input.current.value = '';
  }
  async function optimize() {
    if (!original || busy || (resize && !validWidth)) return;
    const id = ++generation.current;
    setBusy('converting'); setError(''); setResult(undefined);
    try {
      const output = await convert(original.file, format, quality, resize ? Number(width) : undefined);
      if (id === generation.current) setResult({ ...output, name: `${original.file.name.replace(/\.[^.]+$/, '') || 'image'}-optimized.${extensions[format]}` });
    } catch (e) { if (id === generation.current) setError(e instanceof Error ? e.message : 'Conversion failed. Try a smaller image or another format.'); }
    finally { if (id === generation.current) setBusy(null); }
  }
  const invalidate = () => setResult(undefined);

  return <div className="min-h-screen">
    <header className="topbar"><div className="shell flex items-center justify-between gap-4"><a className="brand" href="./"><span className="brand-icon"><Layers2 size={22} /></span>pixelpress<span className="brand-dot">.</span></a><span className="privacy-pill"><span className="status-dot" />100% in your browser</span></div></header>
    <main className="shell">
      <section className="intro"><div className="eyebrow"><span /> SMALLER FILES. SAME BIG IDEAS.</div><h1>A little lighter.<br className="mobile-break" /> A lot more possibility.</h1><p>Resize, convert, and optimize your images in seconds.<br />All on your device. All yours.</p></section>
      <div className="workspace-heading"><div><span className="step-number">01</span><h2>Your image workspace</h2></div><span className="local-note"><LockKeyhole size={14} /> Private by design</span></div>
      <div className="workspace">
        <section className="source-panel">
          <div className="panel-heading"><h3><ImagePlus size={17} /> Source image</h3>{original && <button className="text-button" onClick={reset}><RotateCcw size={14} />Reset</button>}</div>
          <input ref={input} className="sr-only" aria-label="Choose image" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={e => { void load(e.target.files); e.target.value = ''; }} />
          <div className={`dropzone ${dragging ? 'dragging' : ''} ${original ? 'has-image' : ''}`} onDragEnter={e => { e.preventDefault(); dragDepth.current++; setDragging(true); }} onDragOver={e => e.preventDefault()} onDragLeave={e => { e.preventDefault(); if (--dragDepth.current <= 0) setDragging(false); }} onDrop={e => { e.preventDefault(); dragDepth.current = 0; setDragging(false); void load(e.dataTransfer.files); }}>
            {original ? <><div className="image-stage checker"><img src={originalUrl} alt="Original image preview" /></div><div className="file-info"><div className="min-w-0"><strong title={original.file.name}>{original.file.name}</strong><span>{original.width.toLocaleString()} × {original.height.toLocaleString()} px <span className="separator">/</span> {bytes(original.file.size)}</span></div><button className="icon-button" aria-label="Choose a different image" disabled={!!busy} onClick={() => input.current?.click()}><Upload size={17} /></button></div></> : <div className="empty-upload"><div className="upload-art"><div className="art-back" /><div className="art-front"><ImagePlus size={34} strokeWidth={1.4} /><span><Check size={12} /></span></div></div><h3>{dragging ? 'Drop it here' : 'Good things start with an image'}</h3><p>Drag and drop your image here, or</p><button className="choose-button" disabled={!!busy} onClick={() => input.current?.click()}><Upload size={16} />Choose an image</button><span className="upload-hint">PNG, JPG or WebP · Up to 25 MB</span></div>}
          </div>
          <div className="source-foot"><ShieldCheck size={15} /><span>Your images are never uploaded or stored on a server.</span></div>
        </section>
        <section className="settings-panel"><div className="panel-heading"><h3><SlidersHorizontal size={17} /> Export settings</h3><span className="tiny-label">MAKE IT YOURS</span></div>
          <fieldset disabled={!!busy}><legend className="field-label">Output format</legend><div className="format-group">{(['image/jpeg', 'image/png', 'image/webp'] as Format[]).map(f => <button key={f} type="button" aria-pressed={format === f} className={format === f ? 'selected' : ''} onClick={() => { setFormat(f); invalidate(); }}>{f.split('/')[1].toUpperCase()}{format === f && <Check size={13} />}</button>)}</div><p className="field-hint">{format === 'image/webp' ? 'A versatile format for smaller web images.' : format === 'image/png' ? 'Lossless output with transparency support.' : 'Great for photos. Transparent areas become white.'}</p>
            <div className="quality-header"><label className="field-label" htmlFor="quality">Image quality</label><span className="quality-value">{format === 'image/png' ? 'Lossless' : `${quality}%`}</span></div><input id="quality" type="range" min="1" max="100" value={quality} disabled={format === 'image/png' || !!busy} onChange={e => { setQuality(Number(e.target.value)); invalidate(); }} /><div className="range-labels"><span>Smaller file</span><span>Higher quality</span></div>
            <div className="resize-row"><label htmlFor="resize" className="field-label">Resize image<span>Keep the original aspect ratio</span></label><input id="resize" className="switch" type="checkbox" checked={resize} onChange={e => { setResize(e.target.checked); invalidate(); }} /></div>
            {resize && <div className="width-field"><label htmlFor="width">Maximum width</label><div><input id="width" type="number" min="1" max="16384" value={width} aria-invalid={!validWidth} onChange={e => { setWidth(e.target.value); invalidate(); }} /><span>px</span></div><p className="field-hint">{validWidth ? 'Only reduces dimensions; never enlarges your image.' : 'Enter a whole number from 1 to 16,384.'}</p></div>}
          </fieldset>
          <button className="convert-button" disabled={!original || !!busy || (resize && !validWidth)} onClick={() => void optimize()}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}{busy === 'loading' ? 'Opening image…' : busy === 'converting' ? 'Converting…' : 'Convert image'}{!busy && <ArrowRight size={17} />}</button><p className="settings-note">A fresh export. Your original stays untouched.</p>
        </section>
      </div>
      {error && <div className="error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={17} /></button></div>}
      <section className={`result-panel ${result ? 'ready' : ''}`} aria-live="polite" aria-busy={!!busy}>
        {result && original ? <><div className="result-title"><div><span className="step-number">02</span><h2>Your image, ready to go</h2></div><span className={`saving ${reduction < 0 ? 'larger' : ''}`}>{reduction < 0 ? '+' : '−'}{Math.abs(reduction).toFixed(1)}% {reduction < 0 ? 'larger' : 'smaller'}</span></div><div className="comparison">{[{ label: 'Original', url: originalUrl, size: original.file.size, width: original.width, height: original.height }, { label: 'Optimized', url: resultUrl, size: result.blob.size, width: result.width, height: result.height }].map(item => <div key={item.label}><div className="comparison-label"><strong>{item.label}</strong><span title={`${item.size.toLocaleString()} bytes`}>{bytes(item.size)}</span></div><div className="checker comparison-image"><img src={item.url} alt={`${item.label} comparison preview`} /></div><p>{item.width.toLocaleString()} × {item.height.toLocaleString()} px · {item.size.toLocaleString()} bytes</p></div>)}</div><div className="download-row"><p>{reduction < 0 ? 'This export is larger. Try a lower quality or a smaller width.' : reduction === 0 ? 'Same file size. Your converted image is ready.' : `${bytes(original.file.size - result.blob.size)} lighter. Ready for its next destination.`}</p><a className="download-button" href={resultUrl} download={result.name}><ArrowDownToLine size={18} />Download image</a></div></> : <div className="result-empty"><div className="result-icon"><ArrowDown size={20} /></div><div><h3>Your lighter image will land here</h3><p>Choose an image, fine-tune your settings, and hit convert.</p></div><span className="result-tag">READY WHEN YOU ARE</span></div>}
      </section>
      <section className="benefits"><div><span><LockKeyhole size={19} /></span><h3>Yours, and only yours.</h3><p>No uploads. No accounts. Your files<br />never leave your device.</p></div><div><span><SlidersHorizontal size={19} /></span><h3>Small changes. Real control.</h3><p>Choose your balance of file size,<br />dimensions, and image quality.</p></div><div><span><Layers2 size={19} /></span><h3>Made for the everyday.</h3><p>From a portfolio photo to a product shot.<br />One image, a few clicks, done.</p></div></section>
      <footer><span className="footer-brand">pixelpress.</span><p>Less weight. More room to create.</p><span>Built for your browser <ChevronRight size={13} /></span></footer>
    </main>
  </div>;
}
