import { ColumnsDefine } from '@visactor/vtable/es/ts-types';
import { IDomParseTreeNode } from 'tiddlywiki';

type T = IDomParseTreeNode;
export function parseWikiTextTable(input: string): undefined | { columns: ColumnsDefine; records: any[] } {
  const ast = $tw.wiki.parseText('text/vnd.tiddlywiki', input)?.tree;
  if (!(ast?.length > 0) || ast[0]?.type !== 'element' || (ast[0] as T)?.tag !== 'table') {
    return;
  }
  const trElements = ((ast as T[])[0].children as T[])?.find(element => element.type === 'element' && (element).tag === 'tbody')?.children;
  if (!trElements) {
    return;
  }

  // 过滤出所有 tr 元素
  const trs = trElements.filter(tr => tr.type === 'element' && (tr as any).tag === 'tr');
  if (trs.length === 0) {
    return;
  }

  // 提取单元格文本的辅助函数
  const extractText = (element: any): string => {
    if (!element?.children) return '';

    // 递归提取所有文本节点
    const extractTextFromChildren = (children: any[]): string => {
      return children.map(child => {
        if (child.type === 'text') {
          return child.text || '';
        }
        if (child.children) {
          return extractTextFromChildren(child.children);
        }
        return '';
      }).join('');
    };

    return extractTextFromChildren(element.children).trim();
  };

  // 获取表头行
  const headerRow = trs[0] as T;
  const headerCells = (headerRow.children as T[]).filter(cell => cell.type === 'element' && ((cell).tag === 'th' || (cell).tag === 'td'));

  if (headerCells.length === 0) {
    return;
  }

  // 构建列定义和字段名映射
  const columns: ColumnsDefine = [];
  const fieldNames: string[] = [];

  headerCells.forEach((cell, index) => {
    const title = extractText(cell);
    // 将标题转换为字段名
    let field = title
      ? title.trim().replaceAll(/[^\s\w]/g, '').replaceAll(/\s+/g, '').replace(/^(.)/, match => match.toLowerCase())
      : `column${index + 1}`;

    // 确保字段名是唯一的
    if (fieldNames.includes(field)) {
      field = `${field}${index}`;
    }

    fieldNames.push(field);

    columns.push({
      field,
      title: title || `Column ${index + 1}`,
      width: 'auto',
      sort: true,
    });
  });

  // 构建数据记录
  const records: Array<Record<string, string>> = [];

  // 从第二行开始解析数据
  for (let index = 1; index < trs.length; index++) {
    const dataRow = trs[index] as T;
    const dataCells = (dataRow.children as T[]).filter(cell => cell.type === 'element' && (cell.tag === 'td' || cell.tag === 'th'));

    if (dataCells.length === 0) continue;

    const record: Record<string, string> = {};

    // 将每个单元格的值与相应的列字段关联
    dataCells.forEach((cell, cellIndex) => {
      if (cellIndex < fieldNames.length) {
        const field = fieldNames[cellIndex];
        record[field] = extractText(cell);
      }
    });

    // 只有当记录有数据时才添加
    if (Object.keys(record).length > 0) {
      records.push(record);
    }
  }

  return { records, columns };
}
