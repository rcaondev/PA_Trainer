<script setup>
import { ref, computed } from 'vue'
import { TYPES, effectiveness, typeLabel } from '../lib/types'
import { incoming } from '../lib/advisor'
import { sprite } from '../lib/store'
import TypeBadge from './TypeBadge.vue'
import PokemonPicker from './PokemonPicker.vue'

const hovered = ref(null)
const pinned = ref(null) // clique fixa o tipo no painel de detalhe
const mon = ref(null)

const SORTED = [...TYPES].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b), 'pt'))
const mult = v => (v === 0.5 ? '½' : String(v))

// uma linha por tipo: em quem ele bate forte e quem bate forte nele
const rows = SORTED.map(t => ({
  type: t,
  strong: SORTED.filter(d => effectiveness(t, d) === 2),
  weak: SORTED.filter(a => effectiveness(a, t) === 2),
}))

const focus = computed(() => hovered.value ?? pinned.value)

// todos os multiplicadores do tipo em foco, atacando e defendendo
const detail = computed(() => {
  const t = focus.value
  if (!t) return null
  const atk = v => SORTED.filter(d => effectiveness(t, d) === v)
  const def = v => SORTED.filter(a => effectiveness(a, t) === v)
  return [
    { title: 'Atacando', groups: [
      { v: 2, label: 'Super efetivo', types: atk(2), tone: 'text-emerald-300' },
      { v: 0.5, label: 'Pouco efetivo', types: atk(0.5), tone: 'text-rose-300' },
      { v: 0, label: 'Sem efeito', types: atk(0), tone: 'text-slate-400' },
    ] },
    { title: 'Defendendo', groups: [
      { v: 2, label: 'Fraco a', types: def(2), tone: 'text-rose-300' },
      { v: 0.5, label: 'Resiste a', types: def(0.5), tone: 'text-emerald-300' },
      { v: 0, label: 'Imune a', types: def(0), tone: 'text-slate-400' },
    ] },
  ]
})

// fraquezas reais do pokémon escolhido, segundo a ficha do jogo
const monGroups = computed(() => {
  if (!mon.value) return []
  const by = v => SORTED.filter(t => incoming(mon.value, t) === v)
  return [
    { title: 'Fraco a (recebe ×2)', types: by(2), tone: 'text-rose-300' },
    { title: 'Resiste a (recebe ×½)', types: by(0.5), tone: 'text-emerald-300' },
    { title: 'Imune a (recebe ×0)', types: by(0), tone: 'text-slate-400' },
  ]
})
</script>

<template>
  <div class="flex h-full gap-5 overflow-auto p-6">
    <section class="w-full min-w-0 max-w-4xl">
      <h1 class="text-xl font-semibold">Vantagens e desvantagens</h1>
      <p class="mt-1 mb-4 text-sm text-slate-400">
        Passe o mouse sobre um tipo para ver todos os multiplicadores; clique para fixar.
      </p>

      <div class="panel max-w-4xl overflow-hidden" @mouseleave="hovered = null">
        <div class="grid grid-cols-[9rem_1fr_1fr] border-b border-line bg-ink-800 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Tipo</span>
          <span class="text-emerald-300">Vantagem <span class="font-normal normal-case tracking-normal text-slate-500">· causa ×2 em</span></span>
          <span class="text-rose-300">Desvantagem <span class="font-normal normal-case tracking-normal text-slate-500">· recebe ×2 de</span></span>
        </div>
        <div
          v-for="r in rows"
          :key="r.type"
          class="grid cursor-pointer grid-cols-[9rem_1fr_1fr] items-center border-b border-line px-4 py-1.5 transition last:border-b-0"
          :class="focus === r.type ? 'bg-ink-700' : pinned === r.type ? 'bg-ink-800' : ''"
          @mouseenter="hovered = r.type"
          @click="pinned = pinned === r.type ? null : r.type"
        >
          <span><TypeBadge :type="r.type" /></span>
          <span class="flex flex-wrap gap-1">
            <TypeBadge
              v-for="t in r.strong"
              :key="t"
              :type="t"
              small
              :title="`${typeLabel(r.type)} → ${typeLabel(t)}: ×2`"
            />
            <span v-if="!r.strong.length" class="text-slate-600">—</span>
          </span>
          <span class="flex flex-wrap gap-1">
            <TypeBadge
              v-for="t in r.weak"
              :key="t"
              :type="t"
              small
              :title="`${typeLabel(t)} → ${typeLabel(r.type)}: ×2`"
            />
            <span v-if="!r.weak.length" class="text-slate-600">—</span>
          </span>
        </div>
      </div>
    </section>

    <section class="w-80 shrink-0 space-y-5">
      <div class="panel min-h-56 p-4">
        <div v-if="!detail" class="text-sm leading-relaxed text-slate-400">
          Passe o mouse sobre um tipo para ver aqui os multiplicadores ×2, ×½ e ×0, atacando e defendendo.
        </div>
        <template v-else>
          <div class="flex items-center gap-2">
            <TypeBadge :type="focus" />
            <span v-if="pinned === focus" class="text-[10px] uppercase tracking-wider text-slate-500">fixado</span>
          </div>
          <div v-for="side in detail" :key="side.title" class="mt-4 border-t border-line pt-3">
            <div class="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ side.title }}</div>
            <div v-for="g in side.groups" v-show="g.types.length" :key="g.label" class="mb-3">
              <div class="mb-1.5 flex items-center gap-2 text-xs" :class="g.tone">
                <b class="rounded bg-ink-800 px-1.5 py-0.5 font-mono">×{{ mult(g.v) }}</b>{{ g.label }}
              </div>
              <div class="flex flex-wrap gap-1.5"><TypeBadge v-for="t in g.types" :key="t" :type="t" small /></div>
            </div>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">Os demais tipos são neutros (×1).</p>
        </template>
      </div>

      <div>
        <h2 class="text-sm font-semibold">Consultar um pokémon</h2>
        <p class="mt-1 mb-3 text-xs leading-relaxed text-slate-400">
          No Padventures as fraquezas são definidas por pokémon e podem fugir da tabela (vários são fracos a
          Dragão, por exemplo). Aqui aparecem os valores reais da Pokédex do jogo.
        </p>
        <PokemonPicker @select="mon = $event" @clear="mon = null" />

        <div v-if="mon" class="panel mt-3 p-4">
          <div class="flex items-center gap-3">
            <img :src="sprite(mon)" class="pixel h-14 w-14 rounded-lg bg-white/90 object-contain" alt="" />
            <div>
              <div class="font-semibold">{{ mon.name }}</div>
              <div class="mt-1 flex gap-1"><TypeBadge v-for="t in mon.types" :key="t" :type="t" /></div>
            </div>
          </div>
          <div v-for="g in monGroups" v-show="g.types.length" :key="g.title" class="mt-4">
            <div class="mb-1.5 text-xs font-semibold" :class="g.tone">{{ g.title }}</div>
            <div class="flex flex-wrap gap-1"><TypeBadge v-for="t in g.types" :key="t" :type="t" /></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
