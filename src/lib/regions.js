// Regiões do mapa. A Pokédex descreve cada spawn em relação a uma cidade
// ("North-west of Dewford, ~150 tiles"); a região vem da cidade de referência.
export const REGIONS = [
  { id: 'kanto', label: 'Kanto', towns: ['Pallet Town', 'Viridian', 'Pewter', 'Cerulean', 'Vermilion', 'Lavender', 'Celadon', 'Saffron', 'Fuchsia', 'Cinnabar', 'Airport'] },
  { id: 'johto', label: 'Johto', towns: ['New Bark', 'Violet', 'Azalea', 'Goldenrod', 'Ecruteak', 'Olivine', 'Cianwood', 'Mahogany', 'Blackthorn', 'Slowking'] },
  { id: 'hoenn', label: 'Hoenn', towns: ['Littleroot', 'Petalburg', 'Rustboro', 'Dewford', 'Slateport', 'Mauville', 'Verdanturf Town', 'Fallarbor', 'Lavaridge', 'Fortree', 'Lilycove', 'Mossdeep', 'Sootopolis', 'Pacifidlog', 'Frozen Harbour'] },
  { id: 'orange', label: 'Orange', towns: ['Shamouti', 'Mandarin', 'Trovitopolis', 'Ascorbia', 'Old Village'] },
  { id: 'alola', label: 'Alola', towns: ["Hau'oli", 'Heahea', 'Paniola Ranch', 'Malie', 'Seafolk Village', 'Sunrise Town'] },
]

const REGION_OF = new Map(REGIONS.flatMap(r => r.towns.map(t => [t, r.id])))

// "North-west of Dewford, ~150 tiles" | "Around Dewford" -> "Dewford"
export const townOf = where =>
  where.replace(/,\s*~\d+ tiles$/, '').replace(/^(?:Around|(?:North|South|East|West)(?:-(?:east|west))? of)\s+/i, '').trim()

export const regionOf = town => REGION_OF.get(town) ?? 'other'
