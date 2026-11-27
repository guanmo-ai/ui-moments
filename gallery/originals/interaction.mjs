const clampInteraction = (value, min, max) => Math.min(max, Math.max(min, value));

export function rubberBand(value, min, max, limit = 28) {
  const edge = clampInteraction(value, min, max);
  const excess = (value - edge) * .35;
  return edge + excess / (1 + Math.abs(excess) / limit);
}

// Keep the visual position when interrupted. Sample the same damped spring at
// any frame rate, including the first frame after a tab becomes visible again.
export function springValue(initial, paint, motionEnabled) {
  let value = initial;
  let frame = 0;
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function set(next) {
    stop();
    value = next;
    paint(value);
  }
  function to(target, velocity = []) {
    stop();
    if (!motionEnabled()) return set(target);
    const from = value;
    const start = performance.now();
    function tick(now) {
      const time = Math.max(0, now - start) / 1000;
      if (!motionEnabled() || time >= .48) return set(target);
      const decay = Math.exp(-15 * time);
      const cos = Math.cos(13 * time), sin = Math.sin(13 * time);
      value = target.map((end, index) => {
        const distance = from[index] - end;
        const speed = clampInteraction(velocity[index] ?? 0, -1100, 1100);
        return end + decay * (distance * cos + (speed + 15 * distance) / 13 * sin);
      });
      paint(value);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }
  return {get value() { return value; }, set, to, stop};
}

export function vibrateOnTouch(event) {
  if (event?.pointerType === 'touch') navigator.vibrate?.(10);
}

// A horizontal touch drag only starts once it wins against vertical scrolling.
// Dedicated vertical/two-axis handles declare their own touch-action in CSS.
export function bindDrag(handle, {start, move, end, horizontal = false, native = false}) {
  const view = handle.ownerDocument.defaultView;
  const doc = handle.ownerDocument;
  let active;

  handle.addEventListener('pointerdown', event => {
    if (active || event.button !== 0 || !event.isPrimary || event.ctrlKey) return;
    const listeners = new AbortController();
    const options = {signal: listeners.signal, capture: true};
    const origin = event;
    const pendingTouch = horizontal && event.pointerType === 'touch' && !native;
    let started = false;
    let samples = [{x: event.clientX, y: event.clientY, time: event.timeStamp}];
    active = listeners;

    function begin() {
      if (start?.(origin) === false) return false;
      started = true;
      handle.dataset.pointerActive = '';
      if (!native) {
        handle.focus({preventScroll: true});
        handle.setPointerCapture(origin.pointerId);
      }
      return true;
    }

    function finish(event, released = false) {
      if (active !== listeners) return;
      active = undefined;
      listeners.abort();
      if (!started) return;
      delete handle.dataset.pointerActive;
      if (!native && handle.hasPointerCapture(origin.pointerId)) handle.releasePointerCapture(origin.pointerId);
      const last = samples.at(-1), first = samples[0];
      const age = released ? event.timeStamp - last.time : Infinity;
      const seconds = Math.max(.008, (last.time - first.time) / 1000);
      const weight = Math.max(0, 1 - age / 100);
      end?.(event, {
        released,
        vx: (last.x - first.x) * weight / seconds,
        vy: (last.y - first.y) * weight / seconds,
      });
    }

    if (!pendingTouch && !begin()) return finish(event);
    if (!native && event.pointerType === 'mouse') event.preventDefault();

    view.addEventListener('pointermove', event => {
      if (event.pointerId !== origin.pointerId) return;
      if (event.pointerType === 'mouse' && !(event.buttons & 1)) return finish(event);
      if (!started) {
        const x = Math.abs(event.clientX - origin.clientX);
        const y = Math.abs(event.clientY - origin.clientY);
        if (y >= 7 && y >= x) return finish(event);
        if (x < 7 || x <= y) return;
        if (!begin()) return finish(event);
      }
      const point = {x: event.clientX, y: event.clientY, time: event.timeStamp};
      samples.push(point);
      while (samples.length > 2 && point.time - samples[1].time >= 100) samples.shift();
      move?.(event);
    }, options);

    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      view.addEventListener(type, event => {
        if (event.pointerId !== origin.pointerId) return;
        // Touch can implicitly capture an SVG child before we capture the handle.
        // Its loss during that transfer leaves the handle's drag active.
        if (type === 'lostpointercapture' && event.composedPath()[0] !== handle) return;
        finish(event, type === 'pointerup');
      }, options);
    }
    for (const type of ['contextmenu', 'blur', 'pagehide']) {
      view.addEventListener(type, event => finish(event), {signal: listeners.signal, capture: type === 'contextmenu'});
    }
    doc.addEventListener('visibilitychange', event => finish(event), options);
  });
}
