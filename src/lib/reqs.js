// Requisitos de acesso de cada spawn, extraídos do texto livre da descrição
// (ex.: "DACC, Surf, Fly", "Requires: Surf or Fly.", "Dig lvl 35").
export const SKILLS = [
  { id: 'dacc', label: 'DACC', re: 'dacc' },
  { id: 'surf', label: 'Surf', re: 'surf' },
  { id: 'fly', label: 'Fly', re: 'fly(?!\\s*spawn)' }, // "Fly spawn" é spawn de voadores
  { id: 'rocksmash', label: 'Rock Smash', re: 'rock\\s*smash' },
  { id: 'dig', label: 'Dig', re: 'dig' },
  { id: 'cut', label: 'Cut', re: 'cut' },
  { id: 'dive', label: 'Dive', re: 'dive' },
  { id: 'hole', label: 'Find Hole', re: 'find\\s*hole' },
]

const ANY = SKILLS.map(s => `(?:${s.re})`).join('|')
const OR_RE = new RegExp(`\\b(${ANY})\\s+or\\s+(${ANY})\\b`, 'g')
const idOf = text => SKILLS.find(s => new RegExp(`^(?:${s.re})$`).test(text)).id

// -> { reqs: grupos de habilidades (basta uma de cada grupo), level: nível mínimo ou 0 }
export function parseReqs(desc) {
  let text = desc.toLowerCase()
  const reqs = []
  text = text.replace(OR_RE, (_, a, b) => { reqs.push([idOf(a), idOf(b)]); return ' ' })
  for (const s of SKILLS) if (new RegExp(`\\b(?:${s.re})\\b`).test(text)) reqs.push([s.id])
  const levels = [...text.matchAll(/(?:lvl|level)\s*(\d+)|(\d+)\s*lvl/g)].map(m => Number(m[1] || m[2]))
  return { reqs, level: levels.length ? Math.max(...levels) : 0 }
}

// O jogador (com as habilidades `owned` e nível `level`, 0 = ignorar) não alcança o nó?
export const isBlocked = (node, owned, level) =>
  node.reqs.some(group => !group.some(s => owned.includes(s))) || (level > 0 && node.level > level)
