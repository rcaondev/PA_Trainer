<script setup>
import { ref, computed } from 'vue'
import { state, dex, sprite, party, PARTY_MAX, addMember, removeMember, toggleParty, trainWith } from '../lib/store'
import { TYPES, typeLabel, typeColor } from '../lib/types'
import TypeBadge from './TypeBadge.vue'
import PokemonPicker from './PokemonPicker.vue'

const picker = ref(null)
const chosen = ref(null)
const nick = ref('')
const level = ref(1)
const typeFilter = ref(null)
const partyOnly = ref(false)

const partyFull = computed(() => party.value.length >= PARTY_MAX)

// só os tipos que existem entre os meus pokémons, com a contagem de cada um
const myTypes = computed(() => {
  const count = new Map()
  for (const m of state.team) for (const t of dex.get(m.key).types) count.set(t, (count.get(t) || 0) + 1)
  return TYPES.filter(t => count.has(t))
    .sort((a, b) => typeLabel(a).localeCompare(typeLabel(b), 'pt'))
    .map(t => ({ type: t, n: count.get(t) }))
})

const shown = computed(() => state.team.filter(m =>
  (!typeFilter.value || dex.get(m.key).types.includes(typeFilter.value)) &&
  (!partyOnly.value || m.party)))

function add() {
  if (!chosen.value) return
  addMember(chosen.value.key, nick.value, level.value)
  chosen.value = null
  nick.value = ''
  level.value = 1
  picker.value.clear()
}
</script>

<template>
  <div class="h-full overflow-auto p-6">
    <h1 class="text-xl font-semibold">Meus pokémons</h1>
    <p class="mt-1 mb-5 text-sm text-slate-400">
      Cadastre seus pokémons, marque os {{ PARTY_MAX }} que estão com você e clique em
      <b class="text-slate-200">Treinar</b> para ver no mapa os melhores locais para cada um.
    </p>

    <!-- z-10: cada .panel cria um contexto de empilhamento; sem isso os cards cobrem a lista do seletor -->
    <form class="panel relative z-10 mb-5 flex max-w-4xl flex-wrap items-end gap-3 p-4" @submit.prevent="add">
      <label class="min-w-56 flex-1">
        <span class="mb-1 block text-xs text-slate-400">Pokémon</span>
        <PokemonPicker ref="picker" placeholder="Ex.: Venusaur" @select="chosen = $event" @clear="chosen = null" />
      </label>
      <label class="w-44">
        <span class="mb-1 block text-xs text-slate-400">Apelido (opcional)</span>
        <input v-model="nick" class="field" maxlength="24" />
      </label>
      <label class="w-24">
        <span class="mb-1 block text-xs text-slate-400">Nível</span>
        <input v-model.number="level" type="number" min="1" max="999" class="field" />
      </label>
      <button
        type="submit"
        class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition enabled:cursor-pointer enabled:hover:brightness-110 disabled:opacity-40"
        :disabled="!chosen"
      >Adicionar</button>
    </form>

    <div v-if="!state.team.length" class="rounded-xl border border-dashed border-line p-10 text-center text-sm text-slate-500">
      Você ainda não cadastrou nenhum pokémon.
    </div>

    <template v-else>
      <!-- time atual: os 6 que estão comigo -->
      <section class="panel mb-5 max-w-4xl p-4">
        <div class="mb-3 flex items-baseline gap-2">
          <h2 class="text-sm font-semibold">Time atual</h2>
          <span class="text-xs" :class="partyFull ? 'text-accent-fg' : 'text-slate-400'">{{ party.length }}/{{ PARTY_MAX }}</span>
          <span class="ml-auto text-xs text-slate-500">São estes que aparecem em "Treinar com" no mapa.</span>
        </div>
        <div class="grid grid-cols-6 gap-2">
          <div
            v-for="i in PARTY_MAX"
            :key="i"
            class="flex h-24 flex-col items-center justify-center gap-1 rounded-xl text-center"
            :class="party[i - 1] ? 'bg-ink-800 ring-1 ring-accent/40' : 'border border-dashed border-line'"
          >
            <template v-if="party[i - 1]">
              <button class="cursor-pointer" title="Treinar com este" @click="trainWith(party[i - 1].uid)">
                <img :src="sprite(dex.get(party[i - 1].key))" class="pixel h-12 w-12 rounded-full bg-white/90 object-contain" alt="" />
              </button>
              <span class="w-full truncate px-1 text-xs">{{ party[i - 1].nick || dex.get(party[i - 1].key).name }}</span>
              <button class="text-[10px] text-slate-500 hover:text-rose-300 cursor-pointer" @click="toggleParty(party[i - 1].uid)">tirar do time</button>
            </template>
            <span v-else class="text-xs text-slate-600">vazio</span>
          </div>
        </div>
      </section>

      <!-- filtros -->
      <div class="mb-4 flex flex-wrap items-center gap-1.5">
        <span class="mr-1 text-sm text-slate-400">{{ shown.length }} de {{ state.team.length }}</span>
        <button
          class="rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition cursor-pointer"
          :class="partyOnly ? 'bg-accent text-on-accent ring-accent' : 'bg-ink-800 text-slate-300 ring-line hover:ring-strong/40'"
          @click="partyOnly = !partyOnly"
        >Só o time atual</button>
        <button
          v-for="t in myTypes"
          :key="t.type"
          class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white transition cursor-pointer"
          :class="typeFilter && typeFilter !== t.type ? 'opacity-35 hover:opacity-70' : ''"
          :style="{ background: typeColor(t.type) }"
          @click="typeFilter = typeFilter === t.type ? null : t.type"
        >{{ typeLabel(t.type) }} <span class="font-normal opacity-80">{{ t.n }}</span></button>
      </div>

      <div v-if="!shown.length" class="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-500">
        Nenhum dos seus pokémons passa nesses filtros.
      </div>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
        <article
          v-for="m in shown"
          :key="m.uid"
          class="panel flex flex-col p-4"
          :class="m.party && 'border-accent/60!'"
        >
          <div class="flex items-center gap-3">
            <img :src="sprite(dex.get(m.key))" class="pixel h-16 w-16 rounded-xl bg-white/90 object-contain" alt="" />
            <div class="min-w-0 flex-1">
              <div class="truncate font-semibold">{{ m.nick || dex.get(m.key).name }}</div>
              <div v-if="m.nick" class="truncate text-xs text-slate-400">{{ dex.get(m.key).name }}</div>
              <div class="mt-1 flex gap-1"><TypeBadge v-for="t in dex.get(m.key).types" :key="t" :type="t" small /></div>
            </div>
            <label class="text-center">
              <span class="block text-[10px] uppercase tracking-wider text-slate-500">Nível</span>
              <input v-model.number="m.level" type="number" min="1" max="999" class="field w-16 px-1 py-1 text-center" />
            </label>
          </div>

          <div class="mt-3 space-y-2 text-xs">
            <div v-if="dex.get(m.key).weak.length">
              <div class="mb-1 text-rose-300">Fraco a</div>
              <div class="flex flex-wrap gap-1"><TypeBadge v-for="t in dex.get(m.key).weak" :key="t" :type="t" small /></div>
            </div>
            <div v-if="dex.get(m.key).resist.length || dex.get(m.key).immune.length">
              <div class="mb-1 text-emerald-300">Resiste / imune a</div>
              <div class="flex flex-wrap gap-1">
                <TypeBadge v-for="t in [...dex.get(m.key).resist, ...dex.get(m.key).immune]" :key="t" :type="t" small />
              </div>
            </div>
          </div>

          <div class="mt-auto flex gap-2 pt-4">
            <button
              class="rounded-lg px-3 py-2 text-sm font-medium ring-1 transition enabled:cursor-pointer disabled:opacity-40"
              :class="m.party ? 'bg-accent text-on-accent ring-accent' : 'text-slate-300 ring-line enabled:hover:ring-strong/40'"
              :disabled="!m.party && partyFull"
              :title="m.party ? 'Tirar do time atual' : partyFull ? `O time já tem ${PARTY_MAX}; tire um antes` : 'Colocar no time atual'"
              @click="toggleParty(m.uid)"
            >{{ m.party ? '✓ No time' : '+ Time' }}</button>
            <button
              class="flex-1 rounded-lg bg-accent/15 py-2 text-sm font-semibold text-accent-fg ring-1 ring-accent/40 transition hover:bg-accent/25 cursor-pointer"
              @click="trainWith(m.uid)"
            >Treinar</button>
            <button
              class="rounded-lg px-3 py-2 text-sm text-slate-400 ring-1 ring-line transition hover:text-rose-300 hover:ring-rose-400/40 cursor-pointer"
              title="Remover dos meus pokémons"
              @click="removeMember(m.uid)"
            >✕</button>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>
