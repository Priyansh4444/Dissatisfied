/**
 * Hero "Dissatisfied" focus preview: toggles `body.focus-hover`.
 * Must re-run after Astro View Transitions (new DOM nodes; inline scripts do not).
 */
let teardown: (() => void) | null = null;

function clearFocusHover() {
  document.body.classList.remove('focus-hover');
  const btn = document.querySelector<HTMLButtonElement>('.focus-demo-trigger');
  if (btn) btn.setAttribute('aria-pressed', 'false');
}

function setupHomeFocus() {
  teardown?.();
  teardown = null;

  const title = document.querySelector<HTMLElement>('.focus-title-trigger');
  const btn = document.querySelector<HTMLButtonElement>('.focus-demo-trigger');

  if (!title) {
    clearFocusHover();
    return;
  }

  clearFocusHover();

  const ac = new AbortController();
  const { signal } = ac;

  function on() {
    document.body.classList.add('focus-hover');
    if (btn) btn.setAttribute('aria-pressed', 'true');
  }
  function off() {
    document.body.classList.remove('focus-hover');
    if (btn) btn.setAttribute('aria-pressed', 'false');
  }

  if (window.matchMedia('(hover: hover)').matches) {
    title.addEventListener('mouseenter', on, { signal });
    title.addEventListener('mouseleave', off, { signal });
    // After SPA navigation the pointer may still be over the title without a new mouseenter.
    if (title.matches(':hover')) on();
  }

  if (btn && window.matchMedia('(hover: none)').matches) {
    btn.addEventListener(
      'click',
      () => {
        const next = !document.body.classList.contains('focus-hover');
        if (next) on();
        else off();
      },
      { signal },
    );
  }

  teardown = () => ac.abort();
}

setupHomeFocus();
document.addEventListener('astro:page-load', setupHomeFocus);
