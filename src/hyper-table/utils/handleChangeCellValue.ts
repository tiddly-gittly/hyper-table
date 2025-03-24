export function handleChangeCellValue(title: string, field: string, changedValue: string | number, currentValue: unknown) {
  if (changedValue === currentValue) return;
  if (typeof currentValue === 'string' || typeof currentValue === 'number') {
    return $tw.wiki.setText(title, field, undefined, String(changedValue));
  }
  // DEBUG: console currentValue
  console.log(`currentValue`, currentValue);
  // DEBUG: console changedValue
  console.log(`changedValue`, changedValue);
  if (Array.isArray(currentValue)) {
    const tiddlerFields = $tw.wiki.getTiddler(title)?.fields;
    if (tiddlerFields === undefined) return;
    const newFields = { ...tiddlerFields, [field]: String(changedValue).split(',') };
    // DEBUG: console newFields
    console.log(`newFields`, newFields);
    $tw.wiki.addTiddler(newFields);
  }

}