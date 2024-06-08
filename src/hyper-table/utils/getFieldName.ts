/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { JSONSchema4 } from 'json-schema';

/**
 * If no trait tag provide the translation, will have `null`. If unchecked, it will be `undefined`.
 */
const cachedTranslation: Record<string, string | null | undefined> = {};
let traitTagSchemas: JSONSchema4[] | undefined;
/**
 * Get translated field name from available trait tags.
 * @param field english field name
 */
export function getFieldName(field: string): string {
  if (cachedTranslation[field] !== undefined) {
    return cachedTranslation[field] ?? field;
  }
  if (traitTagSchemas === undefined) {
    traitTagSchemas = $tw.wiki.filterTiddlers('[all[shadows+tiddlers]tag[$:/SuperTag/TraitTag]]')
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
      cachedTranslation[field] = translation;
      return translation;
    }
  }
  cachedTranslation[field] = null;
  return field;
}
