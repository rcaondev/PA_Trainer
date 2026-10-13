# PA Trainer

App desktop de apoio para o [Padventures](https://www.padventures.org/) (OT Pokémon): mapa de spawns offline e guia de onde treinar cada pokémon.

Autor: Rodrigo Caon — [rodrigocaon.com.br](https://rodrigocaon.com.br)

## Funções

- **Mapa** — reprodução do [mapa oficial](https://map.padventures.org/) com todos os spawns, busca por pokémon, filtro por região e por requisito de acesso (DACC, Surf, Fly, Cut…) e nível.
- **Onde treinar** — escolha um dos seus pokémons e o mapa destaca os locais onde ele tem vantagem de tipo, usando as fraquezas reais de cada pokémon do jogo.
- **Pokédex** — todas as fichas da Pokédex oficial, com filtro por tipo, geração e "só os que aparecem no mapa".
- **Tipos** — tabela de vantagens e desvantagens.
- **Meus pokémons** — cadastro do seu time, salvo localmente.
- Dois temas de cor: Esmeralda e Pokédex.

## Stack

Tauri v2 (Rust) · Vue 3 · Vite · Tailwind CSS v4 · Leaflet

## Como rodar

Requisitos: Node.js 20+, Rust e os [pré-requisitos do Tauri](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri dev     # desenvolvimento
npm run tauri build   # gera o instalador
```

## Atualizar os dados

Os tiles do mapa, os spawns, os sprites e a Pokédex ficam em `public/` e vêm do site oficial:

```bash
npm run scrape              # baixa só o que falta
npm run scrape -- --refresh # rebaixa spawns e Pokédex
```

## Estrutura

- `scripts/scrape.mjs` — coleta mapa, spawns e Pokédex
- `src/lib/` — estado, tabela de tipos, recomendação de treino, requisitos e regiões
- `src/components/` — telas (mapa, Pokédex, tipos, meus pokémons)
- `src-tauri/` — app Tauri; os comandos Rust salvam o time em disco

Os dados e imagens do jogo pertencem ao Padventures; este é um projeto de fã, sem vínculo oficial.
