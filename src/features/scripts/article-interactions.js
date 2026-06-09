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

// 还原 Astro 优化图片地址，便于图片预览使用原图路径。
function getCleanImageSrc(src) {
  try {
    const url = new URL(src, window.location.href);

    if (url.pathname !== '/_image') {
      return src;
    }

    const href = url.searchParams.get('href');

    if (!href) {
      return src;
    }

    const originalPath = decodeURIComponent(href).split('?')[0].replace(/\\/g, '/');
    const contentRoots = ['/blog/posts/', '/blog/pages/', '/example/posts/', '/example/pages/'];
    const root = contentRoots.find((item) => originalPath.includes(item));

    if (!root) {
      return src;
    }

    return originalPath.slice(originalPath.indexOf(root));
  } catch {
    return src;
  }
}

// 为正文图片添加点击放大预览。
function initImageZoom() {
  const images = Array.from(document.querySelectorAll('.prose img')).filter((image) => image.src);

  images.forEach((image) => {
    const cleanSrc = getCleanImageSrc(image.currentSrc || image.src);

    if (cleanSrc !== image.src) {
      image.src = cleanSrc;
      image.removeAttribute('srcset');
    }

    image.dataset.fullSrc = cleanSrc;
  });

  if (images.length === 0) {
    return;
  }

  let activeIndex = 0;

  const lightbox = document.createElement('div');
  lightbox.className = 'xg-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', '图片预览');
  lightbox.innerHTML = `
    <button class="xg-lightbox-close" type="button" aria-label="关闭图片预览">
      <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M5 5l8 8M13 5l-8 8" /></svg>
    </button>
    <button class="xg-lightbox-prev" type="button" aria-label="上一张图片">
      <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M11 4 7 9l4 5" /></svg>
    </button>
    <figure>
      <img alt="" />
      <figcaption><span class="xg-lightbox-caption"></span><span class="xg-lightbox-counter"></span></figcaption>
    </figure>
    <button class="xg-lightbox-next" type="button" aria-label="下一张图片">
      <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M7 4l4 5-4 5" /></svg>
    </button>
  `;

  document.body.append(lightbox);

  const preview = lightbox.querySelector('img');
  const caption = lightbox.querySelector('.xg-lightbox-caption');
  const counter = lightbox.querySelector('.xg-lightbox-counter');
  const closeButton = lightbox.querySelector('.xg-lightbox-close');
  const prevButton = lightbox.querySelector('.xg-lightbox-prev');
  const nextButton = lightbox.querySelector('.xg-lightbox-next');

  if (!preview || !caption || !counter || !closeButton || !prevButton || !nextButton) {
    return;
  }

  const render = () => {
    const image = images[activeIndex];
    const label = image.alt || '正文图片';

    preview.src = image.dataset.fullSrc || image.currentSrc || image.src;
    preview.alt = label;
    caption.textContent = label;
    counter.textContent = `${activeIndex + 1} / ${images.length}`;
  };

  const open = (index) => {
    activeIndex = index;
    render();
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  };

  const close = () => {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  const move = (step) => {
    activeIndex = (activeIndex + step + images.length) % images.length;
    render();
  };

  images.forEach((image, index) => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `${image.alt || '正文图片'}，点击放大`);
    image.addEventListener('click', () => open(index));
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(index);
      }
    });
  });

  closeButton.addEventListener('click', close);
  prevButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      close();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) {
      return;
    }

    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'ArrowLeft') {
      move(-1);
    } else if (event.key === 'ArrowRight') {
      move(1);
    }
  });
}

initTocActive();
initCodeCopy();
initImageZoom();
