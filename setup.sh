#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  GadgetMiner v3 — Setup, Git Init & Deploy
# ============================================================
#
#  Prerequisites:
#    • Node.js 18+ and npm         → https://nodejs.org
#    • Git                         → https://git-scm.com
#    • Vercel CLI                  → npm i -g vercel
#    • An Anthropic API key        → https://console.anthropic.com
#
#  Usage:
#    chmod +x setup.sh
#    ./setup.sh
#
# ============================================================

PROJECT="gadget-miner"
BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

step() { echo -e "\n${CYAN}${BOLD}[$1/7]${RESET} ${BOLD}$2${RESET}"; }
info() { echo -e "  ${DIM}→ $1${RESET}"; }
ok()   { echo -e "  ${GREEN}✓ $1${RESET}"; }
warn() { echo -e "  ${YELLOW}⚠ $1${RESET}"; }

# ----------------------------------------------------------
# 1. Verify prerequisites
# ----------------------------------------------------------
step 1 "Checking prerequisites"

command -v node  >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v npm   >/dev/null 2>&1 || { echo "❌ npm not found."; exit 1; }
command -v git   >/dev/null 2>&1 || { echo "❌ Git not found."; exit 1; }

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required (found v$(node -v))"
  exit 1
fi

ok "Node $(node -v), npm $(npm -v), git $(git --version | awk '{print $3}')"

if ! command -v vercel >/dev/null 2>&1; then
  warn "Vercel CLI not found — installing globally"
  npm i -g vercel
fi
ok "Vercel CLI ready"

# ----------------------------------------------------------
# 2. Create project directory (if running outside the repo)
# ----------------------------------------------------------
step 2 "Setting up project structure"

if [ ! -f "package.json" ]; then
  if [ -d "$PROJECT" ]; then
    warn "Directory ./$PROJECT already exists — entering it"
    cd "$PROJECT"
  else
    echo "❌ Run this script from the project root (where package.json lives)"
    exit 1
  fi
fi

info "Project root: $(pwd)"
ok "Structure verified"

# ----------------------------------------------------------
# 3. Install dependencies
# ----------------------------------------------------------
step 3 "Installing dependencies"

npm install
ok "node_modules ready ($(ls node_modules | wc -l | tr -d ' ') packages)"

# ----------------------------------------------------------
# 4. Configure environment
# ----------------------------------------------------------
step 4 "Configuring environment"

if [ ! -f ".env" ]; then
  cp .env.example .env
  warn ".env created from template — you MUST add your API key"
  echo ""
  echo -e "  ${BOLD}Open .env and set:${RESET}"
  echo -e "  ${CYAN}ANTHROPIC_API_KEY=sk-ant-your-key-here${RESET}"
  echo ""
  read -p "  Press Enter after you've added your API key (or Ctrl+C to do it later)..."
else
  ok ".env already exists"
fi

# ----------------------------------------------------------
# 5. Verify build
# ----------------------------------------------------------
step 5 "Building project"

npm run build
ok "Production build successful ($(du -sh dist | awk '{print $1}'))"

# ----------------------------------------------------------
# 6. Initialize Git repo
# ----------------------------------------------------------
step 6 "Initializing Git repository"

if [ -d ".git" ]; then
  warn "Git repo already exists — skipping init"
else
  git init
  ok "Git initialized"
fi

git add -A
git commit -m "feat: GadgetMiner v3 — initial commit

- 14 niche categories, 87 subreddits, 78 search vectors
- 5-dimension weighted scoring (demand, margin, feasibility, uniqueness, regulatory)
- Cross-category mining via r/BuyItForLife, r/HelpMeFind, etc.
- Ad creative potential field for TikTok/IG evaluation
- Vercel serverless proxy for Anthropic API
- CSV export with full scoring breakdown" 2>/dev/null || warn "Nothing to commit (already committed)"

ok "Code committed"

# ----------------------------------------------------------
# 7. Deploy to Vercel
# ----------------------------------------------------------
step 7 "Deploying to Vercel"

echo ""
echo -e "  ${BOLD}Deployment options:${RESET}"
echo -e "  ${DIM}1) Deploy now (interactive — Vercel will prompt for project settings)${RESET}"
echo -e "  ${DIM}2) Skip — deploy manually later with 'vercel --prod'${RESET}"
echo ""
read -p "  Deploy now? [y/N] " DEPLOY

if [[ "$DEPLOY" =~ ^[Yy]$ ]]; then
  echo ""
  warn "After deploy, set your API key in the Vercel dashboard:"
  echo -e "  ${DIM}Vercel Dashboard → Project → Settings → Environment Variables${RESET}"
  echo -e "  ${DIM}Name:  ANTHROPIC_API_KEY${RESET}"
  echo -e "  ${DIM}Value: sk-ant-your-key-here${RESET}"
  echo ""
  vercel --prod
  ok "Deployed!"
else
  echo ""
  info "To deploy later:"
  echo -e "  ${CYAN}cd $(pwd)${RESET}"
  echo -e "  ${CYAN}vercel --prod${RESET}"
  echo ""
  info "Then set ANTHROPIC_API_KEY in Vercel dashboard → Settings → Environment Variables"
fi

# ----------------------------------------------------------
# Done
# ----------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  GadgetMiner v3 setup complete${RESET}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}Local dev:${RESET}       npm run dev"
echo -e "  ${BOLD}Production build:${RESET} npm run build"
echo -e "  ${BOLD}Deploy:${RESET}          vercel --prod"
echo ""
