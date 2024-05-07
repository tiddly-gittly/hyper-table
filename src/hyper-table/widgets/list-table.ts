/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { ListTable, ListTableConstructorOptions, themes, TYPES } from '@visactor/vtable';
import { IChangedTiddlers, ITiddlerFields } from 'tiddlywiki';

class ListTableWidget extends Widget {
  tableInstance?: ListTable;

  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const height = this.getAttribute('height') || '400px';
    const width = this.getAttribute('width') || '100%';
    const isDarkMode = $tw.wiki.getTiddler($tw.wiki.getTiddlerText('$:/palette') ?? '')?.fields?.['color-scheme'] === 'dark';
    const lightTheme = this.getAttribute('lightTheme') as 'DEFAULT' || 'DEFAULT';
    const darkTheme = this.getAttribute('darkTheme') as 'DARK' || 'DARK';
    const containerElement = $tw.utils.domMaker('p', {
      class: 'tc-hyper-table tc-hyper-table-list-table',
      style: {
        height,
        width,
      },
    });
    const option: ListTableConstructorOptions = {
      container: containerElement,
      records: this.getRecords(),
      columns: this.getColumns(),
      widthMode: 'standard',
      // eslint-disable-next-line import/namespace
      theme: isDarkMode ? themes[darkTheme] : themes[lightTheme],
    };
    this.tableInstance = new ListTable(option);

    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);
  }

  removeChildDomNodes(): void {
    if (this.tableInstance !== undefined) {
      this.tableInstance = undefined;
    }
    super.removeChildDomNodes();
  }

  protected getRecords(): unknown[] | undefined {
    const filter = this.getAttribute('filter');
    const recordsString = this.getAttribute('records');
    let records: unknown[] | undefined = [];
    if (filter) {
      records = this.wiki.filterTiddlers(filter).map((title) => $tw.wiki.getTiddler(title)?.fields).filter((item): item is ITiddlerFields => item !== undefined);
    } else if (recordsString) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        records = new Function(
          `return ${recordsString}`,
        )() as unknown[] | undefined;
      } catch (error) {
        console.error(`hyper-table list-table failed to parse records\n\n${recordsString}`, error);
      }
    }
    return records;
  }

  protected getColumns(): TYPES.ColumnsDefine | undefined {
    const columnsString = this.getAttribute('columns');
    let columns: TYPES.ColumnsDefine | undefined = [{ field: 'title', title: 'Title', width: 'auto' }];
    if (columnsString) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const parsedColumns = new Function(
          `return ${columnsString}`,
        )() as TYPES.ColumnsDefine | undefined;
        if (columns !== undefined) {
          columns = parsedColumns;
        }
      } catch (error) {
        console.error(`hyper-table list-table failed to parse columns\n\n${columnsString}`, error);
      }
    }
    return columns;
  }
}

declare let exports: {
  ListTableWidget: typeof ListTableWidget;
};
exports.ListTableWidget = ListTableWidget;
