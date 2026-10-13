<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import { state, dex, sprite, trainer } from '../lib/store'
import { matchup, rankNodes, VERDICTS } from '../lib/advisor'
import { SKILLS, isBlocked } from '../lib/reqs'
import { REGIONS } from '../lib/regions'
import TypeBadge from './TypeBadge.vue'
import PokemonPicker from './PokemonPicker.vue'

const TILE = 256
const LIST_LIMIT = 80

const mapEl = ref(null)
const coords = ref('—')
const selectedId = ref(null)
// pokémon buscado; fica no estado global porque a Pokédex também dispara a busca
const searched = computed({ get: () => state.searched, set: mon => { state.searched = mon } })
const showAll = ref(false) // mantém os demais nós visíveis durante busca/recomendação
const showTowns = ref(false)
const sortBy = ref('score')
const picker = ref(null)
const region = ref('all')
const stack = ref([]) // nós empilhados no ponto clicado, para escolher entre eles
const STACK_PX = 30

let map, towns, toLatLng
const markers = new Map()
const circles = new Map()
const nodesById = new Map(state.nodes.map(n => [n.id, n]))

// ---------- o que destacar ----------
// nós que o jogador alcança com as habilidades/nível marcados no filtro
const reqHidden = computed(() => new Set(
  state.nodes.filter(n => isBlocked(n, state.filter.owned, state.filter.level || 0)).map(n => n.id)))
const reachable = computed(() => state.nodes.filter(n =>
  !reqHidden.value.has(n.id) && (region.value === 'all' || n.region === region.value)))
const regionTabs = computed(() => {
  const count = id => state.nodes.filter(n => n.region === id).length
  return [{ id: 'all', label: 'Todas' }, ...REGIONS, { id: 'other', label: 'Outras' }].filter(r => r.id === 'all' || count(r.id))
})
const blockedIds = computed(() => {
  const ok = new Set(reachable.value.map(n => n.id))
  return new Set(state.nodes.filter(n => !ok.has(n.id)).map(n => n.id))
})

function toggleSkill(id) {
  const owned = state.filter.owned
  state.filter.owned = owned.includes(id) ? owned.filter(s => s !== id) : [...owned, id]
}

const ranked = computed(() => (trainer.value ? rankNodes(trainer.value, reachable.value, dex) : []))

const mode = computed(() => (searched.value ? 'search' : trainer.value ? 'train' : 'browse'))

const list = computed(() => {
  if (mode.value === 'search') {
    const key = searched.value.key
    return reachable.value
      .filter(n => n.creatures.includes(key))
      .sort((a, b) => a.desc.localeCompare(b.desc))
      .map(node => ({ node, tier: 'match' }))
  }
  if (mode.value === 'train') {
    return sortBy.value === 'xp' ? [...ranked.value].sort((a, b) => b.xp - a.xp || b.score - a.score) : ranked.value
  }
  return []
})

const tiers = computed(() => new Map(list.value.map(r => [r.node.id, r.tier])))
const selected = computed(() => nodesById.get(selectedId.value) ?? null)

const selectedCreatures = computed(() => {
  if (!selected.value) return []
  const rows = selected.value.creatures.map(key => {
    const mon = dex.get(key)
    return { mon, m: trainer.value ? matchup(trainer.value, mon) : null }
  })
  if (trainer.value) rows.sort((a, b) => (b.m?.score ?? -9) - (a.m?.score ?? -9))
  return rows
})

const VERDICT_STYLE = {
  great: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  trade: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
  neutral: 'bg-slate-500/15 text-slate-300 ring-slate-400/20',
  bad: 'bg-slate-500/15 text-slate-400 ring-slate-400/20',
  danger: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
}
const mult = v => (v === 0.5 ? '½' : v === 0.25 ? '¼' : String(v))

// ---------- mapa ----------
function paint() {
  const active = tiers.value
  const filtering = mode.value !== 'browse' && !showAll.value
  for (const [id, marker] of markers) {
    const el = marker.getElement()
    if (!el) continue
    const tier = active.get(id)
    const off = blockedIds.value.has(id) || (filtering && !tier && id !== selectedId.value)
    el.classList.toggle('mk-off', off)
    el.classList.toggle('mk-match', tier === 'match')
    el.classList.toggle('mk-good', tier === 'good')
    el.classList.toggle('mk-great', tier === 'great')
    el.classList.toggle('mk-focus', id === selectedId.value)
    marker.setZIndexOffset(id === selectedId.value ? 3000 : tier === 'great' ? 2000 : tier ? 1000 : 0)
    circles.get(id)?.setStyle({ opacity: off ? 0 : 1, fillOpacity: off ? 0 : 0.1 })
  }
}

function select(id, fly = true) {
  selectedId.value = id
  if (fly) stack.value = []
  const marker = markers.get(id)
  if (!fly || !marker) return
  map.invalidateSize() // o mapa pode ter acabado de voltar de outra tela
  map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), state.meta.max_zoom - 1), { duration: 0.6 })
}

// Clique num marcador: em áreas densas vários ficam um sobre o outro, então junta
// todos os visíveis a poucos pixels dali para o usuário escolher.
function pick(id) {
  const at = map.latLngToContainerPoint(markers.get(id).getLatLng())
  const near = []
  for (const [oid, m] of markers) {
    if (m.getElement()?.classList.contains('mk-off')) continue
    const d = at.distanceTo(map.latLngToContainerPoint(m.getLatLng()))
    if (d < STACK_PX) near.push([d, oid])
  }
  stack.value = near.length > 1 ? near.sort((a, b) => a[0] - b[0]).map(n => n[1]) : []
  select(id, false)
}

function fitRegion() {
  const pts = reachable.value.map(n => markers.get(n.id).getLatLng())
  if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(0.08), { duration: 0.6, paddingTopLeft: [340, 20], paddingBottomRight: [20, 20] })
}

function clearSearch() {
  searched.value = null
  picker.value?.clear()
}

onMounted(() => {
  const meta = state.meta
  const maxNative = meta.max_zoom
  const minZoom = Math.min(3, maxNative)

  map = L.map(mapEl.value, {
    crs: L.CRS.Simple, minZoom, maxZoom: maxNative + 2, attributionControl: false, zoomControl: false,
  })
  L.control.zoom({ position: 'bottomright' }).addTo(map)

  // pixel = coordenada do jogo - origem
  const px = (x, y) => map.unproject([x, y], maxNative)
  toLatLng = (gx, gy) => px(gx - meta.origin_x, gy - meta.origin_y)
  const bounds = L.latLngBounds(px(0, meta.height), px(meta.width, 0))

  L.tileLayer('tiles/{z}/{x}/{y}.png', {
    tileSize: TILE, minZoom, maxZoom: maxNative + 2, maxNativeZoom: maxNative, noWrap: true, bounds,
  }).addTo(map)
  towns = L.imageOverlay('tiles/towns.png', bounds)
  map.setMaxBounds(bounds.pad(0.05))

  if (meta.default_center_x || meta.default_center_y) {
    map.setView(toLatLng(meta.default_center_x, meta.default_center_y), meta.default_zoom || minZoom)
  } else {
    map.fitBounds(bounds)
  }

  map.on('mousemove', e => {
    const p = map.project(e.latlng, maxNative)
    coords.value = `${Math.round(p.x + meta.origin_x)}, ${Math.round(p.y + meta.origin_y)}`
  })
  map.on('click', () => { selectedId.value = null; stack.value = [] })

  for (const n of state.nodes) {
    const at = toLatLng(n.x, n.y)
    const icon = L.divIcon({
      html: `<div><img src="${sprite(dex.get(n.principal))}" alt=""></div>`,
      className: 'mk', iconSize: [36, 36], iconAnchor: [18, 18],
    })
    const marker = L.marker(at, { icon, riseOnHover: true }).addTo(map)
    marker.on('click', e => { L.DomEvent.stopPropagation(e); pick(n.id) })
    markers.set(n.id, marker)
    if (n.radius > 0) {
      circles.set(n.id, L.circle(at, {
        radius: map.distance(at, toLatLng(n.x + n.radius, n.y)),
        color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.1, interactive: false,
      }).addTo(map))
    }
  }
  paint()
})

onBeforeUnmount(() => map?.remove())

watch(blockedIds, ids => { if (ids.has(selectedId.value)) selectedId.value = null })
watch([tiers, showAll, selectedId, blockedIds], paint)
watch(showTowns, on => (on ? towns.addTo(map) : towns.remove()))
// ao trocar de pokémon/busca/região, enquadra o melhor resultado (ou a região inteira)
watch([trainer, searched, region], () => {
  selectedId.value = null
  stack.value = []
  nextTick(() => {
    if (list.value.length) select(list.value[0].node.id)
    else if (region.value !== 'all') fitRegion()
  })
}, { flush: 'post' })
// o mapa fica oculto (v-show) nas outras telas; recalcula o tamanho ao voltar
watch(() => state.view, v => { if (v === 'map') nextTick(() => map.invalidateSize()) })
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="mapEl" class="h-full w-full"></div>

    <!-- painel esquerdo: treino + busca + resultados -->
    <aside class="panel absolute left-3 top-3 bottom-3 z-[1000] flex w-80 flex-col overflow-hidden">
      <div class="space-y-3 border-b border-line p-3">
        <div>
          <div class="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Região</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="r in regionTabs"
              :key="r.id"
              class="rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition cursor-pointer"
              :class="region === r.id ? 'bg-accent text-on-accent ring-accent' : 'bg-ink-800 text-slate-300 ring-line hover:ring-strong/40'"
              @click="region = r.id"
            >{{ r.label }}</button>
          </div>
        </div>
        <div>
          <div class="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Treinar com</div>
          <div v-if="!state.team.length" class="rounded-lg bg-ink-800 px-3 py-2.5 text-sm text-slate-400">
            Nenhum pokémon cadastrado.
            <button class="font-semibold text-accent hover:underline cursor-pointer" @click="state.view = 'team'">Cadastrar</button>
          </div>
          <div v-else class="flex flex-wrap gap-1.5">
            <button
              v-for="m in state.team"
              :key="m.uid"
              class="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-medium ring-1 transition cursor-pointer"
              :class="state.activeUid === m.uid
                ? 'bg-accent/20 text-accent-fg ring-accent'
                : 'bg-ink-800 text-slate-300 ring-line hover:ring-strong/40'"
              :title="dex.get(m.key).name"
              @click="state.activeUid = state.activeUid === m.uid ? null : m.uid"
            >
              <img :src="sprite(dex.get(m.key))" class="pixel h-7 w-7 rounded-full bg-white/90 object-contain" alt="" />
              {{ m.nick || dex.get(m.key).name }}
            </button>
          </div>
        </div>
        <PokemonPicker
          ref="picker"
          spawn-only
          placeholder="Buscar pokémon no mapa…"
          @select="searched = $event"
          @clear="searched = null"
        />
        <div>
          <div class="mb-1.5 flex items-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span class="flex-1">Tenho acesso a</span>
            <span v-if="reqHidden.size" class="normal-case tracking-normal text-amber-400/90">{{ reqHidden.size }} locais ocultos</span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="s in SKILLS"
              :key="s.id"
              class="rounded-full px-2 py-1 text-[11px] font-medium ring-1 transition cursor-pointer"
              :class="state.filter.owned.includes(s.id)
                ? 'bg-accent/15 text-accent-fg ring-accent/50'
                : 'bg-ink-800 text-slate-500 line-through ring-line hover:text-slate-300'"
              :title="state.filter.owned.includes(s.id) ? 'Clique para ocultar locais que exigem ' + s.label : 'Clique para voltar a mostrar'"
              @click="toggleSkill(s.id)"
            >{{ s.label }}</button>
            <label class="mt-0.5 flex w-full items-center gap-2 whitespace-nowrap text-[11px] text-slate-400" title="Oculta locais que exigem nível maior que o seu. Vazio = não filtrar.">
              Meu nível
              <input v-model.number="state.filter.level" type="number" min="0" max="999" placeholder="—" class="field w-14 px-1.5 py-1 text-center text-xs" />
            </label>
          </div>
        </div>
      </div>

      <!-- cabeçalho do modo -->
      <div v-if="mode === 'search'" class="flex items-center gap-2 border-b border-line px-3 py-2">
        <img :src="sprite(searched)" class="pixel h-8 w-8 rounded bg-white/90 object-contain" alt="" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold">{{ searched.name }}</div>
          <div class="text-xs text-slate-400">{{ list.length }} {{ list.length === 1 ? 'local' : 'locais' }}</div>
        </div>
        <button class="text-xs text-slate-400 hover:text-strong cursor-pointer" @click="clearSearch">Fechar</button>
      </div>
      <div v-else-if="mode === 'train'" class="border-b border-line px-3 py-2">
        <div class="flex items-center gap-2">
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">Onde treinar {{ trainer.name }}</div>
            <div class="text-xs text-slate-400">{{ list.length }} locais recomendados</div>
          </div>
          <div class="flex rounded-lg bg-ink-800 p-0.5 text-xs">
            <button
              v-for="o in [['score', 'Vantagem'], ['xp', 'XP']]"
              :key="o[0]"
              class="rounded-md px-2 py-1 cursor-pointer"
              :class="sortBy === o[0] ? 'bg-ink-600 text-strong' : 'text-slate-400 hover:text-strong'"
              @click="sortBy = o[0]"
            >{{ o[1] }}</button>
          </div>
        </div>
        <div class="mt-1.5 flex flex-wrap items-center gap-1">
          <span class="text-[11px] text-slate-500">Forte contra quem é fraco a</span>
          <TypeBadge v-for="t in trainer.types" :key="t" :type="t" small />
        </div>
      </div>

      <!-- lista -->
      <div class="min-h-0 flex-1 overflow-auto">
        <div v-if="mode === 'browse'" class="p-4 text-sm leading-relaxed text-slate-400">
          Escolha um dos seus pokémons acima para ver os melhores locais de treino, ou busque um pokémon
          para ver onde ele aparece.
        </div>
        <div v-else-if="!list.length" class="p-4 text-sm text-slate-400">
          Nenhum local encontrado{{ mode === 'train' ? ' com vantagem de tipo para este pokémon' : '' }}.
        </div>
        <button
          v-for="r in list.slice(0, LIST_LIMIT)"
          :key="r.node.id"
          class="flex w-full items-center gap-2.5 border-b border-line px-3 py-2 text-left cursor-pointer"
          :class="selectedId === r.node.id ? 'bg-ink-700' : 'hover:bg-ink-800'"
          @click="select(r.node.id)"
        >
          <img :src="sprite(dex.get(r.node.principal))" class="pixel h-9 w-9 shrink-0 rounded-full bg-white/90 object-contain" alt="" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm">{{ r.node.desc || dex.get(r.node.principal).name }}</div>
            <div class="text-[11px] text-slate-500">
              {{ r.node.town }} · {{ r.node.x }}, {{ r.node.y }}
              <template v-if="r.good">
                · <span class="text-emerald-400">{{ r.good }}/{{ r.known }} alvos</span>
                <span v-if="r.danger" class="text-rose-400"> · {{ r.danger }} perigo</span>
                · {{ r.xp }} xp
              </template>
            </div>
          </div>
          <span
            v-if="r.tier !== 'match'"
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :class="r.tier === 'great' ? 'bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400' : 'bg-lime-500'"
          ></span>
        </button>
        <div v-if="list.length > LIST_LIMIT" class="p-3 text-center text-xs text-slate-500">
          + {{ list.length - LIST_LIMIT }} locais destacados no mapa
        </div>
      </div>
    </aside>

    <!-- detalhe do nó -->
    <aside v-if="selected" class="panel absolute right-3 top-14 z-[1000] flex max-h-[calc(100%-7rem)] w-80 flex-col overflow-hidden">
      <div v-if="stack.length > 1" class="border-b border-line p-2.5">
        <div class="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ stack.length }} locais neste ponto</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="id in stack"
            :key="id"
            class="rounded-full ring-2 transition cursor-pointer"
            :class="id === selectedId ? 'ring-accent' : 'ring-transparent opacity-70 hover:opacity-100'"
            :title="dex.get(nodesById.get(id).principal).name"
            @click="selectedId = id"
          >
            <img :src="sprite(dex.get(nodesById.get(id).principal))" class="pixel h-9 w-9 rounded-full bg-white/90 object-contain" alt="" />
          </button>
        </div>
      </div>
      <div class="flex items-start gap-2 border-b border-line p-3">
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold leading-snug">{{ selected.desc || 'Spawn' }}</div>
          <div class="mt-0.5 text-xs text-slate-400">
            {{ selected.where }}<br />{{ selected.x }}, {{ selected.y }} · {{ selected.creatures.length }} pokémons
          </div>
        </div>
        <button class="text-slate-500 hover:text-strong cursor-pointer" title="Fechar" @click="selectedId = null">✕</button>
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-1.5">
        <div v-for="{ mon, m } in selectedCreatures" :key="mon.key" class="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-line">
          <img :src="sprite(mon)" class="pixel h-9 w-9 shrink-0 rounded bg-white/90 object-contain" alt="" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1 truncate text-sm">
              {{ mon.name }}
              <span v-if="mon.key === selected.principal" class="text-amber-400" title="Principal do local">★</span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-1">
              <TypeBadge v-for="t in mon.types" :key="t" :type="t" small />
              <span v-if="mon.exp" class="text-[10px] text-slate-500">{{ mon.exp }} xp · {{ mon.hp }} hp</span>
            </div>
          </div>
          <span
            v-if="m"
            class="shrink-0 rounded-md px-1.5 py-1 text-center text-[10px] font-semibold leading-tight ring-1"
            :class="VERDICT_STYLE[m.verdict]"
            :title="`Você causa ×${mult(m.off)} · recebe ×${mult(m.def)}`"
          >
            {{ VERDICTS[m.verdict].label }}<br />
            <span class="font-normal opacity-80">×{{ mult(m.off) }} / ×{{ mult(m.def) }}</span>
          </span>
        </div>
      </div>
    </aside>

    <!-- camadas -->
    <div class="panel absolute right-3 top-3 z-[1000] flex items-center gap-4 px-3 py-2 text-xs text-slate-300">
      <label class="flex cursor-pointer items-center gap-1.5">
        <input v-model="showTowns" type="checkbox" class="accent-accent" /> Nomes das cidades
      </label>
      <label class="flex cursor-pointer items-center gap-1.5" :class="mode === 'browse' && 'opacity-40'">
        <input v-model="showAll" type="checkbox" class="accent-accent" :disabled="mode === 'browse'" /> Mostrar todos os spawns
      </label>
    </div>

    <div class="panel absolute bottom-3 left-[21.5rem] z-[1000] px-2.5 py-1 font-mono text-xs text-slate-300">{{ coords }}</div>
  </div>
</template>
