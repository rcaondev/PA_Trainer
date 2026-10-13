import { reactive, computed, markRaw, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { SKILLS, parseReqs } from './reqs'
import { townOf, regionOf } from './regions'

const inTauri = '__TAURI_INTERNALS__' in window
const LS_KEY = 'pa-trainer-team'
const LS_FILTER = 'pa-trainer-filter'
const LS_THEME = 'pa-trainer-theme'

export const THEMES = [
  { id: 'emerald', label: 'Esmeralda', swatch: ['#0b1220', '#10b981'] },
  { id: 'pokedex', label: 'Pokédex', swatch: ['#dc2626', '#ffffff'] },
]

function loadTheme() {
  let id = null
  try { id = localStorage.getItem(LS_THEME) } catch {}
  return THEMES.some(t => t.id === id) ? id : THEMES[0].id
}

// Preferência de filtro do mapa: habilidades que o jogador tem e o nível dele.
function loadFilter() {
  const all = SKILLS.map(s => s.id)
  try {
    const f = JSON.parse(localStorage.getItem(LS_FILTER))
    return { owned: all.filter(id => !f.missing.includes(id)), level: Number(f.level) || '' }
  } catch {
    return { owned: all, level: '' }
  }
}

export const state = reactive({
  ready: false,
  error: '',
  view: 'map',
  meta: null,
  nodes: [],
  pokedex: [],
  team: [], // { uid, key, nick, level }
  activeUid: null, // pokémon do time escolhido para treinar
  searched: null, // pokémon buscado no mapa (ficha da pokédex)
  theme: loadTheme(),
  filter: loadFilter(), // { owned: ids de SKILLS, level: 0 = sem filtro de nível }
})

watch(() => state.theme, id => {
  document.documentElement.dataset.theme = id
  try { localStorage.setItem(LS_THEME, id) } catch {}
}, { immediate: true })

// chave da pokédex -> ficha
export const dex = new Map()

export const sprite = mon => (mon?.img ? `sprites/${mon.img}` : '')

export const trainer = computed(() => {
  const member = state.team.find(m => m.uid === state.activeUid)
  return member ? dex.get(member.key) ?? null : null
})

async function loadTeam() {
  try {
    const raw = inTauri ? await invoke('load_team') : localStorage.getItem(LS_KEY) || '[]'
    const team = JSON.parse(raw)
    return Array.isArray(team) ? team.filter(m => dex.has(m.key)) : []
  } catch (e) {
    console.error('Falha ao carregar o time', e)
    return []
  }
}

function saveTeam() {
  const data = JSON.stringify(state.team)
  if (inTauri) invoke('save_team', { data }).catch(e => { state.error = `Não foi possível salvar o time: ${e}` })
  else localStorage.setItem(LS_KEY, data)
}

export async function init() {
  try {
    const [map, pokedex] = await Promise.all(
      ['data/map.json', 'data/pokedex.json'].map(async u => {
        const res = await fetch(u)
        if (!res.ok) throw new Error(`${u}: HTTP ${res.status}`)
        return res.json()
      }),
    )
    for (const mon of pokedex) dex.set(mon.key, mon)
    state.meta = markRaw(map.meta)
    for (const node of map.nodes) {
      const town = townOf(node.where || '')
      Object.assign(node, parseReqs(node.desc), { town, region: regionOf(town) })
    }
    state.nodes = markRaw(map.nodes)
    state.pokedex = markRaw(pokedex)
    state.team = await loadTeam()
    watch(() => state.team, saveTeam, { deep: true })
    // guarda o que falta (e não o que tem) para habilidades novas já nascerem ligadas
    watch(() => state.filter, f => {
      const missing = SKILLS.map(s => s.id).filter(id => !f.owned.includes(id))
      try { localStorage.setItem(LS_FILTER, JSON.stringify({ missing, level: f.level })) } catch {}
    }, { deep: true })
    state.ready = true
  } catch (e) {
    state.error = `Dados do mapa não encontrados (${e.message}). Rode "npm run scrape" e reinicie.`
  }
}

export function addMember(key, nick, level) {
  const uid = crypto.randomUUID()
  state.team.push({ uid, key, nick: nick.trim(), level: Number(level) || 1 })
  return uid
}

export function removeMember(uid) {
  state.team = state.team.filter(m => m.uid !== uid)
  if (state.activeUid === uid) state.activeUid = null
}

export function showOnMap(mon) {
  state.searched = mon
  state.view = 'map'
}

export function trainWith(uid) {
  state.activeUid = uid
  state.view = 'map'
}
