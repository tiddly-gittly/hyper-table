/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { ListTable, ListTableConstructorOptions, PivotTable, PivotTableConstructorOptions, themes } from '@visactor/vtable';
import { ColumnsDefine, IColumnDimension, IIndicator, IRowDimension, TableEventHandlersEventArgumentMap } from '@visactor/vtable/es/ts-types';
import { IChangedTiddlers, ITiddlerFields } from 'tiddlywiki';
import { evalColumnJSString } from '../utils/evalColumnJSString';
import { getEnumName } from '../utils/getFieldName';
import { onCellClickEvent } from '../utils/onCellClickEvent';
import { parseColumnShortcut } from '../utils/parseColumnShortcut';
import { addTagRender } from '../utils/tagRender';
import { handleChangeCellValue } from '../utils/handleChangeCellValue';
import { registerEditors } from '../utils/registerEditors';

class ListTableWidget extends Widget {
  tableInstance?: ListTable | PivotTable;
  previousFilterResult: string[] = [];

  refresh(changedTiddlers: IChangedTiddlers) {
    const changedAttributes = this.computeAttributes();
    if ($tw.utils.count(changedAttributes) > 0) {
      this.refreshSelf();
      return true;
    }
    const filter = this.getAttribute('filter');
    if (filter) {
      const modified = Object.keys(changedTiddlers).filter((title) => changedTiddlers[title].modified);
      if (modified.length > 0) {
        const results = this.wiki.filterTiddlers(filter, this);
        if (results.length > 0 && modified.some((title) => results.includes(title))) {
          this.refreshSelf();
          return true;
        }
      }
      const deleted = Object.keys(changedTiddlers).filter((title) => changedTiddlers[title].deleted);
      if (deleted.length > 0 && deleted.some((title) => this.previousFilterResult.includes(title))) {
        this.refreshSelf();
        return true;
      }
    }
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const containerElement = this.getContainerElement();
    const option: ListTableConstructorOptions = {
      container: containerElement,
      keyboardOptions: {
        copySelected: true,
        pasteValueToCell: true,
        selectAllOnCtrlA: true,
        editCellOnEnter: true,
        moveFocusCellOnTab: true,
      },
      ...this.getCommonOptions(),
      records: this.getRecords(),
      columns: this.getListColumns(),
      ...(this.getOtherOptionFromString() ?? {}) as ListTableConstructorOptions,
    };
    this.tableInstance = new ListTable(option);
    const enableTitleFieldNavigate = this.getAttribute('titleNav') !== 'no';
    if (enableTitleFieldNavigate) {
      this.tableInstance.on(ListTable.EVENT_TYPE.DBLCLICK_CELL, (event) => {
        onCellClickEvent(event, this);
      });
    }
    const enableEdit = this.getAttribute('editable') === 'yes';
    if (enableEdit) {
      registerEditors();
      this.tableInstance.on(ListTable.EVENT_TYPE.CHANGE_CELL_VALUE, this.handleChangeCellValue.bind(this));
    }

    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);
  }

  private handleChangeCellValue(event: TableEventHandlersEventArgumentMap[typeof ListTable.EVENT_TYPE.CHANGE_CELL_VALUE]) {
    const { col: columnIndex, row: rowIndex, changedValue, currentValue } = event;
    const record = this.tableInstance?.records?.[rowIndex - 1];
    const columnKey = this.getListColumns()?.[columnIndex]?.field?.toString?.();
    if (record?.title && typeof columnKey === 'string' && this.wiki.tiddlerExists(record.title)) {
      handleChangeCellValue(record.title, columnKey, changedValue, currentValue);
    }
  }

  protected getContainerElement() {
    const height = this.getAttribute('height') || '400px';
    const width = this.getAttribute('width') || '100%';
    const containerElement = $tw.utils.domMaker('p', {
      class: 'tc-hyper-table tc-hyper-table-list-table',
      style: {
        height,
        width,
      },
    });
    return containerElement;
  }

  protected getCommonOptions() {
    const widthMode = this.getAttribute('widthMode') as 'standard' | 'adaptive' | 'autoWidth' | undefined || 'adaptive';
    const isDarkMode = this.wiki.getTiddler(this.wiki.getTiddlerText('$:/palette') ?? '')?.fields?.['color-scheme'] === 'dark';
    const lightTheme = this.getAttribute('lightTheme') as 'DEFAULT' || 'DEFAULT';
    const darkTheme = this.getAttribute('darkTheme') as 'DARK' || 'DARK';
    return {
      widthMode,
      // eslint-disable-next-line import/namespace
      theme: isDarkMode ? themes[darkTheme] : themes[lightTheme],
      sortState: [
        {
          field: 'modified',
          order: 'desc'
        },
      ],
    };
  }

  removeChildDomNodes(): void {
    if (this.tableInstance !== undefined) {
      this.tableInstance = undefined;
    }
    super.removeChildDomNodes();
  }

  protected getRecords(): unknown[] | undefined {
    const filter = this.getAttribute('filter');
    // remove padding new lines, so it won't change line after `return` in the `new Function`, which cause return undefined.
    const recordsString = this.getAttribute('records')?.trim?.();
    let records: unknown[] | undefined = [];
    if (filter) {
      const filteredTitles = this.wiki.filterTiddlers(filter, this);
      this.previousFilterResult = filteredTitles;
      records = filteredTitles.map((title) => this.wiki.getTiddler(title)?.fields).filter((item): item is ITiddlerFields => item !== undefined);
    } else if (recordsString) {
      try {
        const parsedRecords = new Function(
          `return ${recordsString}`,
        )() as unknown[] | undefined;
        if (parsedRecords !== undefined) {
          records = parsedRecords;
        }
      } catch (error) {
        console.error(`hyper-table list-table failed to parse records\n\n${recordsString}`, error);
      }
    }
    // translate
    records = records.map((record) =>
      Object.fromEntries(
        Object.entries(record as ITiddlerFields)
          .map(([key, value]) => [key, getEnumName(key, value)]),
      )
    );
    return records;
  }

  private getListColumns(): ColumnsDefine | undefined {
    const columnsString = this.getAttribute('columns')?.trim?.();
    let columns: ColumnsDefine | undefined = [{ field: 'title', title: 'Title', width: 'auto' }];
    if (columnsString) {
      // JS version usually include using `=>` arrow function. This simple version should not
      if (columnsString.includes('|') && !columnsString.includes('=>')) {
        const editable = this.getAttribute('editable') === 'yes';
        columns = parseColumnShortcut(columnsString, this, { editable });
      } else {
        columns = evalColumnJSString(columnsString);
      }
    }
    if (columns !== undefined) {
      addTagRender(columns, this);
    }
    return columns;
  }

  protected getOtherOptionFromString(): unknown {
    const optionsString = this.getAttribute('options')?.trim?.();
    if (optionsString) {
      try {
        const parsedOption = new Function(
          `return ${optionsString}`,
        )() as unknown;
        return parsedOption;
      } catch (error) {
        console.error(`hyper-table list-table failed to parse options\n\n${optionsString}`, error);
      }
    }
  }
}

class PivotTableWidget extends ListTableWidget {
  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const containerElement = this.getContainerElement();
    const option: PivotTableConstructorOptions = {
      container: containerElement,
      keyboardOptions: {
        copySelected: true,
        pasteValueToCell: true,
        selectAllOnCtrlA: true,
        editCellOnEnter: true,
        moveFocusCellOnTab: true,
      },
      ...this.getCommonOptions(),
      records: this.getRecords(),
      columns: this.getPivotOption<IColumnDimension[]>('columns', ['tags']),
      rows: this.getPivotOption<IRowDimension[]>('rows', ['title']),
      indicators: this.getPivotOption<IIndicator[]>('indicators', ['created', 'modified']),
      ...(this.getOtherOptionFromString() ?? {}) as PivotTableConstructorOptions,
    };
    this.tableInstance = new PivotTable(option);

    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);
  }

  private getPivotOption<T extends IIndicator[] | string[] | undefined>(field: string, defaultValue: string[]): T;
  private getPivotOption<T extends IColumnDimension[] | string[] | undefined>(field: string, defaultValue: string[]): T;
  private getPivotOption<T extends IRowDimension[] | string[] | undefined>(field: string, defaultValue: string[]): T {
    const columnsString = this.getAttribute(field)?.trim?.();
    let columns = defaultValue as T;
    if (columnsString) {
      try {
        const parsedOptions = new Function(
          `return ${columnsString}`,
        )() as T;
        if (parsedOptions !== undefined) {
          columns = parsedOptions;
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
  PivotTableWidget: typeof PivotTableWidget;
};
exports.ListTableWidget = ListTableWidget;
exports.PivotTableWidget = PivotTableWidget;
