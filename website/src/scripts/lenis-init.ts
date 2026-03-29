import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let lenis: InstanceType<typeof Lenis> | null = null;

const reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');

function setupLenis() {
  if (reducedMotionMq.matches) {
    lenis?.destroy();
    lenis = null;
    return;
  }
  lenis?.destroy();
  lenis = new Lenis({
    autoRaf: true,
    anchors: true,
  });
}

setupLenis();
document.addEventListener('astro:page-load', setupLenis);

if (typeof reducedMotionMq.addEventListener === 'function') {
  reducedMotionMq.addEventListener('change', setupLenis);
} else {
  reducedMotionMq.addListener(setupLenis);
}
