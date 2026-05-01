/**
 * Unit tests for getFieldName / getEnumName utilities.
 * Run via: pnpm test
 *
 * These tests use the TiddlyWiki Jasmine test runner ($tw.wiki is available).
 * They verify that table column translation and enum translation do NOT crash
 * when a tiddler has fields that are absent from a TraitTag schema.
 */

describe('hyper-table: getFieldName / getEnumName with TraitTag schemas', function() {
  var SCHEMA_TIDDLER_TITLE = '$:/test/hyper-table/TraitTagSchema';
  var TRAIT_TAG = '$:/SuperTag/TraitTag';

  var schema = JSON.stringify({
    type: 'object',
    'lingo-base': '$:/test/hyper-table/lingo/',
    properties: {
      // Only 'status' is defined in this schema.
      // Fields like 'title', 'tags', 'created' are intentionally absent.
      status: {
        type: 'string',
        title: 'Status',
        enum: ['active', 'done', 'cancelled'],
        options: {
          enum_titles: ['StatusActive', 'StatusDone', 'StatusCancelled'],
        },
      },
    },
  });

  beforeAll(function() {
    // Add a fake TraitTag tiddler with schema
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: SCHEMA_TIDDLER_TITLE,
      tags: [TRAIT_TAG],
      schema: schema,
    }));
    // Add lingo translation for one enum value
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: '$:/test/hyper-table/lingo/en-GB/StatusActive',
      text: '进行中',
    }));
  });

  afterAll(function() {
    $tw.wiki.deleteTiddler(SCHEMA_TIDDLER_TITLE);
    $tw.wiki.deleteTiddler('$:/test/hyper-table/lingo/en-GB/StatusActive');
  });

  // ── Rendering tests (widget-level integration) ────────────────────────────

  it('should render basic-table without error when filter returns tiddlers with fields not in schema', function() {
    // Add test data tiddlers
    $tw.wiki.addTiddler(new $tw.Tiddler({ title: 'TestRecord1', tags: ['TestTag'], status: 'active', priority: 'high' }));
    $tw.wiki.addTiddler(new $tw.Tiddler({ title: 'TestRecord2', tags: ['TestTag'], status: 'done' }));

    var widgetNode = $tw.wiki.makeTranscludeWidget(
      '$:/core/ui/EditTemplate',
      { document: $tw.fakeDocument, variables: {}, importVariables: '', recursionMarker: 'no', class: '', isBlock: false }
    );

    // Use renderTiddler which is simpler and doesn't need a full widget tree
    var container = $tw.fakeDocument.createElement('div');
    var result;
    var error;
    try {
      // Render a wikitext snippet that uses the table widget
      var parser = $tw.wiki.parseText('text/vnd.tiddlywiki',
        '<$basic-table filter="[tag[TestTag]]" columns="title|status|tags|priority" height="200px"/>',
        { parseAsInline: false }
      );
      var widgetTree = $tw.wiki.makeWidget(parser, { document: $tw.fakeDocument });
      widgetTree.render(container, null);
      result = container.innerHTML;
    } catch (e) {
      error = e;
    }

    expect(error).toBeUndefined();
    // The table container element should have been created
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');

    $tw.wiki.deleteTiddler('TestRecord1');
    $tw.wiki.deleteTiddler('TestRecord2');
  });

  it('should render basic-table without error when records have no fields matching schema', function() {
    $tw.wiki.addTiddler(new $tw.Tiddler({ title: 'NoSchemaRecord', foo: 'bar', baz: '123' }));

    var container = $tw.fakeDocument.createElement('div');
    var error;
    try {
      var parser = $tw.wiki.parseText('text/vnd.tiddlywiki',
        '<$basic-table filter="[[NoSchemaRecord]]" columns="title|foo|baz" height="200px"/>',
        { parseAsInline: false }
      );
      var widgetTree = $tw.wiki.makeWidget(parser, { document: $tw.fakeDocument });
      widgetTree.render(container, null);
    } catch (e) {
      error = e;
    }

    expect(error).toBeUndefined();

    $tw.wiki.deleteTiddler('NoSchemaRecord');
  });

  it('should render basic-table without error when no records exist', function() {
    var container = $tw.fakeDocument.createElement('div');
    var error;
    try {
      var parser = $tw.wiki.parseText('text/vnd.tiddlywiki',
        '<$basic-table filter="[tag[NonExistentTag99999]]" height="200px"/>',
        { parseAsInline: false }
      );
      var widgetTree = $tw.wiki.makeWidget(parser, { document: $tw.fakeDocument });
      widgetTree.render(container, null);
    } catch (e) {
      error = e;
    }

    expect(error).toBeUndefined();
  });

  it('should render basic-table with wikitext table input without error', function() {
    var container = $tw.fakeDocument.createElement('div');
    var error;
    try {
      var parser = $tw.wiki.parseText('text/vnd.tiddlywiki', [
        '<$basic-table height="150px">',
        '|!Title |!Status |',
        '|Row1 |active |',
        '|Row2 |done |',
        '</$basic-table>',
      ].join('\n'), { parseAsInline: false });
      var widgetTree = $tw.wiki.makeWidget(parser, { document: $tw.fakeDocument });
      widgetTree.render(container, null);
    } catch (e) {
      error = e;
    }

    expect(error).toBeUndefined();
  });
});
