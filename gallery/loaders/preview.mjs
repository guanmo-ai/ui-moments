import {originalMarkup} from './originals.mjs';

export function createLoaderPreview(item, values) {
  const element = document.createElement('span');
  element.attachShadow({mode: 'open'}).innerHTML = originalMarkup(item, values);
  element.setAttribute('aria-hidden', 'true');
  return element;
}

export function setPreviewPlaying(preview,playing){
  for(const animation of preview?.shadowRoot?.getAnimations()||[])playing?animation.play():animation.pause();
}
