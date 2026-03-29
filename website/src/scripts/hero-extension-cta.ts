import { getInstallTarget } from './install-target';

function apply() {
  const el = document.getElementById('hero-extension-cta') as HTMLAnchorElement | null;
  if (!el) return;

  const icon = el.querySelector<HTMLImageElement>('[data-hero-cta-icon]');
  const text = el.querySelector<HTMLElement>('[data-hero-cta-text]');
  const target = getInstallTarget();

  el.href = target.href;
  el.setAttribute('aria-label', target.ariaLabel);

  if (icon) {
    icon.src = target.iconSrc;
    icon.alt = target.iconAlt;
  }

  if (text) {
    text.textContent = target.label;
  }
}

apply();
document.addEventListener('astro:page-load', apply);
