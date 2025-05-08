import { SearchComponent } from '@visactor/vtable-search';
import './searchBar.css';

export function searchBar(search: SearchComponent, containerElement: HTMLElement, searchBarPosition: 'top' | 'bottom') {
  const searchContainer = $tw.utils.domMaker('div', {
    class: `tc-hyper-table-search-container tc-hyper-table-search-${searchBarPosition}`,
  });

  const inputContainer = $tw.utils.domMaker('div', {
    class: 'tc-hyper-table-input-container',
  });
  searchContainer.append(inputContainer);

  const input = $tw.utils.domMaker('input', {
    class: 'tc-hyper-table-search-input',
    attributes: { tabindex: '0' },
  });
  inputContainer.append(input);
  
  const clearButton = $tw.utils.domMaker('button', {
    class: 'tc-hyper-table-clear-btn tc-hyper-table-hidden',
  });
  clearButton.innerText = '×';
  clearButton.title = $tw.wiki.getTiddlerText('$:/language/Shortcuts/Input/Cancel/Hint') ?? 'Clear';
  inputContainer.append(clearButton);

  const resultCount = $tw.utils.domMaker('span', {
    class: 'tc-hyper-table-search-result-count',
  });
  resultCount.innerText = '0/0';
  searchContainer.append(resultCount);

  const searchButton = $tw.utils.domMaker('button', {
    class: 'tc-hyper-table-search-btn',
  });
  searchButton.innerText = $tw.wiki.getTiddlerText('$:/language/Search/Search') ?? 'Search';
  searchContainer.append(searchButton);

  const previousButton = $tw.utils.domMaker('button', {
    class: 'tc-hyper-table-prev-btn',
  });
  previousButton.innerText = '←';
  previousButton.title = $tw.wiki.getTiddlerText('$:/language/Shortcuts/Input/Up/Hint') ?? 'Previous';
  searchContainer.append(previousButton);

  const nextButton = $tw.utils.domMaker('button', {
    class: 'tc-hyper-table-next-btn',
  });
  nextButton.innerText = '→';
  nextButton.title = $tw.wiki.getTiddlerText('$:/language/Shortcuts/Input/Down/Hint') ?? 'Next';
  searchContainer.append(nextButton);

  const updateResultCount = (searchResult: ReturnType<SearchComponent['search']>) => {
    resultCount.innerText = searchResult.results.length === 0 ? '0/0' : `${searchResult.index + 1}/${searchResult.results.length}`;
  };

  const clearSearch = () => {
    input.value = '';
    search.clear();
    resultCount.innerText = '0/0';
    clearButton.classList.add('tc-hyper-table-hidden'); // 清除后隐藏按钮
  };

  input.addEventListener('input', () => {
    if (input.value.length > 0) {
      clearButton.classList.remove('tc-hyper-table-hidden');
    } else {
      clearButton.classList.add('tc-hyper-table-hidden');
    }
  });

  searchButton.addEventListener('click', () => {
    updateResultCount(search.search(input.value));
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      if (search?.queryResult?.length > 0) {
        updateResultCount(search.next());
      } else {
        updateResultCount(search.search(input.value));
      }
    } else if (event.key === 'Escape') {
      clearSearch();
    }
  });

  clearButton.addEventListener('click', clearSearch);

  previousButton.addEventListener('click', () => {
    if (search?.queryResult?.length > 0) {
      updateResultCount(search.prev());
    }
  });

  nextButton.addEventListener('click', () => {
    if (search?.queryResult?.length > 0) {
      updateResultCount(search.next());
    }
  });

  if (searchBarPosition === 'top') {
    containerElement.prepend(searchContainer);
  } else {
    containerElement.append(searchContainer);
  }
}
