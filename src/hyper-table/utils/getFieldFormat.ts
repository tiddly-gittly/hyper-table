import { ITiddlerFields, Widget } from 'tiddlywiki';

export function getTextFieldFormat(field: string, widget: Widget): (record: ITiddlerFields) => string {
  return (record: ITiddlerFields) => {
    // try render caption, if column is title.
    const fieldValue = record[field];
    const valueToRender = field === 'title'
      ? ((record.caption as string | undefined) || record.title)
      : (typeof fieldValue === 'string' || typeof fieldValue === 'number' || typeof fieldValue === 'boolean' ? String(fieldValue) : '');
    const renderedResult = widget.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', valueToRender, {
      variables: { currentTiddler: record.title },
      parentWidget: widget,
    });
    return renderedResult;
  };
}
