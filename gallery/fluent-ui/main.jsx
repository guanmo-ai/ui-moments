import React, {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, FluentProvider, OverlayDrawer, Switch,
  TeachingPopover, TeachingPopoverBody, TeachingPopoverSurface, TeachingPopoverTitle, TeachingPopoverTrigger,
  Toast, ToastTitle, Toaster, useId, useRestoreFocusSource, useRestoreFocusTarget, useToastController, webDarkTheme, webLightTheme,
} from '@fluentui/react-components';
import {MotionBehaviourProvider} from '@fluentui/react-motion';
import {fluentWorks} from './catalog.mjs';
import '../../assets/embed.js';
import './style.css';

function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const heading = useId('drawer-title');
  const focusTarget = useRestoreFocusTarget();
  const focusSource = useRestoreFocusSource();
  return (
    <>
      <Button {...focusTarget} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>Open settings</Button>
      <OverlayDrawer {...focusSource} aria-labelledby={heading} position="end" open={open}
        onOpenChange={(_, data) => setOpen(data.open)} className="demo-drawer">
        <DrawerHeader>
          <DrawerHeaderTitle id={heading} action={
            <Button appearance="subtle" size="small" onClick={() => setOpen(false)}>Close</Button>
          }>Settings</DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <Switch label="Receive reminders" checked={notifications} onChange={(_, data) => setNotifications(data.checked)} />
        </DrawerBody>
      </OverlayDrawer>
    </>
  );
}

function SearchTip() {
  return <>Press <kbd>/</kbd> to search.</>;
}

function TeachingPopoverCard() {
  const heading = useId('teaching-popover-title');
  const tip = useId('teaching-popover-panel');
  const trigger = useRef(null);
  const [open, setOpen] = useState(true);
  function dismiss() {
    setOpen(false);
    trigger.current?.focus();
  }
  return <div className="card-popover" onKeyDown={event => {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      dismiss();
    }
  }}>
    <Button ref={trigger} className="card-popover-trigger" aria-expanded={open}
      aria-controls={tip} onClick={() => setOpen(!open)}>Show tip</Button>
    <div id={tip} className="card-preview-snapshot card-preview-teaching-popover" data-preview-snapshot="teaching-popover"
      role="group" aria-labelledby={heading} hidden={!open}>
      <h2 id={heading}>Quick search</h2>
      <p><SearchTip /></p>
      <div className="card-preview-actions">
        <Button size="small" appearance="primary" onClick={dismiss}>Got it</Button>
      </div>
    </div>
  </div>;
}

function TeachingPopoverDemo() {
  const heading = useId('teaching-popover-title');
  return (
    <TeachingPopover positioning={{position: 'below', align: 'center', offset: 6}}>
      <TeachingPopoverTrigger>
        <Button className="popover-trigger">Show tip</Button>
      </TeachingPopoverTrigger>
      <TeachingPopoverSurface className="demo-popover" aria-labelledby={heading}>
        <TeachingPopoverBody>
          <TeachingPopoverTitle id={heading}>Quick search</TeachingPopoverTitle>
          <div><SearchTip /></div>
        </TeachingPopoverBody>
      </TeachingPopoverSurface>
    </TeachingPopover>
  );
}

const toastDuration = 2200;

function CardNotification({number, onExpire}) {
  useEffect(() => {
    const timer = setTimeout(() => onExpire(number), toastDuration);
    return () => clearTimeout(timer);
  }, [number, onExpire]);
  return <Toast className="demo-toast">
    <ToastTitle media={<span aria-hidden="true">✓</span>}><span>Saved · {number}</span></ToastTitle>
  </Toast>;
}

function ToastCard() {
  const [saved, setSaved] = useState({count: 0, queue: []});
  const expire = useCallback(number => {
    setSaved(({count, queue}) => ({count, queue: queue.filter(item => item !== number)}));
  }, []);
  return <section className="card-preview-snapshot card-preview-toast" data-preview-snapshot="toast">
    {saved.count === 0 && <div className="card-preview-toast-stack">
      <article><h2>Saved · 2</h2><p>Your project has been saved.</p></article>
      <article><h2>Saved · 1</h2></article>
    </div>}
    <Button onClick={() => setSaved(({count, queue}) => ({count: count + 1, queue: [...queue, count + 1]}))}>
      Save project
    </Button>
    <div className="card-preview-toast-live" aria-live="polite" aria-relevant="additions">
      {saved.queue.slice(0, 2).reverse().map(number => <CardNotification key={number} number={number} onExpire={expire} />)}
    </div>
  </section>;
}

function ToastDemo() {
  const toasterId = useId('toaster');
  const {dispatchToast} = useToastController(toasterId);
  const [count, setCount] = useState(0);

  function notify() {
    const next = count + 1;
    setCount(next);
    dispatchToast(<Toast className="demo-toast"><ToastTitle>Saved · {next}</ToastTitle></Toast>);
  }

  return <>
    <Button className="toast-trigger" onClick={notify}>Save project</Button>
    <Toaster className="demo-toaster" toasterId={toasterId} position="top" offset={{vertical: 6}}
      limit={2} timeout={toastDuration} pauseOnHover={false} />
  </>;
}

const demos = {drawer: DrawerDemo, 'teaching-popover': TeachingPopoverDemo, toast: ToastDemo};
const groups = {
  controls: () => import('./controls.jsx'),
  forms: () => import('./forms.jsx'),
  navigation: () => import('./navigation.jsx'),
  feedback: () => import('./feedback.jsx'),
};
const params = new URLSearchParams(location.search);
const sample = params.get('sample') ?? 'drawer';
const cardPreview = params.get('embed') === 'ui' && params.get('preview') === 'card';
const id = `fluent-${sample}`;
const entry = fluentWorks.find(work => work.id === id) ??
  (await import('./other.mjs')).otherFluentWorks.find(work => work.id === id);
const interactivePreviews = {'teaching-popover': TeachingPopoverCard, toast: ToastCard};
const interactivePreview = cardPreview && Object.hasOwn(interactivePreviews, sample);
const Demo = interactivePreview ? interactivePreviews[sample] : Object.hasOwn(demos, sample) ? demos[sample] : entry ? lazy(async () => {
  const {default: examples} = await groups[entry.group]();
  return {default: examples[sample]};
}) : DrawerDemo;
const root = document.documentElement;
const systemTheme = matchMedia('(prefers-color-scheme: dark)');

function readSettings() {
  return {
    theme: root.dataset.theme || (systemTheme.matches ? 'dark' : 'light'),
    animate: root.dataset.galleryActive !== 'false',
  };
}

function App() {
  const [settings, setSettings] = useState(readSettings);
  const title = useId('card-preview-title');
  useEffect(() => {
    const update = () => setSettings(readSettings());
    const observer = new MutationObserver(update);
    observer.observe(root, {attributes: true, attributeFilter: ['data-theme', 'data-gallery-active']});
    systemTheme.addEventListener('change', update);
    update();
    return () => {
      observer.disconnect();
      systemTheme.removeEventListener('change', update);
    };
  }, []);
  const theme = settings.theme === 'light' ? webLightTheme : webDarkTheme;
  return (
    <FluentProvider as={interactivePreview ? 'main' : undefined} aria-labelledby={interactivePreview ? title : undefined}
      className="demo-stage" theme={{...theme, fontFamilyBase: 'system-ui, sans-serif'}}>
      {interactivePreview && <h1 id={title} className="card-preview-title">{entry.title}</h1>}
      <MotionBehaviourProvider value={settings.animate ? undefined : 'skip'}>
        {cardPreview && sample === 'dialog'
          ? <section className="card-preview-snapshot card-preview-dialog" data-preview-snapshot="dialog" inert>
            <h2>Archive project?</h2>
            <p>Move this project out of the active list.</p>
            <div className="card-preview-actions"><Button size="small">Cancel</Button><Button size="small" appearance="primary">Confirm</Button></div>
          </section>
          : <Suspense><Demo cardPreview={cardPreview} animate={settings.animate} /></Suspense>}
      </MotionBehaviourProvider>
    </FluentProvider>
  );
}

createRoot(document.getElementById('demo')).render(<App />);
