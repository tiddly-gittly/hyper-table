/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { ColumnDefine } from '@visactor/vtable';
import { ITiddlerFields, Widget } from 'tiddlywiki';
import { getFieldName } from './getFieldName';

export function parseColumnShortcut(columnsString: string, widget: Widget, options?: {editable?: boolean}) {
  return columnsString.split('|').map((field) =>
    ({
      cellType: 'text',
      field,
      title: getFieldName(field),
      width: 'auto',
      sort: true,
      editor: (options?.editable && field !== 'title') ? 'text-editor' : undefined,
      fieldFormat: (record: ITiddlerFields) => {
        // try render caption, if column is title.
        const valueToRender = field === 'title' ? ((record.caption as string | undefined) || record.title) : String(record[field]);
        const renderedResult = widget.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', valueToRender, {
          variables: { currentTiddler: record.title },
          parentWidget: widget,
        });
        return renderedResult;
      },
    }) satisfies ColumnDefine
  );
}
