/* eslint-disable @typescript-eslint/no-implied-eval */

import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { ListTableConstructorOptions, ListTableSimple, PivotTableConstructorOptions, PivotTableSimple, registerMenu, themes } from '@visactor/vtable';
import { SearchComponent } from '@visactor/vtable-search';
import { registerCustomCellStylePlugin } from '@visactor/vtable/es/plugins/custom-cell-style';
import { ColumnsDefine, IColumnDimension, IIndicator, IRowDimension, SortState, TableEventHandlersEventArgumentMap } from '@visactor/vtable/es/ts-types';
import { IChangedTiddlers, ITextParseTreeNode, ITiddlerFields, IWikiASTNode } from 'tiddlywiki';
import { evalColumnJSString } from '../utils/evalColumnJSString';
import { getEnumName } from '../utils/getFieldName';
import { handleChangeCellValue } from '../utils/handleChangeCellValue';
import { onCellClickEvent } from '../utils/onCellClickEvent';
import { parseColumnShortcut } from '../utils/parseColumnShortcut';
import { registerEditors } from '../utils/registerEditors';
import { addTagRender } from '../utils/tagRender';
import { searchBar } from './search-bar/searchBar';

import './style.css';
import { parseWikiTextTable } from '../utils/wikiTextTable';

registerMenu();
registerCustomCellStylePlugin();

class ListTableWidget extends Widget {
  tableInstance?: ListTableSimple | PivotTableSimple;
  previousFilterResult: string[] = [];
  paletteChangeListener?: (event: unknown) => void;

  refresh(changedTiddlers: IChangedTiddlers) {
    if (this.shouldRefreshForPaletteChange(changedTiddlers)) {
      this.refreshSelf();
      return true;
    }
    const changedAttributes = this.computeAttributes();
    if (Object.keys(changedAttributes).length > 0) {
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
      if (deleted.some((title) => this.previousFilterResult.includes(title))) {
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
    const { containerElement, tableContainerElement } = this.getContainerElement();
    const option: ListTableConstructorOptions = {
      container: tableContainerElement,
      keyboardOptions: {
        copySelected: true,
        pasteValueToCell: true,
        selectAllOnCtrlA: true,
        editCellOnEnter: true,
        moveFocusCellOnTab: true,
      },
      ...this.getCommonOptions(),
      ...this.getRecordsAndColumns(),
      ...this.getSortOptions(),
      ...(this.getOtherOptionFromString() ?? {}) as ListTableConstructorOptions,
    };
    this.tableInstance = new ListTableSimple(option);
    this.additionalFeatures(containerElement);
    this.registerPaletteChangeListener();

    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);
  }

  protected getRecordsAndColumns() {
    const child = (this.parseTreeNode as IWikiASTNode).children?.[0];
    if (child?.type === 'text') {
      const parsedTable = parseWikiTextTable((child as ITextParseTreeNode).text);
      if (parsedTable) {
        return parsedTable;
      }
    }

    return {
      records: this.getRecords(),
      columns: this.getListColumns(),
    };
  }

  protected additionalFeatures(containerElement: HTMLElement) {
    if (!this.tableInstance) return;
    const enableTitleFieldNavigate = this.getAttribute('titleNav') !== 'no';
    if (enableTitleFieldNavigate) {
      this.tableInstance.on(ListTableSimple.EVENT_TYPE.DBLCLICK_CELL, (event) => {
        onCellClickEvent(event, this);
      });
    }
    const enableEdit = this.getAttribute('editable') === 'yes';
    if (enableEdit) {
      registerEditors();
      this.tableInstance.on(ListTableSimple.EVENT_TYPE.CHANGE_CELL_VALUE, this.handleChangeCellValue.bind(this));
    }
    let searchBarPosition = null;
    if (this.getAttribute('search') === 'search-bar') {
      searchBarPosition = 'bottom' as const;
    } else if (this.getAttribute('search') === 'search-bar-top') {
      searchBarPosition = 'top' as const;
    }
    if (searchBarPosition) {
      const search = new SearchComponent({
        table: this.tableInstance,
        autoJump: true,
      });
      searchBar(search, containerElement, searchBarPosition);
    }
  }

  private handleChangeCellValue(event: TableEventHandlersEventArgumentMap[typeof ListTableSimple.EVENT_TYPE.CHANGE_CELL_VALUE]) {
    const { col: columnIndex, row: rowIndex, changedValue, currentValue } = event;
    const records = this.tableInstance?.records as ITiddlerFields[] | undefined;
    const record = records?.[rowIndex - 1];
    const recordTitle = typeof record?.title === 'string' ? record.title : undefined;
    const columnKey = this.getListColumns()?.[columnIndex]?.field?.toString?.();
    if (recordTitle !== undefined && recordTitle !== '' && typeof columnKey === 'string' && this.wiki.tiddlerExists(recordTitle)) {
      handleChangeCellValue(recordTitle, columnKey, changedValue, currentValue);
    }
  }

  protected tableContainerClassName = 'tc-hyper-table-list-table';

  protected getContainerElement() {
    const height = this.getAttribute('height') || '400px';
    const width = this.getAttribute('width') || '100%';
    const containerElement = $tw.utils.domMaker('p', {
      class: 'tc-hyper-table',
    });
    const tableContainerElement = $tw.utils.domMaker('div', {
      class: this.tableContainerClassName,
      style: {
        height,
        width,
      },
    });
    containerElement.append(tableContainerElement);
    return { containerElement, tableContainerElement };
  }

  protected getCommonOptions() {
    const widthMode = this.getAttribute('widthMode') as 'standard' | 'adaptive' | 'autoWidth' | undefined || 'adaptive';
    const isDarkMode = this.wiki.getTiddler(this.getCurrentPaletteTitle())?.fields['color-scheme'] === 'dark';
    const lightTheme = (this.getAttribute('lightTheme') as 'DEFAULT' | undefined) ?? 'DEFAULT';
    const darkTheme = (this.getAttribute('darkTheme') as 'DARK' | undefined) ?? 'DARK';
    return {
      widthMode,

      theme: isDarkMode ? themes[darkTheme] : themes[lightTheme],
    };
  }

  protected getPaletteWiki() {
    return $tw.wiki;
  }

  protected getCurrentPaletteTitle() {
    return this.getPaletteWiki().getTiddlerText('$:/palette', '$:/palettes/Vanilla');
  }

  protected shouldRefreshForPaletteChange(changedTiddlers: IChangedTiddlers) {
    const currentPaletteTitle = this.getCurrentPaletteTitle();
    return (
      ('$:/palette' in changedTiddlers && changedTiddlers['$:/palette'].modified) ||
      (currentPaletteTitle in changedTiddlers && changedTiddlers[currentPaletteTitle].modified)
    );
  }

  protected registerPaletteChangeListener() {
    const paletteWiki = this.getPaletteWiki();
    if (this.paletteChangeListener !== undefined || paletteWiki === this.wiki) {
      return;
    }
    this.paletteChangeListener = (event) => {
      if (this.shouldRefreshForPaletteChange(event as IChangedTiddlers)) {
        this.refreshSelf();
      }
    };
    paletteWiki.addEventListener('change', this.paletteChangeListener);
  }

  protected unregisterPaletteChangeListener() {
    if (this.paletteChangeListener === undefined) {
      return;
    }
    this.getPaletteWiki().removeEventListener('change', this.paletteChangeListener);
    this.paletteChangeListener = undefined;
  }

  private getSortOptions(): Partial<ListTableConstructorOptions> {
    const sortValue = this.getAttribute('sort', 'modified');
    if (sortValue === 'no') {
      return { sortState: undefined };
    }
    const sortFields = sortValue.split(/[\s,]+/).filter(field => field.trim() !== '');
    if (sortFields.length === 0) {
      return { sortState: undefined };
    }
    return {
      sortState: sortFields.map(field => ({
        field,
        order: 'ASC' as SortState['order'],
      })) as SortState[],
    };
  }

  removeChildDomNodes(): void {
    this.unregisterPaletteChangeListener();
    if (this.tableInstance !== undefined) {
      this.tableInstance = undefined;
    }
    super.removeChildDomNodes();
  }

  protected getRecords(): unknown[] | undefined {
    const filter = this.getAttribute('filter');
    // remove padding new lines, so it won't change line after `return` in the `new Function`, which cause return undefined.
    const recordsString = this.getAttribute('records')?.trim();
    let records: unknown[] | undefined = [];
    if (filter) {
      const filteredTitles = this.wiki.filterTiddlers(filter, this);
      this.previousFilterResult = filteredTitles;
      records = filteredTitles.map((title) => this.wiki.getTiddler(title)?.fields).filter((item): item is ITiddlerFields => item !== undefined);
    } else if (recordsString) {
      try {
        const parsedRecords = (new Function(
          `return ${recordsString}`,
        ) as () => unknown[] | undefined)();
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
    const columnsString = this.getAttribute('columns')?.trim();
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
    const optionsString = this.getAttribute('options')?.trim();
    if (optionsString) {
      try {
        const parsedOption = (new Function(
          `return ${optionsString}`,
        ) as () => unknown)();
        return parsedOption;
      } catch (error) {
        console.error(`hyper-table list-table failed to parse options\n\n${optionsString}`, error);
      }
    }
  }
}

class PivotTableWidget extends ListTableWidget {
  protected tableContainerClassName = 'tc-hyper-table-pivot-table';

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const { containerElement, tableContainerElement } = this.getContainerElement();
    const option: PivotTableConstructorOptions = {
      container: tableContainerElement,
      keyboardOptions: {
        copySelected: true,
        pasteValueToCell: true,
        selectAllOnCtrlA: true,
        editCellOnEnter: true,
        moveFocusCellOnTab: true,
      },
      ...this.getCommonOptions(),
      records: this.getRecords(),
      columns: this.getPivotOption('columns', ['tags']) as IColumnDimension[],
      rows: this.getPivotOption('rows', ['title']) as IRowDimension[],
      indicators: this.getPivotOption('indicators', ['created', 'modified']) as IIndicator[],
      ...(this.getOtherOptionFromString() ?? {}) as PivotTableConstructorOptions,
    };
    this.tableInstance = new PivotTableSimple(option);
    this.additionalFeatures(containerElement);
    this.registerPaletteChangeListener();

    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);
  }

  private getPivotOption(field: string, defaultValue: string[]): unknown {
    const columnsString = this.getAttribute(field)?.trim();
    let columns: unknown = defaultValue;
    if (columnsString) {
      try {
        const parsedOptions = (new Function(
          `return ${columnsString}`,
        ) as () => unknown)();
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
