<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon from './Icon.vue';
const props = defineProps<{ value: number }>();
const emit = defineEmits<{
  zoom: [factor: number];
  set: [percent: number];
  reset: [];
}>();
const { t } = useI18n();
const id = useId();
const open = ref(false);
const trigger = ref<HTMLButtonElement>();
const panel = ref<HTMLElement>();
const slider = ref<HTMLInputElement>();
const position = ref({ left: 0, top: 0, width: 300 });
function close(restoreFocus = false) {
  open.value = false;
  if (restoreFocus)
    void nextTick(() => trigger.value?.focus({ preventScroll: true }));
}
function place() {
  if (!open.value || !trigger.value || !panel.value) return;
  const anchor = trigger.value.getBoundingClientRect();
  const rail = trigger.value.closest('.tools')!.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0,
    top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? innerWidth,
    height = viewport?.height ?? innerHeight;
  if (
    anchor.bottom <= Math.max(top, rail.top) ||
    anchor.top >= Math.min(top + height, rail.bottom)
  ) {
    close();
    return;
  }
  const x = Math.max(left + 8, anchor.right + 8);
  const available = Math.max(0, left + width - x - 8);
  const panelWidth = Math.min(300, Math.max(180, available));
  position.value = {
    left: Math.max(left + 8, Math.min(x, left + width - panelWidth - 8)),
    top: Math.max(
      top + 8,
      Math.min(
        anchor.top + (anchor.height - panel.value.offsetHeight) / 2,
        top + height - panel.value.offsetHeight - 8,
      ),
    ),
    width: panelWidth,
  };
}
function toggle() {
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
function setZoom(value: number) {
  emit('set', Math.min(300, Math.max(100, value)));
}
function resetZoom(event: MouseEvent) {
  emit('reset');
  (event.currentTarget as HTMLButtonElement).focus({ preventScroll: true });
}
function adjust(event: KeyboardEvent) {
  const values: Record<string, number> = {
    ArrowRight: props.value + 10,
    ArrowUp: props.value + 10,
    ArrowLeft: props.value - 10,
    ArrowDown: props.value - 10,
    Home: 100,
    End: 300,
  };
  if (values[event.key] === undefined) return;
  event.preventDefault();
  event.stopPropagation();
  setZoom(values[event.key]!);
}
function outside(event: PointerEvent) {
  if (
    !trigger.value?.contains(event.target as Node) &&
    !panel.value?.contains(event.target as Node)
  )
    close();
}
function focusOutside(event: FocusEvent) {
  if (
    open.value &&
    !trigger.value?.contains(event.target as Node) &&
    !panel.value?.contains(event.target as Node)
  )
    close();
}
function keyboard(event: KeyboardEvent) {
  if (!open.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }
}
onMounted(() => {
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('focusin', focusOutside, true);
  document.addEventListener('keydown', keyboard, true);
  document.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
  window.visualViewport?.addEventListener('resize', place);
  window.visualViewport?.addEventListener('scroll', place);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside, true);
  document.removeEventListener('focusin', focusOutside, true);
  document.removeEventListener('keydown', keyboard, true);
  document.removeEventListener('scroll', place, true);
  window.removeEventListener('resize', place);
  window.visualViewport?.removeEventListener('resize', place);
  window.visualViewport?.removeEventListener('scroll', place);
});
</script>
<template>
  <button
    ref="trigger"
    class="icon-button rink-zoom-toggle"
    type="button"
    aria-label="Zoom de la patinoire"
    :aria-description="`${value} %`"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-controls="open ? id : undefined"
    :data-tooltip="`Zoom de la patinoire · ${value} %`"
    @click="toggle"
  >
    <Icon name="zoom" />
  </button>
  <Teleport to="body">
    <div
      v-if="open"
      :id="id"
      ref="panel"
      class="rink-zoom-popover"
      role="dialog"
      aria-label="Zoom de la patinoire"
      :style="{
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
      }"
    >
      <button
        class="rink-zoom-button"
        type="button"
        :aria-label="t('editor.zoomOut')"
        :disabled="value <= 100"
        @click="emit('zoom', 1 / 1.2)"
      >
        <Icon name="minus" />
      </button>
      <input
        ref="slider"
        type="range"
        min="100"
        max="300"
        step="10"
        :value="value"
        aria-label="Zoom de la patinoire"
        :aria-valuetext="`${value} %`"
        aria-orientation="horizontal"
        @keydown="adjust"
        @input="setZoom(Number(($event.target as HTMLInputElement).value))"
      />
      <output data-testid="zoom-value">{{ value }}%</output>
      <button
        class="rink-zoom-button"
        type="button"
        :aria-label="t('editor.zoomIn')"
        :disabled="value >= 300"
        @click="emit('zoom', 1.2)"
      >
        <Icon name="plus" />
      </button>
      <button
        class="rink-zoom-button"
        type="button"
        aria-label="Réinitialiser le zoom à 100 %"
        @click="resetZoom"
      >
        <Icon name="reset" />
      </button>
    </div>
  </Teleport>
</template>
