import { register } from '@visactor/vtable';
import { DateInputEditor, InputEditor, TextAreaEditor } from '@visactor/vtable-editors';

export function registerEditors() {
  const inputEditor = new InputEditor();
  const textAreaEditor = new TextAreaEditor();
  const dateInputEditor = new DateInputEditor();
  // TODO: currently it don't support multi-value selection, so useless.
  // const tagsEditor = new ListEditor({ values: Object.keys($tw.wiki.getTagMap()) });

  register.editor('text-editor', inputEditor);
  register.editor('textarea-editor', textAreaEditor);
  register.editor('date-editor', dateInputEditor);
  // register.editor('tags-editor', tagsEditor);
}
