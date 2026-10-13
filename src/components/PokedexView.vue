<script setup>
import { ref, computed, watch } from 'vue'
import { state, sprite, addMember, showOnMap } from '../lib/store'
import { TYPES, typeLabel, typeColor } from '../lib/types'
import TypeBadge from './TypeBadge.vue'

const PAGE = 120 // sprites são GIFs animados; renderiza aos poucos

const query = ref('')
const type = ref(null)
const region = ref('')
const spawnOnly = ref(false)
const limit = ref(PAGE)
const selected = ref(null)
const added = ref(false)

const SORTED_TYPES = [...TYPES].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b), 'pt'))
const regions = [...new Set(state.pokedex.map(m => m.region).filter(Boolean))].sort()
const withSpawn = state.pokedex.filter(m => m.spawns).length

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  return state.pokedex.filter(m =>
    (!q || m.name.toLowerCase().includes(q) || String(m.num) === q) &&
    (!type.value || m.types.includes(type.value)) &&
    (!region.value || m.region === region.value) &&
    (!spawnOnly.value || m.spawns > 0))
})

watch([query, type, region, spawnOnly], () => { limit.value = PAGE })
watch(selected, () => { added.value = false })

const num = m => (m.num ? '#' + String(m.num).padStart(3, '0') : '—')
const stat = (base, growth) => (base ? base.toLocaleString('pt-BR') + (growth ? ` (+${growth}/nível)` : '') : '—')

function addToTeam() {
  addMember(selected.value.key, '', 1)
  added.value = true
}
</script>

<template>
  <div class="flex h-full">
    <section class="flex min-w-0 flex-1 flex-col p-6 pr-3">
      <div class="flex items-baseline gap-3">
        <h1 class="text-xl font-semibold">Pokédex</h1>
        <span class="text-sm text-slate-400">{{ results.length }} de {{ state.pokedex.length }} pokémons</span>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <input v-model="query" class="field w-64" placeholder="Buscar por nome ou número…" spellcheck="false" />
        <select v-model="region" class="field w-40 cursor-pointer">
          <option value="">Todas as gerações</option>
          <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
        </select>
        <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-300" title="Mostra só os pokémons que têm spawn registrado no mapa">
          <input v-model="spawnOnly" type="checkbox" class="accent-accent" />
          Só os que aparecem no mapa <span class="text-slate-500">({{ withSpawn }})</span>
        </label>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <button
          v-for="t in SORTED_TYPES"
          :key="t"
          class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white transition cursor-pointer"
          :class="type && type !== t ? 'opacity-35 hover:opacity-70' : ''"
          :style="{ background: typeColor(t) }"
          @click="type = type === t ? null : t"
        >{{ typeLabel(t) }}</button>
      </div>

      <div class="mt-4 min-h-0 flex-1 overflow-auto pr-2">
        <div v-if="!results.length" class="p-10 text-center text-sm text-slate-500">Nenhum pokémon com esses filtros.</div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5">
          <button
            v-for="m in results.slice(0, limit)"
            :key="m.key"
            class="panel flex flex-col items-center gap-1 p-3 text-center transition cursor-pointer hover:border-accent"
            :class="selected?.key === m.key && 'border-accent!'"
            @click="selected = m"
          >
            <span class="self-stretch text-left font-mono text-[10px] text-slate-500">{{ num(m) }}</span>
            <img :src="sprite(m)" class="pixel h-14 w-14 object-contain" loading="lazy" alt="" />
            <span class="w-full truncate text-sm font-medium">{{ m.name }}</span>
            <span class="flex flex-wrap justify-center gap-1"><TypeBadge v-for="t in m.types" :key="t" :type="t" small /></span>
            <span class="text-[10px]" :class="m.spawns ? 'text-emerald-400' : 'text-slate-600'">
              {{ m.spawns ? m.spawns + (m.spawns === 1 ? ' local' : ' locais') : 'sem spawn no mapa' }}
            </span>
          </button>
        </div>
        <div v-if="results.length > limit" class="py-5 text-center">
          <button class="rounded-lg px-4 py-2 text-sm text-slate-300 ring-1 ring-line transition hover:ring-strong/40 cursor-pointer" @click="limit += PAGE">
            Mostrar mais ({{ results.length - limit }} restantes)
          </button>
        </div>
      </div>
    </section>

    <aside class="w-88 shrink-0 overflow-auto p-6 pl-3">
      <div v-if="!selected" class="panel p-5 text-sm leading-relaxed text-slate-400">
        Clique em um pokémon para ver a ficha: atributos, fraquezas reais do jogo e onde encontrá-lo.
      </div>
      <div v-else class="panel p-5">
        <div class="flex items-center gap-4">
          <img :src="sprite(selected)" class="pixel h-20 w-20 rounded-xl bg-white/90 object-contain" alt="" />
          <div class="min-w-0">
            <div class="font-mono text-xs text-slate-500">{{ num(selected) }}</div>
            <div class="text-lg font-semibold leading-tight">{{ selected.name }}</div>
            <div class="mt-1.5 flex gap-1"><TypeBadge v-for="t in selected.types" :key="t" :type="t" /></div>
          </div>
        </div>

        <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <template v-for="[k, v] in [
            ['Forma', selected.form], ['Geração', selected.region], ['Raridade', selected.rarity],
            ['Vida', stat(selected.hp, selected.hpGrowth)], ['Experiência', stat(selected.exp, selected.expGrowth)],
            ['Velocidade', selected.speed || '—'],
            ['Evolui para', selected.evolvesTo ? `${selected.evolvesTo} (nível ${selected.evolvesAt})` : ''],
          ]" :key="k">
            <template v-if="v">
              <dt class="text-slate-500">{{ k }}</dt>
              <dd>{{ v }}</dd>
            </template>
          </template>
        </dl>

        <div
          v-for="g in [
            { title: 'Fraco a (×2)', types: selected.weak, tone: 'text-rose-300' },
            { title: 'Resiste a (×½)', types: selected.resist, tone: 'text-emerald-300' },
            { title: 'Imune a (×0)', types: selected.immune, tone: 'text-slate-400' },
          ]"
          v-show="g.types.length"
          :key="g.title"
          class="mt-4"
        >
          <div class="mb-1.5 text-xs font-semibold" :class="g.tone">{{ g.title }}</div>
          <div class="flex flex-wrap gap-1"><TypeBadge v-for="t in g.types" :key="t" :type="t" small /></div>
        </div>

        <div class="mt-5 flex flex-col gap-2">
          <button
            class="rounded-lg bg-accent py-2 text-sm font-semibold text-on-accent transition enabled:cursor-pointer enabled:hover:brightness-110 disabled:opacity-40"
            :disabled="!selected.spawns"
            @click="showOnMap(selected)"
          >{{ selected.spawns ? `Ver ${selected.spawns} ${selected.spawns === 1 ? 'local' : 'locais'} no mapa` : 'Sem spawn no mapa' }}</button>
          <button
            class="rounded-lg py-2 text-sm text-slate-300 ring-1 ring-line transition enabled:cursor-pointer enabled:hover:ring-strong/40 disabled:opacity-60"
            :disabled="added"
            @click="addToTeam"
          >{{ added ? 'Adicionado aos meus pokémons ✓' : 'Adicionar aos meus pokémons' }}</button>
        </div>
      </div>
    </aside>
  </div>
</template>
