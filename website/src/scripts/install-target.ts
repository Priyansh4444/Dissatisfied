export const FIREFOX_STORE_URL = 'https://addons.mozilla.org/en-US/firefox/addon/dissatisfied/';
export const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/dissatisfied/kgkpnjpaomleciekmcdgnjnggciindcj';
export const REPO_URL = 'https://github.com/Priyansh4444/Dissatisfied';

/** Used for SSR / no-JS: matches `getInstallTarget` fallback `ariaLabel`. */
export const SSR_INSTALL_ARIA_LABEL = 'Build Dissatisfied from source on GitHub';

export type InstallKind = 'firefox' | 'chromium' | 'fallback';

export interface InstallTarget {
  kind: InstallKind;
  href: string;
  iconSrc: string;
  iconAlt: string;
  label: string;
  ariaLabel: string;
}

export function detectInstallKind(userAgent = navigator.userAgent): InstallKind {
  if (/FxiOS/i.test(userAgent)) return 'firefox';
  if (/Firefox\//i.test(userAgent) && !/Seamonkey/i.test(userAgent)) return 'firefox';
  if (/Edg\//i.test(userAgent)) return 'chromium';
  if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) return 'chromium';
  if (/Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent) || /Chromium\//i.test(userAgent)) {
    return 'chromium';
  }
  return 'fallback';
}

export function getInstallTarget(userAgent = navigator.userAgent): InstallTarget {
  const kind = detectInstallKind(userAgent);

  if (kind === 'firefox') {
    return {
      kind,
      href: FIREFOX_STORE_URL,
      iconSrc: '/browser-firefox.svg',
      iconAlt: 'Firefox',
      label: 'Get extension',
      ariaLabel: 'Get Dissatisfied for Firefox',
    };
  }

  if (kind === 'chromium') {
    return {
      kind,
      href: CHROME_STORE_URL,
      iconSrc: '/browser-chrome.svg',
      iconAlt: 'Chrome',
      label: 'Get extension',
      ariaLabel: 'Get Dissatisfied for Chrome',
    };
  }

  return {
    kind,
    href: REPO_URL,
    iconSrc: '/github-mark.svg',
    iconAlt: 'GitHub',
    label: 'Build from source on GitHub',
    ariaLabel: SSR_INSTALL_ARIA_LABEL,
  };
}
