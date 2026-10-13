// Baixa o mapa (tiles + spawns) e a Pokédex do Padventures para uso offline.
//   node scripts/scrape.mjs            -> baixa só o que falta
//   node scripts/scrape.mjs --refresh  -> ignora o cache de HTML/JSON (tiles e sprites são mantidos)
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUB = join(ROOT, 'public')
const CACHE = join(ROOT, '.cache')
const MAP = 'https://map.padventures.org'
const SITE = 'https://www.padventures.org'
const UA = 'Mozilla/5.0 (PA-project; uso pessoal)'
const REFRESH = process.argv.includes('--refresh')

const exists = p => access(p).then(() => true, () => false)
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (e) {
      if (i >= tries - 1) throw new Error(`${url}: ${e.message}`)
      await sleep(800 * (i + 1))
    }
  }
}

async function save(path, buf) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, buf)
}

// Texto com cache em .cache/ (para não rebaixar ~1000 páginas a cada execução).
async function cachedText(url, cachePath) {
  const p = join(CACHE, cachePath)
  if (!REFRESH && await exists(p)) return readFile(p, 'utf8')
  const buf = await get(url)
  if (!buf) return null
  await save(p, buf)
  return buf.toString('utf8')
}

async function pool(items, limit, fn, label) {
  let next = 0, done = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      await fn(items[i], i)
      if (++done % 100 === 0 || done === items.length) console.log(`  ${label}: ${done}/${items.length}`)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
}

const decode = s => s
  .replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&eacute;/g, 'é').replace(/&nbsp;/g, ' ')
const text = s => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
const typesIn = s => [...s.matchAll(/pdx-type pdx-type-([a-z]+)/g)].map(m => m[1])
const normName = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// ---------- mapa ----------
async function scrapeMap() {
  console.log('Mapa: meta + spawns')
  const meta = JSON.parse(await cachedText(`${MAP}/meta.json`, 'meta.json'))
  const spawns = JSON.parse(await cachedText(`${MAP}/api/spawns`, 'spawns.json'))

  const jobs = []
  for (let z = 0; z <= meta.max_zoom; z++) {
    const scale = 2 ** (meta.max_zoom - z)
    const nx = Math.ceil(meta.width / scale / 256), ny = Math.ceil(meta.height / scale / 256)
    for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) jobs.push(`${z}/${x}/${y}.png`)
  }
  let missing = 0
  await pool(jobs, 8, async t => {
    const dest = join(PUB, 'tiles', t)
    if (await exists(dest)) return
    const buf = await get(`${MAP}/tiles/${t}`)
    if (buf) await save(dest, buf); else missing++
  }, 'tiles')
  if (missing) console.log(`  tiles inexistentes no servidor: ${missing}`)

  const towns = join(PUB, 'tiles', 'towns.png')
  if (!await exists(towns)) await save(towns, await get(`${MAP}/static/towns2.png`))
  return { meta, spawns }
}

// ---------- pokédex ----------
function parseStats(block) {
  const out = {}
  for (const m of block.matchAll(/<tr><th>([^<]+)<\/th><td>([\s\S]*?)<\/td><\/tr>/g)) out[m[1].trim()] = m[2]
  return out
}
const baseGrowth = s => {
  const m = s && text(s).match(/^([\d.,]+)\s*(?:\(\+([\d.,]+)\))?/)
  return m ? [Number(m[1].replace(/[.,]/g, '')), Number((m[2] || '0').replace(/[.,]/g, ''))] : [0, 0]
}

// "x,y" -> texto de localização da Pokédex (ex.: "North-west of Dewford, ~150 tiles")
const zoneWhere = new Map()

function parseDexPage(html, slug) {
  for (const m of html.matchAll(/pdx-zone-where">([^<]*)<\/span>[\s\S]*?\/at\/(\d+)\/(\d+)/g)) {
    zoneWhere.set(`${m[2]},${m[3]}`, decode(m[1]).trim())
  }
  const num = Number((html.match(/pdx-hero-num">#(\d+)/) || [])[1] || 0)
  const heroName = text((html.match(/<h1>([\s\S]*?)<\/h1>/) || [, ''])[1]).replace(/^#\d+\s*/, '')
  const heroImg = (html.match(/id="pdxHeroImg" src="([^"]+)"/) || [])[1] || ''
  const tabs = new Map()
  for (const m of html.matchAll(/class="pdx-tab[^"]*" data-form="(\d+)" data-img="([^"]*)">([\s\S]*?)<\/button>/g)) {
    tabs.set(m[1], { img: m[2], name: text(m[3]).replace(/\s*\([^()]*Form\)\s*$/i, '') })
  }
  const marks = [...html.matchAll(/<div class="pdx-form[^"]*" id="pdxForm(\d+)">/g)]
  const forms = []
  marks.forEach((m, i) => {
    const block = html.slice(m.index, i + 1 < marks.length ? marks[i + 1].index : html.length)
    const tab = tabs.get(m[1]) || { img: heroImg, name: heroName }
    const st = parseStats(block)
    const matchups = {}
    for (const mm of block.matchAll(/pdx-mlabel">([^<]+)<\/span><div class="pdx-pills">([\s\S]*?)<\/div>/g)) {
      matchups[mm[1].trim().toLowerCase()] = typesIn(mm[2])
    }
    const [hp, hpGrowth] = baseGrowth(st.Health)
    const [exp, expGrowth] = baseGrowth(st.Experience)
    const evo = block.match(/pdx-evo">[\s\S]*?<a [^>]*>([^<]+)<\/a>\s*<span>at level (\d+)/)
    forms.push({
      id: Number((block.match(/\?pokemon=(\d+)/) || [])[1] || 0) || null,
      name: tab.name || heroName,
      slug, num,
      form: st.Form ? text(st.Form) : '',
      types: typesIn(st.Type || ''),
      hp, hpGrowth, exp, expGrowth,
      speed: Number(text(st.Speed || '0')) || 0,
      rarity: text(st.Rarity || ''),
      region: text(st.Region || ''),
      weak: matchups['weak to'] || [],
      resist: matchups['resists'] || [],
      immune: matchups['immune to'] || matchups['immune'] || [],
      evolvesTo: evo ? decode(evo[1]) : '',
      evolvesAt: evo ? Number(evo[2]) : 0,
      imgSrc: tab.img,
      _labels: Object.keys(matchups),
    })
  })
  return forms
}

async function scrapeDex() {
  console.log('Pokédex: índice')
  const index = await cachedText(`${SITE}/index.php/p/v/pokedex`, 'dex/_index.html')
  const slugs = [...new Set([...index.matchAll(/class="pdx-card" href="[^"]*\/pokedex\/([^"]+)"/g)].map(m => m[1]))]
  const forms = []
  const labels = new Set()
  await pool(slugs, 4, async slug => {
    const fresh = REFRESH || !await exists(join(CACHE, 'dex', `${slug}.html`))
    const html = await cachedText(`${SITE}/index.php/p/v/pokedex/${slug}`, `dex/${slug}.html`)
    if (fresh) await sleep(120)
    if (!html) return console.log(`  sem página: ${slug}`)
    for (const f of parseDexPage(html, slug)) { f._labels.forEach(l => labels.add(l)); delete f._labels; forms.push(f) }
  }, 'pokédex')
  console.log(`  rótulos de matchup encontrados: ${[...labels].join(', ')}`)
  return forms
}

// ---------- sprites ----------
async function fetchSprite(src) {
  if (!src) return ''
  const path = src.split('?')[0]
  const swap = p => p.endsWith('.gif') ? p.slice(0, -4) + '.png' : p.endsWith('.png') ? p.slice(0, -4) + '.gif' : p
  const strip = p => p.replace(/\/rc\/\d+\//, '/')
  const cands = [...new Set([path, swap(path), strip(path), swap(strip(path))])]
  for (const c of cands) if (await exists(join(PUB, 'sprites', basename(c)))) return basename(c)
  for (const c of cands) {
    const buf = await get(SITE + c).catch(() => null)
    if (buf && buf.length > 60) { await save(join(PUB, 'sprites', basename(c)), buf); return basename(c) }
  }
  return ''
}

// ---------- montagem ----------
const { meta, spawns } = await scrapeMap()
const forms = await scrapeDex()

// Índice da pokédex: por id do mapa e por nome normalizado.
const byId = new Map(), byName = new Map()
for (const f of forms) {
  if (f.id && !byId.has(f.id)) byId.set(f.id, f)
  if (!byName.has(normName(f.name))) byName.set(normName(f.name), f)
}

const pokedex = new Map() // chave -> entrada final
const keyOf = f => f.id ? String(f.id) : `d:${f.slug}:${normName(f.name)}`
for (const f of forms) if (!pokedex.has(keyOf(f))) pokedex.set(keyOf(f), { key: keyOf(f), ...f, spawns: 0 })

let unknown = 0
const nodes = []
for (const n of spawns.nodes) {
  if (!n.creatures.length) continue
  const cs = []
  for (const c of n.creatures) {
    const name = c.name || `#${c.pokemon_id}`
    let key = String(c.pokemon_id)
    if (!pokedex.has(key)) {
      const m = byName.get(normName(name))
      if (m && !m.id) { // forma existe na pokédex mas sem link para o mapa: adota o id do mapa
        pokedex.delete(keyOf(m)); m.id = c.pokemon_id
        pokedex.set(key, { key, ...m, spawns: 0 })
      } else if (m) {
        key = keyOf(m)
      } else {
        unknown++
        pokedex.set(key, { key, id: c.pokemon_id, name, slug: '', num: 0, form: '', types: [], hp: 0, hpGrowth: 0, exp: 0,
          expGrowth: 0, speed: 0, rarity: '', region: '', weak: [], resist: [], immune: [], evolvesTo: '', evolvesAt: 0,
          imgSrc: c.img_path, spawns: 0 })
      }
    }
    const e = pokedex.get(key)
    if (!e.imgSrc) e.imgSrc = c.img_path
    if (!cs.includes(key)) { cs.push(key); e.spawns++ }
    if (c.principal) cs.principal = key
  }
  nodes.push({ id: n.id, x: n.x, y: n.y, desc: n.description || '', where: zoneWhere.get(`${n.x},${n.y}`) || '', radius: n.radius || 0, principal: cs.principal || cs[0], creatures: [...cs] })
}

console.log('Sprites')
const entries = [...pokedex.values()]
await pool(entries, 8, async e => { e.img = await fetchSprite(e.imgSrc); delete e.imgSrc }, 'sprites')

entries.sort((a, b) => (a.num || 9999) - (b.num || 9999) || a.name.localeCompare(b.name))
await save(join(PUB, 'data', 'map.json'), JSON.stringify({ meta, rev: spawns.rev, nodes }))
await save(join(PUB, 'data', 'pokedex.json'), JSON.stringify(entries))

console.log(`\nPronto: ${nodes.length} nós, ${entries.length} pokémons na pokédex ` +
  `(${entries.filter(e => e.spawns).length} com spawn, ${unknown} do mapa sem ficha na pokédex, ` +
  `${entries.filter(e => !e.img).length} sem sprite).`)
