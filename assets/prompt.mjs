import {htmlExample,reactExample} from '../gallery/loaders/snippets.mjs';
import {onLanguageChange,translate as t} from './locale.mjs';

const site = 'https://guanmo-ai.github.io/ui-moments/';
const repository = 'https://github.com/guanmo-ai/ui-moments';
const raw = 'https://raw.githubusercontent.com/guanmo-ai/ui-moments/main/';

export function loaderPrompt(item, props, markup, license, background) {
  const settings = Object.entries(props).map(([key, value]) => `${key}: ${value}`).join(', ');
  const reactSetup = item.original ? 'Use the JSX below in React projects.' : "For React, use the example below and pin the dependency with the project's package manager.";
  return `Implement the ${item.name} loader in the current workspace and run a local demo.

Preview: ${site}#${item.key}
Motion: ${item.description} Use a continuous loop to indicate an indeterminate wait.
Settings: ${settings}. Preview background: ${background}.

Check the project layout, stack, and style conventions first. ${reactSetup} The examples use the preview animation. For HTML projects, use the standalone markup and styles below. In an empty workspace, save the example as index.html and open it in a browser.

Expose the size, color, and duration when supported. Put the component where users are waiting and give it an accessible loading label. Respect prefers-reduced-motion and verify contrast on both light and dark backgrounds. Keep the original attribution and full MIT license below.

Open the local example and verify the animation, settings, and reduced motion. Report the changed files and launch command.

Standalone HTML
\`\`\`html
${htmlExample(item, props, markup, license, background).trim()}
\`\`\`

React usage
\`\`\`jsx
${reactExample(item, props, license).trim()}
\`\`\``;
}

export function componentPrompt(item) {
  const built = item.demo.includes('/dist/');
  const [file, scene] = item.demo.split('#');
  const query = new URL(item.demo, site).search;
  const source = built || item.multiFile ? `${repository}/tree/main/${item.source}` : `${repository}/blob/main/${file}`;
  const notes = (item.notes || []).map(note => `- ${note}`).join('\n');
  const resources = (item.sourceFiles || []).map(path => raw + path).join('\n');
  const license = item.credit?.licensePath
    ? `Preserve the upstream copyright notice and full MIT license at ${raw}${item.credit.licensePath}.`
    : `Keep the source notices and license at ${repository}/blob/main/LICENSE.`;
  const setup = item.multiFile
    ? `Copy the files from the Code directory and keep their relative paths. Read its README for shared assets. Run python3 -m http.server 5173 from the repository root and open http://localhost:5173/${file}. Verify the source demo locally before integrating it.`
    : built
    ? `Read the README, package.json, and src in the source directory. ${resources ? `Include the shared styles at their repository-relative paths:\n${resources}\n` : ''}To run the component locally, copy its directory and run npm ci, then npm run dev. ${query ? `Append ${query} to the development URL to open this component. ` : ''}Use the existing build configuration, package manager, and required dependencies when integrating it.`
    : `Get the HTML, CSS, and JavaScript from ${raw}${file}. ${resources ? `\nInclude the upstream styles at the paths referenced by the HTML:\n${resources}\n` : ''}Save the file in the workspace. Use index.html in an empty project. For a standalone demo, omit the gallery-only embed.js and keep relative asset paths if using the original layout. Run python3 -m http.server 5173 in the demo directory and open http://localhost:5173/${scene ? `#${scene}` : ''}. Verify the source demo locally before integrating it.`;
  const attribution = item.credit
    ? `${item.library ? 'Source' : 'Inspiration'}: ${item.credit.name} ${item.credit.url}. ${item.credit.note || ''}`
    : 'Source: UI Moments.';

  return `Implement ${item.title} in the current workspace and run a local interactive demo.

Preview: ${site}#${item.id}
Code: ${source}
${attribution}

Design and behavior
${item.summary}
${notes}
${scene ? `\nUse the #${scene} demo. Keep its controls, visual feedback, and required logic when integrating it.\n` : ''}
Local implementation
Check the project stack and file structure first. ${setup}
Keep a visible keyboard focus state, touch support, and a layout that fits mobile screens. Respect reduced motion. ${license}

Try the demo and verify the listed state changes. Report the changed files, local URL, and launch command.`;
}

export function mountPrompt(dialog, getPrompt, copy) {
  const close = dialog.querySelector('.close');
  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  actions.innerHTML = '<button type="button" class="primary">Copy prompt</button>';
  const save = dialog.querySelector('[data-save-work]');
  close.before(actions);
  if (save) actions.append(save);
  actions.append(close);

  const preview = document.createElement('details');
  preview.className = 'prompt-preview';
  preview.innerHTML = `
    <summary>View prompt</summary>
    <div class="prompt-toolbar">
      <p>Paste into Codex, Cursor, or Claude Code.</p>
      <button type="button" class="prompt-copy">Copy prompt</button>
    </div>
    <textarea lang="en" aria-label="Component prompt" readonly spellcheck="false" rows="8"></textarea>`;
  const code = dialog.querySelector('.code-section');
  if (code) code.before(preview);
  else dialog.append(preview);

  const field = preview.querySelector('textarea');
  const refresh = () => { if (preview.open) field.value = getPrompt(); };
  preview.addEventListener('toggle', refresh);
  const inlineCopy = preview.querySelector('.prompt-copy');
  const dialogCopy = actions.querySelector('button');
  let inlineCopied = false;
  let feedbackTimer;
  function localize(){
    dialogCopy.textContent=t('Copy prompt');
    preview.querySelector('summary').textContent=t('View prompt');
    preview.querySelector('.prompt-toolbar p').textContent=t('Paste into Codex, Cursor, or Claude Code.');
    field.setAttribute('aria-label',t('Component prompt'));
    inlineCopy.textContent=t(inlineCopied?'Copied':'Copy prompt');
  }
  localize();
  onLanguageChange(localize);
  const resetFeedback = () => {
    clearTimeout(feedbackTimer);
    inlineCopied = false;
    inlineCopy.textContent = t('Copy prompt');
  };
  const copyPrompt = async (event) => {
    const inline = event.currentTarget === inlineCopy;
    const prompt = getPrompt();
    const copied = await copy(prompt, {
      success: 'Prompt copied',
      failure: 'Select and copy the prompt manually',
    });
    if (!dialog.open) return;
    if (copied && inline) {
      resetFeedback();
      inlineCopied = true;
      inlineCopy.textContent = t('Copied');
      feedbackTimer = setTimeout(resetFeedback, 2400);
    } else if (!copied) {
      preview.open = true;
      field.value = prompt;
      field.focus();
      field.select();
    }
  };
  dialogCopy.addEventListener('click', copyPrompt);
  inlineCopy.addEventListener('click', copyPrompt);
  dialog.addEventListener('close', () => {
    preview.open = false;
    field.value = '';
    resetFeedback();
  });
  return refresh;
}
