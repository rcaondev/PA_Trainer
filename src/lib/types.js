// Tipos e tabela padrão de efetividade (atacante -> defensor). Só os valores != 1.
export const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]

export const TYPE_INFO = {
  normal: { label: 'Normal', color: '#9099a1' },
  fire: { label: 'Fogo', color: '#ff7a3d' },
  water: { label: 'Água', color: '#4d90d5' },
  electric: { label: 'Elétrico', color: '#e9b90f' },
  grass: { label: 'Planta', color: '#4fa84a' },
  ice: { label: 'Gelo', color: '#4cb8ad' },
  fighting: { label: 'Lutador', color: '#ce4069' },
  poison: { label: 'Venenoso', color: '#ab6ac8' },
  ground: { label: 'Terra', color: '#d97746' },
  flying: { label: 'Voador', color: '#7d9bd6' },
  psychic: { label: 'Psíquico', color: '#f0626a' },
  bug: { label: 'Inseto', color: '#8aab1f' },
  rock: { label: 'Pedra', color: '#a8996a' },
  ghost: { label: 'Fantasma', color: '#5269ac' },
  dragon: { label: 'Dragão', color: '#0a6dc4' },
  dark: { label: 'Sombrio', color: '#5a5366' },
  steel: { label: 'Aço', color: '#5a8ea1' },
  fairy: { label: 'Fada', color: '#e07fd6' },
}

export const typeLabel = t => TYPE_INFO[t]?.label ?? t
export const typeColor = t => TYPE_INFO[t]?.color ?? '#64748b'

export const CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

export const effectiveness = (atk, def) => CHART[atk]?.[def] ?? 1

// Multiplicador da tabela padrão de um golpe `atk` contra um pokémon com `defTypes`.
export const chartVs = (atk, defTypes) => defTypes.reduce((m, d) => m * effectiveness(atk, d), 1)
