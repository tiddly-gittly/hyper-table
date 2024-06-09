/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */
import { ColumnsDefine } from '@visactor/vtable';
import { getFieldName } from './getFieldName';

export function evalColumnJSString(columnJSString: string): ColumnsDefine | undefined {
  // try if is JS string, parse and execute it to get the config JSON
  try {
    const parsedColumns = new Function(
      `return ${columnJSString}`,
    )() as ColumnsDefine | undefined;
    if (parsedColumns !== undefined) {
      return parsedColumns.map((column) => {
        if (column.title !== undefined) {
          column.title = getFieldName(typeof column.title === 'string' ? column.title : column.title());
        } else if (column.field !== undefined) {
          column.title = getFieldName(String(column.field));
        }
        return column;
      });
    }
  } catch (error) {
    console.error(`hyper-table list-table failed to parse columns\n\n${columnJSString}`, error);
  }
}
