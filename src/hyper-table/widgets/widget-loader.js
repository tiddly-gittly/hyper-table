/* eslint-disable @typescript-eslint/no-unsafe-assignment */
(function hyperTableWidgetIIFE() {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!$tw.browser) {
    return;
  }
  // separate the widget from the exports here, so we can skip the require of react code if `!$tw.browser`. Those ts code will error if loaded in the nodejs side.
  // fixes `Error executing boot module $:/plugins/linonetwo/hyper-table/test-widget.js: ReferenceError: EventTarget is not defined`
  try {
    const { ListTableWidget, PivotTableWidget } = require('$:/plugins/linonetwo/hyper-table/widgets/table.js');
    exports['basic-table'] = ListTableWidget;
    exports['pivot-table'] = PivotTableWidget;
  } catch (error) {
    console.error('Error loading hyperTable widget', error);
  }
})();
