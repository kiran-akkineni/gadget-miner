# GadgetMiner v3

AI-powered Reddit mining tool that finds and ranks sub-$50 gadget opportunities by scanning 87 subreddits across 14 niche categories.

## How it works

1. **Mine** — Fires 78+ search vectors across Reddit using 4 query types (pain, wish, search, hack) to find posts where users describe unsolved problems
2. **Score** — Each idea is scored on 5 weighted dimensions: demand signal (30%), margin potential (25%), feasibility (20%), uniqueness (15%), regulatory ease (10%)
3. **Rank** — Ideas are deduplicated, merged, filtered for certification burden, and stack-ranked by composite score

## Stack

- **Frontend**: React + Vite
- **API proxy**: Vercel serverless function (keeps Anthropic API key server-side)
- **AI**: Claude Sonnet 4 with web search for live Reddit mining
- **Deploy**: Vercel

## Setup

```bash
# Clone and install
git clone <your-repo-url>
cd gadget-miner
npm install

# Configure API key
cp .env.example .env
# Edit .env and add your Anthropic API key

# Run locally
npm run dev
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
# Set ANTHROPIC_API_KEY in Vercel dashboard → Settings → Environment Variables
```

## Project structure

```
gadget-miner/
├── api/
│   └── anthropic.js        # Serverless proxy for Anthropic API
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx              # Main GadgetMiner component
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
└── .gitignore
```

## Categories (14 niches, 87 subreddits)

| Tier | Category | Key subreddits |
|------|----------|----------------|
| 1 | Pets | r/dogs, r/cats, r/puppy101, r/Dogtraining |
| 1 | Cleaning / Org | r/CleaningTips, r/organization, r/declutter |
| 1 | Desk / WFH | r/battlestations, r/desksetup, r/homeoffice |
| 1 | Kitchen / Cooking | r/cooking, r/AskCulinary, r/cookware |
| 1 | Life Hacks | r/lifehacks, r/HelpMeFind, r/BuyItForLife |
| 2 | Fitness / Active | r/homegym, r/running, r/bodyweightfitness |
| 2 | Phone / Tablet | r/iPhone, r/Android, r/gadgets |
| 2 | Garden / Plants | r/gardening, r/houseplants, r/IndoorGarden |
| 2 | Workshop / DIY | r/woodworking, r/3Dprinting, r/Tools |
| 2 | Automotive | r/cars, r/AutoDetailing, r/MechanicAdvice |
| 3 | Travel / EDC | r/EDC, r/onebag, r/backpacking |
| 3 | Outdoor / Camping | r/camping, r/ultralight, r/CampingGear |
| 3 | Elder Care | r/AgingParents, r/CaregiverSupport, r/disability |
| 3 | Home Bar | r/cocktails, r/bartenders, r/Homebrewing |

## License

Private — not for redistribution.
