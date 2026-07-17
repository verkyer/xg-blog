function initProseLinks() {
  const links = document.querySelectorAll('.prose a[href]');

  for (const link of links) {
    const href = link.getAttribute('href');

    if (!href) {
      continue;
    }

    try {
      const url = new URL(href, window.location.href);
      const isExternal = (url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== window.location.origin;

      link.dataset.linkKind = isExternal ? 'external' : 'internal';
    } catch {
      link.dataset.linkKind = 'internal';
    }
  }
}

// 同步文章目录的当前阅读位置高亮。
function initTocActive() {
  const tocLinks = Array.from(document.querySelectorAll('[data-toc-link]'));
  const headings = Array.from(document.querySelectorAll('.prose h2[id], .prose h3[id], .prose h4[id]'));

  if (tocLinks.length === 0 || headings.length === 0) {
    return;
  }

  const topOffset = 96;
  const linkById = new Map(tocLinks.map((link) => [decodeURIComponent(link.hash.slice(1)), link]));

  const setActive = (id) => {
    const activeLink = linkById.get(id);
    if (!activeLink) {
      return;
    }

    const activeItem = activeLink.closest('[data-toc-item]');
    const activeH2 = activeItem?.dataset.parentH2 ?? '';
    const activeH3 = activeItem?.dataset.parentH3 ?? '';

    for (const link of tocLinks) {
      const item = link.closest('[data-toc-item]');
      const depth = Number(item?.dataset.depth ?? 2);
      const itemH2 = item?.dataset.parentH2 ?? '';
      const itemH3 = item?.dataset.parentH3 ?? '';
      const isActive = link === activeLink;
      const isVisible =
        depth === 2 ||
        (depth === 3 && itemH2 === activeH2) ||
        (depth === 4 && itemH2 === activeH2 && (activeH3 ? itemH3 === activeH3 : !itemH3));

      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
      item?.classList.toggle('is-active', isActive);
      item?.classList.toggle('is-visible', isVisible);
    }

    if (activeLink.closest('[data-mobile-toc-panel]')?.classList.contains('is-mobile-open')) {
      activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  const updateActive = () => {
    let currentId = headings[0]?.id;

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= topOffset) {
        currentId = heading.id;
      } else {
        break;
      }
    }

    if (currentId) {
      setActive(currentId);
    }
  };

  let ticking = false;
  const scheduleUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    requestAnimationFrame(() => {
      updateActive();
      ticking = false;
    });
  };

  for (const link of tocLinks) {
    link.addEventListener('click', () => {
      const id = decodeURIComponent(link.hash.slice(1));
      if (id) {
        setActive(id);
      }
    });
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('hashchange', scheduleUpdate);
  updateActive();
}

function initMobileToc() {
  const toggle = document.querySelector('[data-mobile-toc-toggle]');
  const panel = document.querySelector('[data-mobile-toc-panel]');

  if (!toggle || !panel) {
    return;
  }

  const mobile = window.matchMedia('(max-width: 1020px)');
  const hasComments = Boolean(document.querySelector('#comments'));
  let open = false;

  toggle.classList.toggle('has-comments', hasComments);
  panel.classList.toggle('has-comments', hasComments);

  const syncPanelAccessibility = () => {
    if (mobile.matches) {
      panel.setAttribute('aria-hidden', String(!open));
      panel.toggleAttribute('inert', !open);
      return;
    }

    panel.removeAttribute('aria-hidden');
    panel.removeAttribute('inert');
  };

  const setOpen = (nextOpen) => {
    open = Boolean(nextOpen && mobile.matches);
    panel.classList.toggle('is-mobile-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '关闭文章目录' : '打开文章目录');
    syncPanelAccessibility();

    if (open) {
      requestAnimationFrame(() => {
        panel.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    }

    syncVisibility();
  };

  const syncVisibility = () => {
    const visible = mobile.matches && (open || window.scrollY > 420);
    toggle.classList.toggle('is-visible', visible);
    toggle.setAttribute('aria-hidden', String(!visible));
    toggle.tabIndex = visible ? 0 : -1;
  };

  const restoreFocus = () => {
    if (toggle.classList.contains('is-visible')) {
      toggle.focus();
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      restoreFocus();
    }
  });
  window.addEventListener('scroll', syncVisibility, { passive: true });
  mobile.addEventListener('change', () => {
    setOpen(false);
  });
  setOpen(false);
}

// 为文章代码块补充语言标签和复制按钮。
function initCodeCopy() {
  const codeBlocks = document.querySelectorAll('.prose pre');
  const languageLabels = {
    bash: 'BASH',
    css: 'CSS',
    html: 'HTML',
    js: 'JS',
    javascript: 'JS',
    json: 'JSON',
    md: 'MD',
    markdown: 'MD',
    sh: 'SH',
    shell: 'SHELL',
    ts: 'TS',
    typescript: 'TS',
    yaml: 'YAML',
    yml: 'YAML',
  };

  for (const pre of codeBlocks) {
    const code = pre.querySelector('code');

    if (!code || pre.querySelector('.copy-code')) {
      continue;
    }

    const language =
      pre.dataset.language ||
      [...pre.classList, ...code.classList]
        .find((className) => className.startsWith('language-'))
        ?.replace('language-', '');
    const label = language ? languageLabels[language.toLowerCase()] : undefined;

    if (label) {
      pre.dataset.languageLabel = label;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent ?? '');
        button.textContent = '已复制';
        setTimeout(() => {
          button.textContent = '复制';
        }, 1600);
      } catch {
        button.textContent = '复制失败';
        setTimeout(() => {
          button.textContent = '复制';
        }, 1600);
      }
    });

    pre.append(button);
  }
}

function initTableMerge() {
  const tables = document.querySelectorAll('.prose table');

  const getMergeKey = (cell) => cell.innerHTML.replace(/\s+/g, ' ').trim();

  for (const table of tables) {
    if (table.dataset.xgTableMerged === 'true') {
      continue;
    }

    const rows = table.querySelectorAll('tbody tr');

    for (const row of rows) {
      const cells = Array.from(row.children).filter((cell) => cell.tagName === 'TD' || cell.tagName === 'TH');

      if (cells.length < 3) {
        continue;
      }

      let previousCell = null;
      let previousKey = '';

      for (const cell of cells.slice(1)) {
        const key = getMergeKey(cell);

        if (!key) {
          previousCell = null;
          previousKey = '';
          continue;
        }

        if (previousCell && key === previousKey) {
          previousCell.colSpan += cell.colSpan || 1;
          previousCell.classList.add('is-merged-cell');
          cell.remove();
          continue;
        }

        previousCell = cell;
        previousKey = key;
      }
    }

    table.dataset.xgTableMerged = 'true';
  }
}

initProseLinks();
initTocActive();
initMobileToc();
initCodeCopy();
initTableMerge();

if (document.querySelector('.prose img')) {
  import('./image-zoom.js').then(({ initImageZoom }) => initImageZoom());
}
