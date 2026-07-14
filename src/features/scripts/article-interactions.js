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
  let scale = 1;
  let defaultScale = 1;
  let translateX = 0;
  let translateY = 0;
  let dragState = null;
  let suppressBackdropClick = false;
  let transitioning = false;
  let transitionTrack;
  let transitionTimer;
  let pinchDistance = 0;
  const zoomStep = 0.3;
  const maxScale = 2;
  const pinchThreshold = 12;
  const transitionDuration = 360;

  const lightbox = document.createElement('div');
  lightbox.className = 'xg-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', '图片预览');
  lightbox.innerHTML = `
    <div class="xg-lightbox-toolbar" aria-label="图片预览工具">
      <button class="xg-lightbox-actual" type="button" aria-label="按 1:1 显示">1:1</button>
      <button class="xg-lightbox-fit" type="button" aria-label="适合页面显示">
        <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M6 4H4v2M12 4h2v2M14 12v2h-2M4 12v2h2M6.5 6.5h5v5h-5z" /></svg>
      </button>
      <button class="xg-lightbox-zoom-out" type="button" aria-label="缩小">
        <svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="7.5" cy="7.5" r="4.5" /><path d="M5.5 7.5h4M11 11l3.5 3.5" /></svg>
      </button>
      <button class="xg-lightbox-zoom-in" type="button" aria-label="放大">
        <svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="7.5" cy="7.5" r="4.5" /><path d="M7.5 5.5v4M5.5 7.5h4M11 11l3.5 3.5" /></svg>
      </button>
      <button class="xg-lightbox-download" type="button" aria-label="下载当前图片">
        <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 3v8M6 8l3 3 3-3M4 14h10" /></svg>
      </button>
      <button class="xg-lightbox-close" type="button" aria-label="关闭图片预览">
        <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M5 5l8 8M13 5l-8 8" /></svg>
      </button>
    </div>
    <button class="xg-lightbox-prev" type="button" aria-label="上一张图片">
      <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M11 4 7 9l4 5" /></svg>
    </button>
    <figure>
      <div class="xg-lightbox-stage">
        <img alt="" />
      </div>
      <figcaption><span class="xg-lightbox-counter"></span></figcaption>
    </figure>
    <button class="xg-lightbox-next" type="button" aria-label="下一张图片">
      <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M7 4l4 5-4 5" /></svg>
    </button>
  `;

  document.body.append(lightbox);

  const stage = lightbox.querySelector('.xg-lightbox-stage');
  const preview = lightbox.querySelector('img');
  const counter = lightbox.querySelector('.xg-lightbox-counter');
  const actualButton = lightbox.querySelector('.xg-lightbox-actual');
  const fitButton = lightbox.querySelector('.xg-lightbox-fit');
  const zoomOutButton = lightbox.querySelector('.xg-lightbox-zoom-out');
  const zoomInButton = lightbox.querySelector('.xg-lightbox-zoom-in');
  const downloadButton = lightbox.querySelector('.xg-lightbox-download');
  const closeButton = lightbox.querySelector('.xg-lightbox-close');
  const prevButton = lightbox.querySelector('.xg-lightbox-prev');
  const nextButton = lightbox.querySelector('.xg-lightbox-next');

  if (
    !stage ||
    !preview ||
    !counter ||
    !actualButton ||
    !fitButton ||
    !zoomOutButton ||
    !zoomInButton ||
    !downloadButton ||
    !closeButton ||
    !prevButton ||
    !nextButton
  ) {
    return;
  }

  const getCurrentImageSrc = () => {
    const image = images[activeIndex];
    return image.dataset.fullSrc || image.currentSrc || image.src;
  };

  const getAvailableSize = () => {
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const isPortraitMobile = window.matchMedia('(max-width: 720px) and (orientation: portrait)').matches;
    const sideControls = isPortraitMobile ? 32 : isMobile ? 112 : 156;
    const verticalControls = isMobile ? 136 : 148;

    return {
      width: Math.max(180, viewportWidth - sideControls),
      height: Math.max(180, viewportHeight - verticalControls),
    };
  };

  const syncNavigationPosition = () => {
    const lightboxRect = lightbox.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const navTop = stageRect.top - lightboxRect.top + stageRect.height / 2;

    lightbox.style.setProperty('--xg-lightbox-nav-top', `${Math.round(navTop)}px`);
  };

  const updateControls = () => {
    const isAtDefault = scale <= defaultScale + 0.001;
    const isAtMaximum = scale >= maxScale - 0.001;
    const isActual = Math.abs(scale - 1) <= 0.001;

    zoomOutButton.disabled = isAtDefault;
    zoomInButton.disabled = isAtMaximum;
    actualButton.setAttribute('aria-pressed', String(isActual));
    fitButton.setAttribute('aria-pressed', String(isAtDefault));
    stage.classList.toggle('is-zoomed', !isAtDefault);
    preview.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scale})`;
  };

  const syncStageSize = () => {
    const naturalWidth = preview.naturalWidth || 1;
    const naturalHeight = preview.naturalHeight || 1;
    const available = getAvailableSize();
    const isAtDefault = scale <= defaultScale + 0.001;
    const scaledWidth = naturalWidth * scale;
    const scaledHeight = naturalHeight * scale;

    stage.style.width = `${Math.round(isAtDefault ? naturalWidth * defaultScale : Math.min(available.width, scaledWidth))}px`;
    stage.style.height = `${Math.round(isAtDefault ? naturalHeight * defaultScale : Math.min(available.height, scaledHeight))}px`;
    syncNavigationPosition();
  };

  const clampTranslate = () => {
    const imageWidth = preview.naturalWidth * scale;
    const imageHeight = preview.naturalHeight * scale;
    const stageRect = stage.getBoundingClientRect();
    const maxX = Math.max(0, (imageWidth - stageRect.width) / 2);
    const maxY = Math.max(0, (imageHeight - stageRect.height) / 2);

    translateX = Math.min(maxX, Math.max(-maxX, translateX));
    translateY = Math.min(maxY, Math.max(-maxY, translateY));
  };

  const setScale = (nextScale) => {
    scale = Math.max(defaultScale, Math.min(maxScale, nextScale));
    syncStageSize();
    clampTranslate();
    updateControls();
  };

  const fitToPage = () => {
    scale = defaultScale;
    translateX = 0;
    translateY = 0;
    syncStageSize();
    updateControls();
  };

  const showActualSize = () => {
    scale = Math.max(defaultScale, 1);
    translateX = 0;
    translateY = 0;
    syncStageSize();
    clampTranslate();
    updateControls();
  };

  const resetView = () => {
    const naturalWidth = preview.naturalWidth || 1;
    const naturalHeight = preview.naturalHeight || 1;
    const available = getAvailableSize();

    defaultScale = Math.min(1, available.width / naturalWidth, available.height / naturalHeight);
    scale = defaultScale;
    translateX = 0;
    translateY = 0;
    preview.style.width = `${naturalWidth}px`;
    preview.style.height = `${naturalHeight}px`;
    syncStageSize();
    updateControls();
  };

  const render = (onReady) => {
    const image = images[activeIndex];
    const label = image.alt || '正文图片';
    let ready = false;

    const handleReady = () => {
      if (ready) {
        return;
      }

      ready = true;
      preview.onload = null;
      resetView();
      onReady?.();
    };

    preview.onload = handleReady;
    preview.src = getCurrentImageSrc();
    preview.alt = label;
    counter.textContent = `${activeIndex + 1} / ${images.length}`;

    if (preview.complete && preview.naturalWidth) {
      handleReady();
    }
  };

  const open = (index) => {
    activeIndex = index;
    render();
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  };

  const completeTransition = () => {
    window.clearTimeout(transitionTimer);
    transitionTimer = undefined;
    transitionTrack?.remove();
    transitionTrack = undefined;
    preview.style.visibility = '';
    stage.classList.remove('is-switching');
    transitioning = false;
  };

  const close = () => {
    completeTransition();
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  const move = (step) => {
    if (transitioning || images.length < 2) {
      return;
    }

    transitioning = true;
    stage.classList.add('is-switching');
    const direction = step > 0 ? 1 : -1;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const outgoingRect = preview.getBoundingClientRect();
    const outgoing = preview.cloneNode();
    const track = document.createElement('div');

    const positionTransitionImage = (image, rect, offsetX) => {
      image.classList.add('xg-lightbox-transition-image');
      image.setAttribute('aria-hidden', 'true');
      Object.assign(image.style, {
        position: 'absolute',
        top: `${rect.top}px`,
        left: `${rect.left + offsetX}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        transform: 'none',
        visibility: 'visible',
      });
    };

    track.className = 'xg-lightbox-transition-track';
    positionTransitionImage(outgoing, outgoingRect, 0);
    track.append(outgoing);
    lightbox.append(track);
    transitionTrack = track;
    preview.style.visibility = 'hidden';
    activeIndex = (activeIndex + step + images.length) % images.length;
    render(() => {
      if (transitionTrack !== track) {
        return;
      }

      const incoming = preview.cloneNode();
      const incomingRect = preview.getBoundingClientRect();

      positionTransitionImage(incoming, incomingRect, direction * viewportWidth);
      track.append(incoming);
      track.addEventListener(
        'transitionend',
        (event) => {
          if (event.target === track) {
            completeTransition();
          }
        },
        { once: true },
      );
      transitionTimer = window.setTimeout(completeTransition, transitionDuration + 80);
      window.requestAnimationFrame(() => {
        if (transitionTrack === track) {
          track.style.transform = `translate3d(${-direction * viewportWidth}px, 0, 0)`;
        }
      });
    });
  };

  const zoomWithWheel = (event) => {
    event.preventDefault();

    if (event.deltaY === 0) {
      return;
    }

    setScale(scale + (event.deltaY < 0 ? zoomStep : -zoomStep));
  };

  const getTouchDistance = (touches) => {
    const [first, second] = Array.from(touches);

    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  const startPinch = (event) => {
    if (event.touches.length !== 2) {
      return;
    }

    event.preventDefault();
    dragState = null;
    stage.classList.remove('is-dragging');
    pinchDistance = getTouchDistance(event.touches);
    suppressBackdropClick = true;
  };

  const pinch = (event) => {
    if (event.touches.length !== 2 || pinchDistance === 0) {
      return;
    }

    event.preventDefault();
    const nextDistance = getTouchDistance(event.touches);
    const distanceChange = nextDistance - pinchDistance;

    if (Math.abs(distanceChange) < pinchThreshold) {
      return;
    }

    setScale(scale + (distanceChange > 0 ? zoomStep : -zoomStep));
    pinchDistance = nextDistance;
  };

  const endPinch = (event) => {
    if (event.touches.length >= 2) {
      return;
    }

    pinchDistance = 0;
    window.setTimeout(() => {
      suppressBackdropClick = false;
    }, 0);
  };

  const getDownloadName = () => {
    const image = images[activeIndex];
    const label = (image.alt || `image-${activeIndex + 1}`).trim();

    try {
      const url = new URL(getCurrentImageSrc(), window.location.href);
      const filename = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');

      if (filename) {
        return filename;
      }
    } catch {
      // Fall back to the image label below.
    }

    return `${label.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').toLowerCase()}.png`;
  };

  const downloadCurrent = () => {
    const link = document.createElement('a');
    link.href = getCurrentImageSrc();
    link.download = getDownloadName();
    document.body.append(link);
    link.click();
    link.remove();
  };

  const startDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const isZoomed = scale > defaultScale + 0.001;
    dragState = {
      pointerId: event.pointerId,
      mode: isZoomed ? 'pan' : 'swipe',
      startX: event.clientX,
      startY: event.clientY,
      startTranslateX: translateX,
      startTranslateY: translateY,
      moved: false,
    };
    stage.classList.add('is-dragging');
    stage.setPointerCapture?.(event.pointerId);
  };

  const drag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    dragState.moved = dragState.moved || Math.abs(dx) > 3 || Math.abs(dy) > 3;

    if (dragState.mode === 'pan') {
      translateX = dragState.startTranslateX + dx;
      translateY = dragState.startTranslateY + dy;
      clampTranslate();
      updateControls();
    }

    event.preventDefault();
  };

  const endDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const shouldSwipe = dragState.mode === 'swipe' && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2;

    if (shouldSwipe) {
      move(dx > 0 ? -1 : 1);
    }

    suppressBackdropClick = dragState.moved;
    dragState = null;
    stage.classList.remove('is-dragging');
    stage.releasePointerCapture?.(event.pointerId);
    window.setTimeout(() => {
      suppressBackdropClick = false;
    }, 0);
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
  prevButton.addEventListener('click', (event) => {
    event.currentTarget.blur();
    move(-1);
  });
  nextButton.addEventListener('click', (event) => {
    event.currentTarget.blur();
    move(1);
  });
  actualButton.addEventListener('click', showActualSize);
  fitButton.addEventListener('click', fitToPage);
  zoomOutButton.addEventListener('click', () => setScale(scale - zoomStep));
  zoomInButton.addEventListener('click', () => setScale(scale + zoomStep));
  downloadButton.addEventListener('click', downloadCurrent);
  stage.addEventListener('pointerdown', startDrag);
  stage.addEventListener('pointermove', drag);
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  lightbox.addEventListener('wheel', zoomWithWheel, { passive: false });
  lightbox.addEventListener('touchstart', startPinch, { passive: false });
  lightbox.addEventListener('touchmove', pinch, { passive: false });
  lightbox.addEventListener('touchend', endPinch);
  lightbox.addEventListener('touchcancel', endPinch);

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox && !suppressBackdropClick) {
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
      closeButton.blur();
      move(-1);
    } else if (event.key === 'ArrowRight') {
      closeButton.blur();
      move(1);
    }
  });

  window.addEventListener('resize', () => {
    if (lightbox.classList.contains('is-open') && preview.complete && preview.naturalWidth) {
      resetView();
    }
  });
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

initTocActive();
initCodeCopy();
initTableMerge();
initImageZoom();
