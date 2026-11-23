// src/slideListController.js

import { extractFilenameFromPath } from "./filePathUtils.js";
import { t } from "./i18n.js";

/**
 * スライド1件分のサムネイルDOMを生成する。
 *
 * 選択・ドラッグ・履歴などのアプリケーション処理は行わない。
 */
export function createSlideThumbnailItem({
  slideState,
  index,
  isSelected,
  isCurrent,
}) {
  // =====================================
  // Item
  // =====================================

  const item = document.createElement("button");

  item.draggable = true;
  item.type = "button";
  item.className = "slide-thumbnail-item";

  if (isSelected) {
    item.classList.add("selected");
  }

  if (isCurrent) {
    item.classList.add("current");
  }

  item.dataset.slideIndex = String(index);

  // =====================================
  // Image wrapper
  // =====================================

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "slide-thumbnail-image-wrapper";

  if (slideState.imageUrl) {
    const image = document.createElement("img");

    image.className = "slide-thumbnail-image";
    image.src = slideState.imageUrl;
    image.alt = extractFilenameFromPath(slideState.imagePath);

    imageWrapper.appendChild(image);
  } else {
    const noImage = document.createElement("div");

    noImage.textContent = t(slideState.transparentInPresentation ? "Transparent slide" : "No Image");
    noImage.className = "slide-thumbnail-no-image";

    imageWrapper.appendChild(noImage);
  }

  // Drawing strokes use the same normalized UV coordinate system as slideDrawing.
  // SVG lives inside the image wrapper, so it scales with the thumbnail.
  if (Array.isArray(slideState.drawings) && slideState.drawings.length) {
    const ns = 'http://www.w3.org/2000/svg';
    const overlay = document.createElementNS(ns, 'svg');
    overlay.setAttribute('viewBox', '0 0 1024 576');
    overlay.setAttribute('preserveAspectRatio', 'none');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.add('slide-thumbnail-drawing');
    for (const stroke of slideState.drawings) {
      const points = (stroke.points ?? []).filter(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
      if (!points.length) continue;
      const path = document.createElementNS(ns, 'path');
      const coords = points.map(([u,v],i) => `${i?'L':'M'}${u*1024} ${v*576}`).join(' ');
      path.setAttribute('d', points.length === 1 ? coords + ` l0.1 0` : coords);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', /^#[0-9a-f]{3,8}$/i.test(stroke.color) || /^rgba?\(/i.test(stroke.color) ? stroke.color : '#ff0000');
      path.setAttribute('stroke-width', String(Math.max(1, Math.min(60, (Number(stroke.width) || 3) * 1.5))));
      path.setAttribute('stroke-linecap','round');
      path.setAttribute('stroke-linejoin','round');
      overlay.append(path);
    }
    imageWrapper.append(overlay);
  }

  // =====================================
  // Info
  // =====================================

  const info = document.createElement("div");
  info.className = "slide-thumbnail-info";

  const number = document.createElement("div");
  number.className = "slide-thumbnail-number";

  const displayLabel = slideState.label?.trim();

  if (!displayLabel) number.setAttribute("data-i18n-live", "");

  number.textContent = displayLabel
    ? `${index + 1} | ${displayLabel}`
    : `Slide ${index + 1}`;

  const filename = document.createElement("div");
  filename.className = "slide-thumbnail-filename";

  filename.textContent = extractFilenameFromPath(
    slideState.imagePath,
  );

  info.appendChild(number);
  info.appendChild(filename);

  // =====================================
  // Assemble
  // =====================================

  item.appendChild(imageWrapper);
  item.appendChild(info);

  return item;
}

/**
 * サムネイルのクリックイベントを登録する。
 *
 * 選択状態の変更は行わず、main.js 側の
 * コールバックへ通知する。
 */
export function bindSlideThumbnailClick({
  item,
  index,
  shouldIgnoreClick,
  onClick,
}) {
  item.addEventListener("click", async (event) => {
    if (shouldIgnoreClick()) {
      return;
    }

    const selectionMode = event.altKey
      ? "current-only"
      : event.shiftKey
      ? "range"
      : event.ctrlKey || event.metaKey
        ? "toggle"
        : "single";

    await onClick({
      index,
      selectionMode,
    });
  });
}

export function bindSlideThumbnailDrag({
  item,
  index,
  onDragStart,
  onDragEnd,
  canDrop,
  onDrop,
}) {
  // =====================================
  // Drag Start
  // =====================================

  item.addEventListener("dragstart", (event) => {
    const accepted = onDragStart(event, index);

    if (!accepted) {
      event.preventDefault();
      return;
    }

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    }
  });

  // =====================================
  // Drag End
  // =====================================

  item.addEventListener("dragend", () => {
    document
      .querySelectorAll(".slide-thumbnail-item")
      .forEach((element) => {
        element.classList.remove(
          "dragging",
          "drag-over-before",
          "drag-over-after",
        );
      });

    onDragEnd();
  });

  // =====================================
  // Drag Over
  // =====================================

  item.addEventListener("dragover", (event) => {
    if (!canDrop()) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    const rect = item.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const insertBefore = event.clientX < midpoint;

    item.classList.toggle("drag-over-before", insertBefore);
    item.classList.toggle("drag-over-after", !insertBefore);
  });

  // =====================================
  // Drag Leave
  // =====================================

  item.addEventListener("dragleave", () => {
    item.classList.remove("drag-over-before", "drag-over-after");
  });

  // =====================================
  // Drop
  // =====================================

  item.addEventListener("drop", async (event) => {
    if (!canDrop()) {
      return;
    }

    event.preventDefault();

    const rect = item.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const insertBefore = event.clientX < midpoint;

    const insertionIndex = insertBefore ? index : index + 1;

    await onDrop(insertionIndex);
  });
}

export function bindSlideThumbnailContextMenu({
  item,
  index,
  onContextMenu,
}) {
  item.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    onContextMenu({
      index,
      clientX: event.clientX,
      clientY: event.clientY,
      event,
    });
  });
}
