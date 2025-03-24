import { SearchComponent } from '@visactor/vtable-search';
import './searchBar.css';

export function searchBar(search: SearchComponent, containerElement: HTMLElement) {
  const searchContainer = $tw.utils.domMaker('div', {
    class: 'tc-hyper-table-search-container',
  });

  const input = $tw.utils.domMaker('input', {
    class: 'tc-hyper-table-search-input',
    attributes: { tabindex: '0' }
  });
  searchContainer.append(input);

  const resultCount = $tw.utils.domMaker('span', {
    class: 'tc-hyper-table-search-result-count',
  });
  resultCount.innerText = '0/0';
  searchContainer.append(resultCount);

  const searchButton = $tw.utils.domMaker('button', {
    class: 'tc-hyper-table-search-btn',
  });
  searchButton.innerText = 'search';
  searchContainer.append(searchButton);

  const previousButton = $tw.utils.domMaker('button', {
    class: 'tc-hyper-table-prev-btn',
  });
  previousButton.innerText = 'prev';
  searchContainer.append(previousButton);

  const nextButton = $tw.utils.domMaker('button', {
    class: 'tc-hyper-table-next-btn',
  });
  nextButton.innerText = 'next';
  searchContainer.append(nextButton);

  // 辅助函数：更新搜索结果计数
  const updateResultCount = (searchResult: ReturnType<SearchComponent['search']>) => {
    resultCount.innerText = searchResult.results.length === 0 ? '0/0' : `${searchResult.index + 1}/${searchResult.results.length}`;
  };

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
      input.value = '';
      search.clear();
      resultCount.innerText = '0/0';
    }
  });

  previousButton.addEventListener('click', () => {
    updateResultCount(search.prev());
  });

  nextButton.addEventListener('click', () => {
    updateResultCount(search.next());
  });

  containerElement.append(searchContainer);
}
