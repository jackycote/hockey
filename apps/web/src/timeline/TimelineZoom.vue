<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import Icon from '../editor/Icon.vue';
const props = defineProps<{ modelValue: number; disabled: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
const id = useId();
const open = ref(false);
const trigger = ref<HTMLButtonElement>();
const panel = ref<HTMLElement>();
const slider = ref<HTMLInputElement>();
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
    if (open.value) slider.value?.focus({ preventScroll: true });
  });
}
function adjust(event: KeyboardEvent) {
  const keys: Record<string, number> = {
    ArrowUp: props.modelValue + 10,
    ArrowRight: props.modelValue + 10,
    ArrowDown: props.modelValue - 10,
    ArrowLeft: props.modelValue - 10,
    Home: 30,
    End: 200,
  };
  const value = keys[event.key];
  if (value === undefined) return;
  event.preventDefault();
  event.stopPropagation();
  emit('update:modelValue', Math.max(30, Math.min(200, value)));
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
  <div class="timeline-zoom-control">
    <button
      ref="trigger"
      class="icon-button timeline-zoom-toggle"
      type="button"
      tabindex="0"
      aria-label="Zoom de la timeline"
      data-tooltip="Zoom de la timeline"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-controls="open ? id : undefined"
      :disabled="disabled"
      @click="toggle"
    >
      <Icon name="zoom" /><Icon name="down" />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        :id="id"
        ref="panel"
        class="timeline-zoom-popover"
        role="dialog"
        aria-label="Zoom de la timeline"
        :style="{ left: `${position.left}px`, top: `${position.top}px` }"
      >
        <span>Zoom</span><Icon name="plus" />
        <input
          ref="slider"
          type="range"
          min="30"
          max="200"
          step="10"
          :value="modelValue"
          aria-label="Zoom de la timeline"
          aria-orientation="vertical"
          @keydown="adjust"
          @input="
            emit(
              'update:modelValue',
              Number(($event.target as HTMLInputElement).value),
            )
          "
        />
        <Icon name="minus" />
      </div>
    </Teleport>
  </div>
</template>
