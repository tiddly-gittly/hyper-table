/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { MousePointerCellEvent } from '@visactor/vtable';
import { ITiddlerFields, Widget } from 'tiddlywiki';

export function onCellClickEvent(event: MousePointerCellEvent, widget: Widget) {
  if (event.field === 'title') {
    const originalTitle = (event.originData as ITiddlerFields | undefined)?.title ?? event.value as string;
    if (originalTitle) {
      widget.dispatchEvent({
        type: 'tm-navigate',
        // `title` field on event.value maybe formatted using `fieldFormat` columns option, so we use `originData` to get the original value.
        navigateTo: originalTitle,
        navigateFromTitle: widget.getVariable('currentTiddler'),
      });
    } else {
      console.error('hyper-table list-table failed to get title field from event', event);
    }
  }
}
