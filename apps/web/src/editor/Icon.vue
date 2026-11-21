<script setup lang="ts">
const paths = {
  first: 'M5 4v16M19 4 9 12l10 8V4Z',
  play: 'm8 4 12 8-12 8V4Z',
  pause: 'M8 5v14M16 5v14',
  step: 'm4 5 10 7-10 7V5ZM19 5v14',
  stepPrevious: 'M19 5v14M14 5 4 12l10 7V5Z',
  stepNext: 'M5 5v14M10 5l10 7-10 7V5Z',
  edit: 'm4 16 11-11 4 4L8 20H4v-4Z',
  move: 'm4 3 7 18 2-7 7-2L4 3Z',
  place: 'M12 3v18M3 12h18M6 6h12v12H6z',
  target: 'M5 19 19 5M10 5h9v9M5 14v5h5',
  pan: 'M8 13V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v8c0 4-3 6-7 6-3 0-5-1-7-4l-3-5a2 2 0 0 1 3-2l2 3Z',
  undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6v3',
  redo: 'm15 5 5 5-5 5M20 10H10a6 6 0 0 0-6 6v3',
  upload: 'M12 16V3M7 8l5-5 5 5M4 15v5h16v-5',
  download: 'M12 3v13M7 11l5 5 5-5M4 16v5h16v-5',
  save: 'M5 3h12l4 4v14H3V3h2Zm2 0v7h10V3M7 21v-7h10v7',
  reset: 'M3 10a9 9 0 1 1 1 8M3 4v6h6',
  flip: 'm16 3 4 4-4 4M20 7H4m4 14-4-4 4-4M4 17h16',
  fit: 'M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6',
  minus: 'M5 12h14',
  plus: 'M5 12h14M12 5v14',
  insertStep: 'M5 4v16M19 4v16M9 12h6M12 9v6',
  zoom: 'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  down: 'm7 10 5 5 5-5',
  puck: 'M5 8c0-5 14-5 14 0s-14 5-14 0Zm0 0v8c0 5 14 5 14 0V8',
  check: 'm5 12 4 4L19 6',
  chevron: 'm9 5 7 7-7 7',
};
defineProps<{ name: keyof typeof paths }>();
</script>
<template>
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
