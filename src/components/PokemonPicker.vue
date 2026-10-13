<script setup>
import { ref, computed } from 'vue'
import { state, sprite } from '../lib/store'
import TypeBadge from './TypeBadge.vue'

const props = defineProps({
  placeholder: { type: String, default: 'Buscar pokémon…' },
  spawnOnly: Boolean, // só pokémons que aparecem no mapa
})
const emit = defineEmits(['select', 'clear'])

const query = ref('')
const open = ref(false)
const cursor = ref(0)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const out = []
  for (const mon of state.pokedex) {
    if (props.spawnOnly && !mon.spawns) continue
    const i = mon.name.toLowerCase().indexOf(q)
    if (i >= 0) out.push([i, mon])
  }
  return out.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).slice(0, 30).map(r => r[1])
})

function pick(mon) {
  if (!mon) return
  query.value = mon.name
  open.value = false
  emit('select', mon)
}
function clear() {
  query.value = ''
  open.value = false
  emit('clear')
}
function move(d) {
  if (results.value.length) cursor.value = (cursor.value + d + results.value.length) % results.value.length
}
defineExpose({ clear })
</script>

<template>
  <div class="relative" @focusout="open = false">
    <input
      v-model="query"
      class="field pr-8"
      :placeholder="placeholder"
      spellcheck="false"
      @input="open = true; cursor = 0"
      @focus="open = !!query"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="pick(results[cursor])"
      @keydown.esc="open = false"
    />
    <button
      v-if="query"
      class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 cursor-pointer"
      title="Limpar"
      @mousedown.prevent="clear"
    >✕</button>
    <div
      v-if="open && query.trim()"
      class="absolute z-[1200] mt-1 w-full max-h-72 overflow-auto rounded-xl border border-line bg-ink-800 shadow-2xl"
    >
      <div v-if="!results.length" class="px-3 py-2 text-sm text-slate-500">Nada encontrado</div>
      <button
        v-for="(mon, i) in results"
        :key="mon.key"
        class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm cursor-pointer"
        :class="i === cursor ? 'bg-ink-600' : 'hover:bg-ink-700'"
        @mousedown.prevent="pick(mon)"
        @mousemove="cursor = i"
      >
        <img :src="sprite(mon)" class="pixel h-7 w-7 shrink-0 rounded bg-white/90 object-contain" alt="" />
        <span class="flex-1 truncate">{{ mon.name }}</span>
        <TypeBadge v-for="t in mon.types" :key="t" :type="t" small />
        <span v-if="spawnOnly" class="rounded-full bg-ink-950 px-1.5 text-[11px] text-slate-400">{{ mon.spawns }}</span>
      </button>
    </div>
  </div>
</template>
