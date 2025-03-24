/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { ColumnDefine } from '@visactor/vtable';
import { Widget } from 'tiddlywiki';
import { getTextFieldFormat } from './getFieldFormat';
import { getFieldName } from './getFieldName';

export function parseColumnShortcut(columnsString: string, widget: Widget, options?: { editable?: boolean }) {
  return columnsString.split('|').map((field) => {
    let editor: string | undefined;
    if (
      options?.editable && // TODO: add other editor types, register them in `src/hyper-table/utils/registerEditors.ts`
      field !== 'title'
    ) {
      editor = 'text-editor';
    }
    return {
      cellType: 'text',
      field,
      title: getFieldName(field),
      width: 'auto',
      sort: true,
      editor,
      fieldFormat: getTextFieldFormat(field, widget),
    } satisfies ColumnDefine;
  });
}
