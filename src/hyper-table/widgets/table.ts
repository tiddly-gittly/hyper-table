/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { ListTable, ListTableConstructorOptions, PivotTable, PivotTableConstructorOptions, themes, TYPES } from '@visactor/vtable';
import { IColumnDimension, IIndicator, MousePointerCellEvent } from '@visactor/vtable/es/ts-types';
import { IChangedTiddlers, ITiddlerFields } from 'tiddlywiki';

class ListTableWidget extends Widget {
  tableInstance?: ListTable | PivotTable;

  refresh(_changedTiddlers: IChangedTiddlers) {
    const changedAttributes = this.computeAttributes();
    if ($tw.utils.count(changedAttributes) > 0) {
      this.refreshSelf();
      return true;
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
      this.tableInstance.on(ListTable.EVENT_TYPE.CLICK_CELL, this.onTitleClickEvent.bind(this));
    }

    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);
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
    const widthMode = this.getAttribute('widthMode') as 'standard' | 'adaptive' | 'autoWidth' | undefined || 'standard';
    const isDarkMode = $tw.wiki.getTiddler($tw.wiki.getTiddlerText('$:/palette') ?? '')?.fields?.['color-scheme'] === 'dark';
    const lightTheme = this.getAttribute('lightTheme') as 'DEFAULT' || 'DEFAULT';
    const darkTheme = this.getAttribute('darkTheme') as 'DARK' || 'DARK';
    return {
      widthMode,
      // eslint-disable-next-line import/namespace
      theme: isDarkMode ? themes[darkTheme] : themes[lightTheme],
    };
  }

  protected onTitleClickEvent(event: MousePointerCellEvent) {
    if (event.field === 'title') {
      this.dispatchEvent({
        type: 'tm-navigate',
        navigateTo: event.value,
        navigateFromTitle: this.getVariable('currentTiddler'),
      });
    }
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
      records = this.wiki.filterTiddlers(filter).map((title) => $tw.wiki.getTiddler(title)?.fields).filter((item): item is ITiddlerFields => item !== undefined);
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
    return records;
  }

  private getListColumns(): TYPES.ColumnsDefine | undefined {
    const columnsString = this.getAttribute('columns')?.trim?.();
    let columns: TYPES.ColumnsDefine | undefined = [{ field: 'title', title: 'Title', width: 'auto' }];
    if (columnsString) {
      try {
        const parsedColumns = new Function(
          `return ${columnsString}`,
        )() as TYPES.ColumnsDefine | undefined;
        if (parsedColumns !== undefined) {
          columns = parsedColumns;
        }
      } catch (error) {
        console.error(`hyper-table list-table failed to parse columns\n\n${columnsString}`, error);
      }
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
      rows: this.getPivotOption<TYPES.IRowDimension[]>('rows', ['title']),
      indicators: this.getPivotOption<IIndicator[]>('indicators', ['created', 'modified']),
      ...(this.getOtherOptionFromString() ?? {}) as PivotTableConstructorOptions,
    };
    this.tableInstance = new PivotTable(option);

    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);
  }

  private getPivotOption<T extends IIndicator[] | string[] | undefined>(field: string, defaultValue: string[]): T;
  private getPivotOption<T extends IColumnDimension[] | string[] | undefined>(field: string, defaultValue: string[]): T;
  private getPivotOption<T extends TYPES.IRowDimension[] | string[] | undefined>(field: string, defaultValue: string[]): T {
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
