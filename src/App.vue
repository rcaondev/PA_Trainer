<script setup>
import { state, THEMES } from './lib/store'
import MapView from './components/MapView.vue'
import TypeChartView from './components/TypeChartView.vue'
import TeamView from './components/TeamView.vue'
import PokedexView from './components/PokedexView.vue'

const NAV = [
  { id: 'map', label: 'Mapa', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'dex', label: 'Pokédex', icon: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4zM5 17a3 3 0 013-3h11M9 8h6' },
  { id: 'types', label: 'Tipos', icon: 'M4 6h16M4 12h16M4 18h16M9 3v18M15 3v18' },
  { id: 'team', label: 'Meus pokémons', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h6m6 0h6M12 9a3 3 0 100 6 3 3 0 000-6z' },
]
</script>

<template>
  <div class="flex h-full">
    <nav class="flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-line bg-nav py-4">
      <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-nav-on text-sm font-black text-nav-on-fg">PA</div>
      <button
        v-for="n in NAV"
        :key="n.id"
        class="flex w-16 flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] leading-tight transition cursor-pointer"
        :class="state.view === n.id ? 'bg-nav-on text-nav-on-fg' : 'text-nav-fg hover:bg-black/10 hover:text-nav-hover'"
        @click="state.view = n.id"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path :d="n.icon" />
        </svg>
        <span class="text-center">{{ n.label }}</span>
      </button>
      <div class="mt-auto flex flex-col items-center gap-2">
        <span class="text-[9px] uppercase tracking-wider text-nav-fg">Tema</span>
        <button
          v-for="t in THEMES"
          :key="t.id"
          class="h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-nav transition cursor-pointer"
          :class="state.theme === t.id ? 'ring-nav-hover' : 'ring-transparent opacity-70 hover:opacity-100'"
          :style="{ background: 'linear-gradient(135deg, ' + t.swatch[0] + ' 50%, ' + t.swatch[1] + ' 50%)' }"
          :title="'Tema ' + t.label"
          @click="state.theme = t.id"
        ></button>
      </div>
    </nav>

    <main class="relative min-w-0 flex-1">
      <div v-if="state.error" class="absolute inset-x-0 top-0 z-[2000] bg-rose-600/90 px-4 py-2 text-center text-sm text-white">
        {{ state.error }}
      </div>
      <div v-if="!state.ready && !state.error" class="flex h-full items-center justify-center text-sm text-slate-500">
        Carregando mapa…
      </div>
      <template v-if="state.ready">
        <MapView v-show="state.view === 'map'" />
        <TypeChartView v-if="state.view === 'types'" />
        <TeamView v-if="state.view === 'team'" />
        <PokedexView v-if="state.view === 'dex'" />
      </template>
    </main>
  </div>
</template>
