import {catalogEntries} from './catalog.mjs';

const controls = [
  ['spinbutton', 'Spin Button', 'Number input', 'Enter a copy count or adjust it one step at a time.', 'react-spinbutton'],
];

const forms = [
  ['field', 'Form Field', 'Field', 'Enter a three-digit code to change the field validation state.', 'react-field'],
  ['input', 'Text Input', 'Input', 'Edit the draft title and see the preview update as you type.', 'react-input'],
  ['textarea', 'Textarea', 'Input', 'Write a note with an 80-character limit and a live counter.', 'react-textarea'],
  ['info-label', 'Info Label', 'Popover', 'Open the help attached to a label to learn what the field is for.', 'react-infolabel'],
  ['select', 'Native Select', 'Select', 'Choose a file type in the platform’s native select control.', 'react-select'],
];

const navigation = [
  ['breadcrumb', 'Breadcrumb', 'Navigation', 'Go back one level in the project path and reopen the draft.', 'react-breadcrumb'],
  ['link', 'Link', 'Navigation', 'Follow an in-page link to reveal and jump to a shortcut.', 'react-link'],
  ['list', 'Selectable List', 'List', 'Select multiple entries using the list’s built-in selection.', 'react-list'],
  ['virtualizer', 'Virtualized List', 'List', 'Scroll through 200 rows as the visible items are rendered on demand.', 'react-virtualizer'],
];

const feedback = [
  ['button', 'Action Button', 'Button', 'Save a draft and see the action label change.', 'react-button'],
  ['compound-button', 'Compound Button', 'Button', 'Trigger an action with a label and a short supporting description.', 'react-button'],
  ['info-button', 'Info Button', 'Popover', 'Press the information button to see the file size limit.', 'react-infolabel'],
  ['alert', 'Alert', 'Notification', 'Dismiss and replay a notification using the legacy Alert component.', 'react-alert'],
  ['interaction-tag', 'Interaction Tag', 'Tags', 'Use separate buttons to select a tag or remove it.', 'react-tags'],
];

export const otherFluentWorks = Object.entries({controls, forms, navigation, feedback})
  .flatMap(([group, samples]) => catalogEntries(group, samples));
