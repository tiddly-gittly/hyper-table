import { ColumnsDefine, CustomLayout } from '@visactor/vtable';
import { INode } from '@visactor/vtable/es/vrender';
import { ITiddlerFields, Widget } from 'tiddlywiki';

/**
 * for `tags` field, use tag pill custom render
 */
export function addTagRender(columns: ColumnsDefine, widget: Widget): void {
  const currentPalette: Record<string, string> = $tw.wiki.getTiddlerData($tw.wiki.getTiddlerText('$:/palette') ?? '$:/palettes/Vanilla');
  const omitTags = widget.wiki.filterTiddlers(widget.getAttribute('omitTags') ?? '');
  columns.forEach((column) => {
    if (column.field === 'tags') {
      column.customLayout = (arguments_) => {
        const { table, row, col, rect } = arguments_;
        const record = table.getRecordByCell(col, row) as ITiddlerFields;
        const { height, width } = rect ?? table.getCellRect(col, row);
        const rootContainer = new CustomLayout.Group({
          height,
          width,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
        });
        if (record.tags === undefined || record.tags.length === 0) return { renderDefault: true, rootContainer };
        for (let index = 0; index < record.tags.length; index++) {
          const tagTitle = record.tags[index];
          if (omitTags.includes(tagTitle)) continue;
          const { backgroundColor, textColor } = getTagAndTextColor(tagTitle, currentPalette);
          const tag = new CustomLayout.Tag({
            text: tagTitle,
            textStyle: {
              fontSize: 10,
              fontFamily: 'sans-serif',
              fill: textColor,
            },
            panel: {
              visible: true,
              fill: backgroundColor,
              cornerRadius: 5,
            },
            space: 5,
            boundsPadding: 10,
          });
          tag.addEventListener('dblclick', () => {
            onTagClickHandler(tagTitle, widget);
          });
          rootContainer.add(tag as unknown as INode);
        }
        return { renderDefault: false, rootContainer };
      };
    }
  });
}

function onTagClickHandler(tagTitle: string, widget: Widget) {
  widget.dispatchEvent({
    type: 'tm-navigate',
    navigateTo: tagTitle,
    navigateFromTitle: widget.getVariable('currentTiddler'),
  });
}

/**
 * Similar to the `mapTiddlerFieldsToFullCalendarEventObject` in tw-calendar, but simplified to only use tag's color, not tiddler's color.
 */
function getTagAndTextColor(tagTitle: string, currentPalette: Record<string, string | undefined>) {
  const backgroundColor = $tw.wiki.getTiddler(tagTitle)?.fields?.color ?? currentPalette['tag-background'];
  let textColor: string | undefined;

  if (backgroundColor !== undefined) {
    const contractColorResult = contrastColour(
      backgroundColor,
      currentPalette['tag-background'] ?? '#f4f4f2',
      currentPalette.foreground ?? 'rgb(51, 101, 238)',
      currentPalette.background ?? '#f4f4f2',
    );
    if (Array.isArray(contractColorResult)) {
      textColor = `rgba(${contractColorResult.join(',')})`;
    } else {
      textColor = contractColorResult;
    }
  }
  return { backgroundColor, textColor };
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const contrastColour: (colour: string, fallbackTarget: string, colourFore: string, colourBack: string) => number[] | string =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  require('$:/core/modules/macros/contrastcolour.js').run;
