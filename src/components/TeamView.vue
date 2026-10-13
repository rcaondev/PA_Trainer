<script setup>
import { ref } from 'vue'
import { state, dex, sprite, addMember, removeMember, trainWith } from '../lib/store'
import TypeBadge from './TypeBadge.vue'
import PokemonPicker from './PokemonPicker.vue'

const picker = ref(null)
const chosen = ref(null)
const nick = ref('')
const level = ref(1)

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
      Cadastre seus pokémons e clique em <b class="text-slate-200">Treinar</b> para ver no mapa os melhores locais para cada um.
    </p>

    <!-- z-10: cada .panel cria um contexto de empilhamento; sem isso os cards cobrem a lista do seletor -->
    <form class="panel relative z-10 mb-6 flex max-w-4xl flex-wrap items-end gap-3 p-4" @submit.prevent="add">
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

    <div class="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
      <article v-for="m in state.team" :key="m.uid" class="panel flex flex-col p-4">
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
            class="flex-1 rounded-lg bg-accent/15 py-2 text-sm font-semibold text-accent-fg ring-1 ring-accent/40 transition hover:bg-accent/25 cursor-pointer"
            @click="trainWith(m.uid)"
          >Treinar</button>
          <button
            class="rounded-lg px-3 py-2 text-sm text-slate-400 ring-1 ring-line transition hover:text-rose-300 hover:ring-rose-400/40 cursor-pointer"
            @click="removeMember(m.uid)"
          >Remover</button>
        </div>
      </article>
    </div>
  </div>
</template>
