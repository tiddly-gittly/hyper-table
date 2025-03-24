export function handleChangeCellValue(title: string, field: string, changedValue: string | number, currentValue: unknown) {
  if (changedValue === currentValue) return;
  if (typeof currentValue === 'string' || currentValue === undefined || typeof currentValue === 'number') {
    return $tw.wiki.setText(title, field, undefined, String(changedValue));
  }
  if (Array.isArray(currentValue)) {
    const tiddlerFields = $tw.wiki.getTiddler(title)?.fields;
    if (tiddlerFields === undefined) return;
    const newFields = { ...tiddlerFields, [field]: String(changedValue).split(',') };
    $tw.wiki.addTiddler(newFields);
  }

}