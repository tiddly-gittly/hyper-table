/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { JSONSchema4 } from 'json-schema';

/**
 * If no trait tag provide the translation, will have `null`. If unchecked, it will be `undefined`.
 */
const cachedFieldTranslation: Record<string, string | null | undefined> = {};
let traitTagSchemas: JSONSchema4[] | undefined;
/**
 * Get translated field name from available trait tags.
 * @param field english field name
 */
function getSchemas() {
  return $tw.wiki.filterTiddlers('[all[shadows+tiddlers]tag[$:/SuperTag/TraitTag]]')
    .map(title => $tw.wiki.getTiddler(title)?.fields?.schema)
    .map((schema: unknown) => {
      if (typeof schema === 'string') {
        try {
          return JSON.parse(schema) as JSONSchema4;
        } catch {
          return undefined;
        }
      }
      return undefined;
    })
    .filter((schema): schema is JSONSchema4 => schema !== undefined);
}
export function getFieldName(field: string): string {
  if (cachedFieldTranslation[field] !== undefined) {
    return cachedFieldTranslation[field] ?? field;
  }
  if (traitTagSchemas === undefined) {
    traitTagSchemas = getSchemas();
  }
  const languageCode = $tw.wiki.filterTiddlers('[[$:/language]get[text]get[name]else[en-GB]]')[0];
  for (const schema of traitTagSchemas) {
    if (schema.type !== 'object') continue;
    if (schema.properties === undefined) continue;
    const lingoBase = schema['lingo-base'] as string | undefined;
    if (lingoBase === undefined) continue;
    const property = schema.properties[field];
    const lingoKey = property?.title;
    if (lingoKey) {
      const languageTiddlerTitle = `${lingoBase}${languageCode}/${lingoKey}`;
      const translation = $tw.wiki.getTiddlerText(languageTiddlerTitle, field);
      cachedFieldTranslation[field] = translation;
      return translation;
    }
  }
  cachedFieldTranslation[field] = null;
  return field;
}

const cachedEnumTranslation: Record<string, Record<string, string | null | undefined> | undefined | null> = {};
export function getEnumName(field: string, enumName: unknown): string {
  if (typeof enumName !== 'string') return enumName as string;
  if (cachedEnumTranslation[field] === null) {
    return enumName;
  }
  if (cachedEnumTranslation[field]?.[enumName] !== undefined) {
    return cachedEnumTranslation[field][enumName] ?? enumName;
  }
  if (traitTagSchemas === undefined) {
    traitTagSchemas = getSchemas();
  }
  const languageCode = $tw.wiki.filterTiddlers('[[$:/language]get[text]get[name]else[en-GB]]')[0];
  for (const schema of traitTagSchemas) {
    if (schema.type !== 'object') continue;
    if (schema.properties === undefined) continue;
    const lingoBase = schema['lingo-base'] as string | undefined;
    if (lingoBase === undefined) continue;
    const property = schema.properties[field];
    const lingoIndex = property?.enum?.findIndex((item) => item === enumName);
    // If find the field name, but it is not a enum, mark field cache as `null`
    if (property !== undefined && lingoIndex === undefined) {
      cachedEnumTranslation[field] = null;
      return enumName;
    }
    if (lingoIndex !== undefined && lingoIndex >= 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const lingoKey = property.options?.enum_titles?.[lingoIndex] as string | undefined;
      if (lingoKey) {
        const languageTiddlerTitle = `${lingoBase}${languageCode}/${lingoKey}`;
        const translation = $tw.wiki.getTiddlerText(languageTiddlerTitle, enumName);
        if (cachedEnumTranslation[field] === undefined) {
          cachedEnumTranslation[field] = {};
        }
        cachedEnumTranslation[field][enumName] = translation;
        return translation;
      }
    }
  }
  if (cachedEnumTranslation[field] === undefined) {
    cachedEnumTranslation[field] = {};
  }
  cachedEnumTranslation[field][enumName] = null;
  return enumName;
}
