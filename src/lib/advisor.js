import { chartVs } from './types'

// Quanto um golpe do tipo `atk` causa em `mon`. O Padventures define fraquezas por
// pokémon (nem sempre iguais à tabela padrão), então a ficha da Pokédex tem prioridade.
export function incoming(mon, atk) {
  if (mon.weak.length || mon.resist.length || mon.immune.length) {
    if (mon.immune.includes(atk)) return 0
    if (mon.weak.includes(atk)) return 2
    if (mon.resist.includes(atk)) return 0.5
    return 1
  }
  return chartVs(atk, mon.types)
}

export const VERDICTS = {
  great: { label: 'Alvo ótimo', score: 2 },
  trade: { label: 'Troca de dano', score: 0.5 },
  neutral: { label: 'Neutro', score: 0 },
  bad: { label: 'Resiste a você', score: -1 },
  danger: { label: 'Perigoso', score: -2 },
}

// Confronto do meu pokémon contra um selvagem, assumindo golpes dos próprios tipos.
export function matchup(mine, wild) {
  if (!mine.types.length || !wild.types.length) return null
  const off = Math.max(...mine.types.map(t => incoming(wild, t)))
  const def = Math.max(...wild.types.map(t => incoming(mine, t)))
  const verdict = off >= 2 ? (def >= 2 ? 'trade' : 'great') : def >= 2 ? 'danger' : off < 1 ? 'bad' : 'neutral'
  // bônus quando além de bater forte ainda resisto aos golpes dele
  const score = VERDICTS[verdict].score + (verdict === 'great' && def < 1 ? 1 : 0)
  return { off, def, verdict, score }
}

// Nós do mapa bons para treinar `mine`, do melhor para o pior.
export function rankNodes(mine, nodes, dex) {
  const out = []
  for (const node of nodes) {
    let known = 0, total = 0, good = 0, danger = 0, xp = 0
    for (const key of node.creatures) {
      const m = matchup(mine, dex.get(key))
      if (!m) continue
      known++
      total += m.score
      if (m.verdict === 'great') { good++; xp += dex.get(key).exp }
      else if (m.verdict === 'danger') danger++
    }
    if (!good) continue
    const score = total / known
    if (score <= 0) continue
    out.push({
      node, score, good, danger, known,
      xp: Math.round(xp / good),
      tier: score >= 1.5 && !danger ? 'great' : 'good',
    })
  }
  return out.sort((a, b) => b.score - a.score || b.good - a.good)
}
