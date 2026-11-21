<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import Icon from '../editor/Icon.vue';
const props = defineProps<{
  disabled: boolean;
  canInsert: boolean;
  canAdd: boolean;
}>();
const emit = defineEmits<{ insert: []; add: [] }>();
const id = useId();
const open = ref(false);
const trigger = ref<HTMLButtonElement>();
const panel = ref<HTMLElement>();

const position = ref({ left: 0, top: 0 });
function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus)
    void nextTick(() => trigger.value?.focus({ preventScroll: true }));
}
function place() {
  if (!open.value || !trigger.value || !panel.value) return;
  const anchor = trigger.value.getBoundingClientRect();
  const clip = trigger.value
    .closest('.timeline-command-scroll')
    ?.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0,
    top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? innerWidth,
    height = viewport?.height ?? innerHeight;
  if (
    anchor.bottom <= top ||
    anchor.top >= top + height ||
    (clip && (anchor.right <= clip.left || anchor.left >= clip.right))
  ) {
    close();
    return;
  }
  const size = panel.value.getBoundingClientRect();
  const below = anchor.bottom + 8;
  position.value = {
    left: Math.max(
      left + 8,
      Math.min(anchor.right - size.width, left + width - size.width - 8),
    ),
    top: Math.max(
      top + 8,
      Math.min(
        below + size.height <= top + height - 8
          ? below
          : anchor.top - size.height - 8,
        top + height - size.height - 8,
      ),
    ),
  };
}
function toggle() {
  if (props.disabled) return;
  if (open.value) {
    close(true);
    return;
  }
  open.value = true;
  void nextTick(() => {
    place();
    if (open.value)
      panel.value
        ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
        ?.focus({ preventScroll: true });
  });
}
function choose(action: 'insert' | 'add') {
  close(true);
  if (action === 'insert') emit('insert');
  else emit('add');
}
function navigate(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const buttons = Array.from(
    panel.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ??
      [],
  );
  if (!buttons.length) return;
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
          buttons.length;
  buttons[next]?.focus();
}
function outside(event: PointerEvent) {
  if (!open.value) return;
  const target = event.target as Node;
  if (!trigger.value?.contains(target) && !panel.value?.contains(target))
    close();
}
function keyboard(event: KeyboardEvent) {
  if (!open.value) return;
  if (
    event.key === 'Escape' ||
    (event.key === 'Tab' && panel.value?.contains(event.target as Node))
  ) {
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }
}
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close();
  },
);
onMounted(() => {
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', keyboard, true);
  document.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
  window.visualViewport?.addEventListener('resize', place);
  window.visualViewport?.addEventListener('scroll', place);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside, true);
  document.removeEventListener('keydown', keyboard, true);
  document.removeEventListener('scroll', place, true);
  window.removeEventListener('resize', place);
  window.visualViewport?.removeEventListener('resize', place);
  window.visualViewport?.removeEventListener('scroll', place);
});
</script>
<template>
  <div class="timeline-step-control">
    <button
      ref="trigger"
      class="icon-button secondary timeline-add"
      type="button"
      tabindex="0"
      aria-label="Insérer une étape"
      data-tooltip="Insérer une étape"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? id : undefined"
      :disabled="disabled"
      @click="toggle"
      @keydown.down.prevent="!open && toggle()"
    >
      <Icon name="plus" />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        :id="id"
        ref="panel"
        class="timeline-step-menu"
        role="menu"
        aria-label="Insérer une étape"
        :style="{ left: `${position.left}px`, top: `${position.top}px` }"
        @keydown="navigate"
      >
        <button
          role="menuitem"
          :disabled="!canInsert"
          @click="choose('insert')"
        >
          Insérer une étape
        </button>
        <button role="menuitem" :disabled="!canAdd" @click="choose('add')">
          Ajouter une étape après
        </button>
      </div>
    </Teleport>
  </div>
</template>
