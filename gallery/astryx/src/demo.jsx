import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {Button} from '@astryxdesign/core/Button';
import {CommandPalette, CommandPaletteInput} from '@astryxdesign/core/CommandPalette';
import {DateRangeInput} from '@astryxdesign/core/DateRangeInput';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import {Theme} from '@astryxdesign/core/theme';
import {createStaticSource} from '@astryxdesign/core/Typeahead';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './demo.css';
import {astryxWorks} from '../catalog.mjs';
import officialDemos from './official-demos';

function DateRangeDemo() {
  const [value, setValue] = useState(null);
  return <div className="date-range">
    <DateRangeInput label="Date range" value={value} onChange={setValue}
      placeholder="Select a date range" width="100%" size="sm" numberOfMonths={1} weekStartsOn="mon" />
  </div>;
}

function BottomSheetDemo() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const trigger = useRef(null);
  return <>
    <Button ref={trigger} label="Open bottom sheet" size="sm" onClick={() => setOpen(true)} />
    <output>{saved && 'Preferences applied'}</output>
    <BottomSheet label="Demo preferences" isOpen={open} onOpenChange={setOpen} finalFocusRef={trigger}
      height="min(205px, calc(100dvh - 12px))" padding={1.5}>
      <div className="sheet-content">
        <strong>Demo preferences</strong>
        <Button label="Apply" size="sm" onClick={() => { setSaved(true); setOpen(false); }} />
      </div>
    </BottomSheet>
  </>;
}

const commands = [
  {id: 'preview', label: 'Preview design'},
  {id: 'find', label: 'Find a component'},
  {id: 'settings', label: 'Open settings'},
];
const commandSource = createStaticSource(commands);

function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  return <>
    <Button label="Open command palette" size="sm" onClick={() => setOpen(true)} />
    <output>{selected && `Selected: ${selected}`}</output>
    <CommandPalette label="Command palette" isOpen={open} onOpenChange={setOpen} searchSource={commandSource}
      width="min(420px, calc(100vw - 12px))" maxHeight="calc(100dvh - 12px)" footer={<></>}
      input={<CommandPaletteInput label="Search commands" placeholder="Search commands" />}
      onValueChange={id => {
        setSelected(commands.find(command => command.id === id)?.label ?? '');
        setOpen(false);
      }} />
  </>;
}

const demos = new Map([
  ['date-range', DateRangeDemo],
  ['bottom-sheet', BottomSheetDemo],
  ['command-palette', CommandPaletteDemo],
]);
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const embedded = params.get('embed') === 'ui';
if (!embedded) addEventListener('hashchange', () => location.reload());
const key = (embedded ? params.get('sample') : location.hash.slice(1)) || 'date-range';
const work = astryxWorks.find(item => item.id === `astryx-${key}`) || astryxWorks[0];
const fitPreview = params.get('preview') === 'card' && work.fitPreview;
if (fitPreview) root.dataset.fitPreview = '';
const systemTheme = matchMedia('(prefers-color-scheme: light)');
const preferredMode = () => embedded ? root.dataset.theme : (systemTheme.matches ? 'light' : 'dark');

function OfficialShowcase({Demo}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (!fitPreview) return;
    const panel = ref.current;
    const resize = () => {
      const width = Math.max(panel.offsetWidth, panel.scrollWidth);
      const height = Math.max(panel.offsetHeight, panel.scrollHeight);
      const scale = Math.min(1, (innerWidth - 14) / width, (innerHeight - 14) / height);
      panel.style.setProperty('--preview-scale', Math.max(0, scale));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(panel);
    addEventListener('resize', resize);
    return () => { observer.disconnect(); removeEventListener('resize', resize); };
  }, []);

  return <div className="showcase" ref={ref} onClickCapture={event => {
    const link = event.target.closest('a[href]');
    if (link?.origin === location.origin) event.preventDefault();
  }}><Demo /></div>;
}

function App({Demo, official}) {
  const [mode, setMode] = useState(preferredMode);
  useEffect(() => {
    const updateMode = () => setMode(preferredMode());
    if (!embedded) {
      systemTheme.addEventListener('change', updateMode);
      return () => systemTheme.removeEventListener('change', updateMode);
    }
    const observer = new MutationObserver(updateMode);
    observer.observe(root, {attributes: true, attributeFilter: ['data-theme']});
    updateMode();
    return () => observer.disconnect();
  }, []);

  return <Theme theme={neutralTheme} mode={mode}>
    <InternationalizationProvider locale="en-US">
      <div className="stage" data-sample={key}>{official ? <OfficialShowcase Demo={Demo} /> : <Demo />}</div>
    </InternationalizationProvider>
  </Theme>;
}

document.title = `${work.title} · UI Moments`;
const reactRoot = createRoot(document.getElementById('sample'));
const load = officialDemos.get(key);
if (load) {
  load().then(({default: Demo}) => reactRoot.render(<App Demo={Demo} official />)).catch(error => {
    console.error(error);
    reactRoot.render(<p role="alert">The preview could not load. Reload to retry.</p>);
  });
} else {
  reactRoot.render(<App Demo={demos.get(key) || DateRangeDemo} />);
}
