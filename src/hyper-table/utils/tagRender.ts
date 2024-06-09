import { ColumnsDefine, CustomLayout } from '@visactor/vtable';
import { INode } from '@visactor/vtable/es/vrender';
import { ITiddlerFields } from 'tiddlywiki';

/**
 * for `tags` field, use tag pill custom render
 */
export function addTagRender(columns: ColumnsDefine): void {
  const currentPalette: Record<string, string> = $tw.wiki.getTiddlerData($tw.wiki.getTiddlerText('$:/palette') ?? '$:/palettes/Vanilla');
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
          const { backgroundColor, textColor } = getTagAndTextColor(record, currentPalette);
          const tag = new CustomLayout.Tag({
            text: record.tags[index],
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
          rootContainer.add(tag as unknown as INode);
        }
        return { renderDefault: false, rootContainer };
      };
    }
  });
}

function getTagAndTextColor(fields: ITiddlerFields, currentPalette: Record<string, string | undefined>) {
  const { color, tags } = fields;

  const backgroundColor = color ?? tags?.map((tagName) => $tw.wiki.getTiddler(tagName)?.fields?.color).find(Boolean) ?? currentPalette['tag-background'];
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
