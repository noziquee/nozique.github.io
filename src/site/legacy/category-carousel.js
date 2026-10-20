(() => {
  const loop = globalThis.NoziqueCategoryLoop;
  if (!loop) return;
  function setup() {
    const section = document.querySelector('.art-category');
    if (!section || section.dataset.ready) return;
    const track = section.querySelector('.category-track');
    const cards = [...track.querySelectorAll('a')];
    if (!cards.length) return;
    section.dataset.ready = 'true';
    const previous = section.querySelector('[data-category-prev]');
    const next = section.querySelector('[data-category-next]');
    const progress = section.querySelector('.category-progress-fill');
    const count = section.querySelector('.category-count');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    // Offscreen buffers repeat the same sequence, never a second visible section.
    // Only the canonical cycle participates in tab order and screen-reader output.
    const replica = () => {
      const fragment = document.createDocumentFragment();
      cards.forEach(card => {
        const copy = card.cloneNode(true);
        copy.dataset.loopReplica = 'true';
        copy.tabIndex = -1;
        copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        fragment.append(copy);
      });
      return fragment;
    };
    for (let i = 0; i < 3; i++) track.prepend(replica());
    for (let i = 0; i < 3; i++) track.append(replica());
    let step = 0, cycle = 0, origin = 0, frame = 0, animation = null;
    let drag = null, dragged = false, lastPosition = 0;
    const normalize = () => {
      let position = track.scrollLeft;
      // Rebase outside the central buffer, before either physical edge is close.
      if (position < origin - cycle / 2 || position >= origin + cycle * 1.5) {
        const wrapped = loop.wrap(position, cycle, origin);
        const shift = wrapped - position;
        track.scrollLeft = wrapped;
        position = track.scrollLeft;
        if (drag) drag.left += shift;
        if (animation) { animation.from += shift; animation.to += shift; }
      }
      return position;
    };
    const update = () => {
      if (!cycle) return;
      const position = normalize();
      lastPosition = position;
      const index = loop.index(position - origin, step, cards.length);
      progress.style.width = `${100 * (index + 1) / cards.length}%`;
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; animation = null; };
    const animateTo = target => {
      stop();
      if (reduced.matches) { track.scrollLeft = target; update(); return; }
      animation = { from: track.scrollLeft, to: target, started: performance.now() };
      const tick = now => {
        if (!animation || !section.isConnected) return;
        const t = Math.min(1, (now - animation.started) / 360);
        const ease = 1 - Math.pow(1 - t, 3);
        track.scrollLeft = animation.from + (animation.to - animation.from) * ease;
        update();
        if (t < 1) frame = requestAnimationFrame(tick);
        else { animation = null; frame = 0; }
      };
      frame = requestAnimationFrame(tick);
    };
    const move = direction => {
      const base = animation ? animation.to : track.scrollLeft;
      animateTo(origin + (Math.round((base - origin) / step) + direction) * step);
    };
    const resize = new ResizeObserver(() => {
      const logical = cycle ? (lastPosition - origin) / step : 0;
      stop();
      step = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
      cycle = step * cards.length;
      origin = cycle * 3;
      track.scrollLeft = origin + loop.modulo(logical, cards.length) * step;
      update();
    });
    resize.observe(track);
    previous.disabled = next.disabled = false;
    previous.onclick = () => move(-1);
    next.onclick = () => move(1);
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); animateTo(origin + (event.key === 'Home' ? 0 : cards.length - 1) * step);
      }
    });
    track.addEventListener('wheel', event => {
      if (event.ctrlKey) return;
      stop();
      const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * factor;
      if (!delta) return;
      event.preventDefault();
      // Modulo also protects against oversized wheel events spanning many cycles.
      track.scrollLeft += Math.sign(delta) * (Math.abs(delta) % cycle);
      update();
    }, { passive: false });
    track.addEventListener('pointerdown', event => {
      stop(); dragged = false;
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { x: event.clientX, left: track.scrollLeft, id: event.pointerId };
    });
    track.addEventListener('pointermove', event => {
      if (!drag) return;
      const distance = event.clientX - drag.x;
      if (Math.abs(distance) > 6) {
        dragged = true; track.classList.add('is-dragging'); track.setPointerCapture(drag.id);
      }
      if (dragged) { track.scrollLeft = drag.left - distance; update(); }
    });
    const end = () => { drag = null; track.classList.remove('is-dragging'); };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('lostpointercapture', end);
    track.addEventListener('dragstart', event => event.preventDefault());
    track.addEventListener('click', event => {
      if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; }
    }, true);
    const cleanup = new MutationObserver(() => {
      if (!section.isConnected) { stop(); resize.disconnect(); cleanup.disconnect(); }
    });
    cleanup.observe(document.getElementById('m'), { childList: true });
  }
  new MutationObserver(setup).observe(document.getElementById('m'), { childList: true });
  setup();
})();
