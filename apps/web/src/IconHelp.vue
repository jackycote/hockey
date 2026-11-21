<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
const id = useId();
const panel = ref<HTMLElement>();
const text = ref('');
const position = ref({ left: 0, top: 0 });
let active: HTMLElement | null = null;
let hovered: HTMLElement | null = null;
let focused: HTMLElement | null = null;
let dismissed: HTMLElement | null = null;
let leaveTimer: ReturnType<typeof setTimeout> | undefined;
let observer: MutationObserver | undefined;
function candidate(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>('button,a,[role="button"]');
  return el &&
    (el.hasAttribute('data-tooltip') ||
      el.querySelector('svg,img,[aria-hidden],.record-dot'))
    ? el
    : null;
}
function label(el: HTMLElement) {
  const copy = el.cloneNode(true) as HTMLElement;
  copy
    .querySelectorAll('[aria-hidden="true"],svg')
    .forEach((node) => node.remove());
  return (
    el.getAttribute('data-tooltip') ||
    el.getAttribute('aria-label') ||
    copy.textContent ||
    el.querySelector('img')?.alt ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
}
function unlink() {
  if (!active) return;
  const descriptions = (active.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter((value) => value && value !== id);
  if (descriptions.length)
    active.setAttribute('aria-describedby', descriptions.join(' '));
  else active.removeAttribute('aria-describedby');
  observer?.disconnect();
  active = null;
}
function close() {
  unlink();
  text.value = '';
}
function place() {
  if (!active?.isConnected || !panel.value) {
    close();
    return;
  }
  const anchor = active.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0,
    top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? innerWidth,
    height = viewport?.height ?? innerHeight;
  const clip = active
    .closest('.tools,.timeline-command-scroll,.rink-board')
    ?.getBoundingClientRect();
  if (
    anchor.bottom <= top ||
    anchor.top >= top + height ||
    anchor.right <= left ||
    anchor.left >= left + width ||
    (clip &&
      (anchor.bottom <= clip.top ||
        anchor.top >= clip.bottom ||
        anchor.right <= clip.left ||
        anchor.left >= clip.right))
  ) {
    close();
    return;
  }
  const size = panel.value.getBoundingClientRect();
  const inRail = !!active.closest('.tools');
  const x = inRail
    ? anchor.right + 8
    : anchor.left + (anchor.width - size.width) / 2;
  const y = inRail
    ? anchor.top + (anchor.height - size.height) / 2
    : anchor.bottom + size.height + 8 <= top + height - 8
      ? anchor.bottom + 8
      : anchor.top - size.height - 8;
  position.value = {
    left: Math.max(left + 8, Math.min(x, left + width - size.width - 8)),
    top: Math.max(top + 8, Math.min(y, top + height - size.height - 8)),
  };
}
function refresh() {
  const target = hovered ?? focused;
  if (!target || target === dismissed || !target.isConnected) {
    close();
    return;
  }
  if (active !== target) {
    unlink();
    active = target;
    const descriptions = (active.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean);
    active.setAttribute(
      'aria-describedby',
      [...new Set([...descriptions, id])].join(' '),
    );
    observer?.observe(active, {
      attributes: true,
      attributeFilter: ['aria-label', 'data-tooltip', 'disabled'],
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
  text.value = label(target);
  if (!text.value) {
    close();
    return;
  }
  void nextTick(place);
}
function over(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  clearTimeout(leaveTimer);
  if (panel.value?.contains(event.target as Node)) return;
  const target = candidate(event.target);
  if (hovered !== target && dismissed !== focused) dismissed = null;
  hovered = target;
  refresh();
}
function out(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  if (
    active?.contains(event.relatedTarget as Node) ||
    panel.value?.contains(event.relatedTarget as Node)
  )
    return;
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => {
    hovered = null;
    if (!focused) dismissed = null;
    refresh();
  }, 150);
}
function focus(event: FocusEvent) {
  const target = candidate(event.target);
  if (target !== hovered) {
    hovered = null;
    if (dismissed !== target) dismissed = null;
  }
  focused = target;
  refresh();
}
function blur(event: FocusEvent) {
  if (focused?.contains(event.relatedTarget as Node)) return;
  if (dismissed === focused && hovered !== focused) dismissed = null;
  focused = null;
  refresh();
}
function dismiss(event?: Event) {
  dismissed = candidate(event?.target ?? null) ?? hovered ?? focused;
  close();
}
function key(event: KeyboardEvent) {
  if (['Escape', 'Enter', ' '].includes(event.key)) dismiss();
}
onMounted(() => {
  observer = new MutationObserver(refresh);
  document.addEventListener('pointerover', over, true);
  document.addEventListener('pointerout', out, true);
  document.addEventListener('focusin', focus, true);
  document.addEventListener('focusout', blur, true);
  document.addEventListener('pointerdown', dismiss, true);
  document.addEventListener('keydown', key, true);
  document.addEventListener('scroll', refresh, true);
  window.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('scroll', refresh);
});
onBeforeUnmount(() => {
  clearTimeout(leaveTimer);
  close();
  document.removeEventListener('pointerover', over, true);
  document.removeEventListener('pointerout', out, true);
  document.removeEventListener('focusin', focus, true);
  document.removeEventListener('focusout', blur, true);
  document.removeEventListener('pointerdown', dismiss, true);
  document.removeEventListener('keydown', key, true);
  document.removeEventListener('scroll', refresh, true);
  window.removeEventListener('resize', refresh);
  window.visualViewport?.removeEventListener('resize', refresh);
  window.visualViewport?.removeEventListener('scroll', refresh);
});
</script>
<template>
  <Teleport to="body">
    <div
      v-if="text"
      :id="id"
      ref="panel"
      role="tooltip"
      class="icon-help"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      {{ text }}
    </div>
  </Teleport>
</template>
<style>
.icon-help {
  position: fixed;
  z-index: 1200;
  max-width: min(290px, calc(100vw - 16px));
  padding: 8px 11px;
  border-radius: 6px;
  background: var(--ink);
  color: white;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
  box-shadow: 0 3px 14px #102b4e26;
}
</style>
