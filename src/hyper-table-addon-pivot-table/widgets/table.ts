import { PivotTable } from "@visactor/vtable";
import { IColumnDimension, IIndicator, IRowDimension, PivotTableConstructorOptions } from "@visactor/vtable/es/ts-types";

const { ListTableWidget } = require('$:/plugins/linonetwo/hyper-table/widgets/table.js');

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
      columns: this.getPivotOption<IColumnDimension[]>('columns', ['tags']),
      rows: this.getPivotOption<IRowDimension[]>('rows', ['title']),
      indicators: this.getPivotOption<IIndicator[]>('indicators', ['created', 'modified']),
      ...(this.getOtherOptionFromString() ?? {}) as PivotTableConstructorOptions,
    };
    this.tableInstance = new PivotTable(option);
    this.additionalFeatures(containerElement);

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
  PivotTableWidget: typeof PivotTableWidget;
};
exports.PivotTableWidget = PivotTableWidget;
