<script setup>
import { typeColor, typeLabel } from '../lib/types'
defineProps({ type: String, small: Boolean })
</script>

<template>
  <span
    class="inline-block rounded-full font-semibold text-white whitespace-nowrap leading-none"
    :class="small ? 'px-1.5 py-[3px] text-[10px]' : 'px-2 py-1 text-[11px]'"
    :style="{ background: typeColor(type) }"
  >{{ typeLabel(type) }}</span>
</template>
