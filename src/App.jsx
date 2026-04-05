import { useState, useEffect, useRef, useCallback } from "react";

// Cross-category vectors that run on EVERY mining pass regardless of niche selection
// These subs have high problem-post density across all product categories
// Always-on vectors — these run every pass regardless of category selection
// Focused on 5 high-signal subs + broad "wish/need" patterns
const CROSS_CATEGORY_QUERIES = [
  // High-density problem subs (every post = a product gap)
  'site:reddit.com/r/HelpMeFind gadget tool device product 2025 2026',
  'site:reddit.com/r/IsThereAProductForThat 2025 2026',
  'site:reddit.com/r/whatisthisthing need tool gadget 2025',
  // Broad wish/invent patterns across all of Reddit
  'reddit "wish this existed" "wish someone made" gadget product device 2025 2026',
  'reddit "someone should make" "someone should invent" physical gadget tool 2025',
  'reddit "is there a product" "does this exist" gadget device under $50',
  'reddit "why hasn\'t someone made" "why doesn\'t anyone make" product gadget',
  // Workaround/hack pattern (strongest validation signal)
  'reddit "had to DIY" "janky solution" "homemade" gadget tool wish product existed',
];

const CATEGORIES = [
  {
    id: "pets", label: "Pets", tier: 1,
    subs: "r/dogs (2.8M) · r/cats (4.2M) · r/puppy101 (450K) · r/Dogtraining (1.5M) · r/CatAdvice (350K) · r/Aquariums (700K)",
    queries: [
      'reddit dog owner frustrated "wish there was" product gadget 2025 2026',
      'reddit cat problem annoying "is there a product" device 2025 2026',
      'site:reddit.com/r/puppy101 need gadget product help 2025 2026',
      'reddit pet owner hack DIY solution workaround device 2025',
      'reddit "someone should make" dog cat pet feeder toy gadget 2025',
      'reddit "looking for" pet accessory gadget under $50 2025 2026',
    ]
  },
  {
    id: "cleaning", label: "Cleaning / Org", tier: 1,
    subs: "r/CleaningTips (1.9M, fast-growing) · r/organization (550K) · r/declutter (500K) · r/HomeImprovement (1.5M) · r/homemaking (200K)",
    queries: [
      'site:reddit.com/r/CleaningTips "wish there was" "is there a" tool gadget 2025 2026',
      'reddit cleaning impossible frustrating "hard to reach" tool gadget 2025 2026',
      'reddit organizing "wish there was" gadget storage tool device small space',
      'reddit "someone should invent" cleaning organizing gadget tool',
      'reddit cleaning hack DIY solution homemade tool workaround',
      'site:reddit.com/r/HomeImprovement "wish" "looking for" gadget tool organizer',
    ]
  },
  {
    id: "desk", label: "Desk / WFH", tier: 1,
    subs: "r/battlestations (5.2M) · r/desksetup (300K) · r/homeoffice (150K) · r/WFH (120K) · r/cablemanagement (200K)",
    queries: [
      'reddit desk setup problem annoying cable "wish there was" gadget 2025 2026',
      'site:reddit.com/r/homeoffice gadget accessory need problem 2025 2026',
      'reddit WFH "looking for" desk gadget tool accessory under $50 2025',
      'reddit "someone should make" desk organizer USB accessory 2025',
      'reddit work from home hack DIY solution monitor desk cable 2025',
    ]
  },
  {
    id: "kitchen", label: "Kitchen / Cooking", tier: 1,
    subs: "r/cooking (3.5M) · r/MealPrepSunday (2.2M) · r/AskCulinary (700K) · r/cookware (100K) · r/sousvide (250K)",
    queries: [
      'reddit kitchen tool frustrating "wish I had" cooking gadget 2025 2026',
      'site:reddit.com/r/cookware "wish" "need" "looking for" gadget 2025 2026',
      'reddit "does anyone make" kitchen tool utensil gadget 2025',
      'reddit cooking hack workaround kitchen problem DIY solution 2025',
      'reddit "best gadget for" kitchen meal prep food storage 2025 2026',
    ]
  },
  {
    id: "lifehacks", label: "Life Hacks", tier: 1,
    subs: "r/lifehacks (8M+) · r/mildlyinfuriating (10M+) · r/HelpMeFind (600K) · r/BuyItForLife (1.5M)",
    queries: [
      'site:reddit.com/r/lifehacks "wish" "need" gadget product tool 2025 2026',
      'reddit everyday problem annoying "there has to be a better way" gadget 2025',
      'site:reddit.com/r/HelpMeFind gadget tool device product 2025 2026',
      'reddit "why doesn\'t" product exist invention idea gadget 2025',
      'reddit "someone should invent" everyday life gadget tool device 2025',
    ]
  },
  {
    id: "fitness", label: "Fitness / Active", tier: 2,
    subs: "r/homegym (800K) · r/running (2.5M) · r/bodyweightfitness (2.8M) · r/GripTraining (120K)",
    queries: [
      'site:reddit.com/r/homegym "wish there was" gadget tool accessory 2025 2026',
      'reddit fitness gadget "looking for" workout tool accessory 2025 2026',
      'reddit running "someone should make" gear accessory device 2025',
      'reddit home gym hack DIY equipment alternative gadget 2025',
      'reddit "best gadget for" workout recovery stretching mobility 2025 2026',
    ]
  },
  {
    id: "phone", label: "Phone / Tablet", tier: 2,
    subs: "r/iPhone (3.5M) · r/Android (5M+) · r/gadgets (15M+) · r/ipad (600K) · r/UsbCHardware",
    queries: [
      'reddit phone accessory annoying problem mount stand "wish there was" 2025 2026',
      'reddit "best phone gadget" accessory under $50 stand charger 2025 2026',
      'reddit "looking for" USB-C adapter cable hub phone accessory 2025',
      'reddit phone mount hack DIY car desk tablet holder 2025',
      'reddit "someone should make" phone tablet accessory USB-C 2025 2026',
    ]
  },
  {
    id: "garden", label: "Garden / Plants", tier: 2,
    subs: "r/gardening (6.5M) · r/houseplants (3.5M) · r/IndoorGarden (500K) · r/landscaping (1.5M)",
    queries: [
      'reddit plant dying overwatering "wish there was" moisture gadget 2025 2026',
      'reddit "best gadget" garden watering plant care tool device 2025 2026',
      'reddit houseplant "someone should make" planter pot gadget 2025',
      'reddit garden hack DIY watering system self-watering device 2025',
      'reddit plant pest problem indoor garden frustrating tool 2025 2026',
    ]
  },
  {
    id: "workshop", label: "Workshop / DIY", tier: 2,
    subs: "r/woodworking (3.5M) · r/3Dprinting (1.8M) · r/Tools (500K) · r/fixit (350K)",
    queries: [
      'site:reddit.com/r/Tools "wish there was" "looking for" gadget tool 2025 2026',
      'reddit workshop tool frustrating "wish there was" jig clamp 2025 2026',
      'reddit "someone should make" workshop tool 3D print gadget 2025',
      'reddit woodworking hack DIY jig fixture homemade cheap tool 2025',
      'site:reddit.com/r/fixit gadget tool need problem device 2025 2026',
    ]
  },
  {
    id: "auto", label: "Automotive", tier: 2,
    subs: "r/cars (6M+) · r/AutoDetailing (700K) · r/MechanicAdvice (1.2M) · r/Dashcam (200K)",
    queries: [
      'reddit car accessory annoying problem "wish there was" gadget 2025 2026',
      'site:reddit.com/r/AutoDetailing "wish" "need" "looking for" gadget tool 2025 2026',
      'reddit "someone should make" car mount holder organizer tool 2025',
      'reddit car hack DIY fix cheap solution gadget detailing 2025',
      'reddit "best car gadget" under $50 accessory organizer device 2025 2026',
    ]
  },
  {
    id: "travel", label: "Travel / EDC", tier: 3,
    subs: "r/EDC (1.2M) · r/onebag (600K) · r/HerOneBag (100K) · r/backpacking (1.5M)",
    queries: [
      'site:reddit.com/r/EDC "wish there was" "looking for" gadget tool 2025 2026',
      'reddit travel hotel frustrating problem gadget device packing 2025 2026',
      'reddit "best travel gadget" under $50 compact portable 2025 2026',
      'reddit travel hack packing tip DIY solution gadget 2025',
      'reddit "someone should make" travel organizer charger adapter tool 2025',
    ]
  },
  {
    id: "outdoor", label: "Outdoor / Camping", tier: 3,
    subs: "r/camping (2.5M) · r/ultralight (500K) · r/CampingGear (350K) · r/overlanding (250K)",
    queries: [
      'site:reddit.com/r/CampingGear "wish" "need" "looking for" gadget tool 2025 2026',
      'reddit camping gear frustrating problem "wish there was" gadget 2025 2026',
      'reddit "someone should make" camping hiking gadget tool device 2025',
      'reddit camping hack ultralight DIY gear modification cheap 2025',
      'reddit "best camping gadget" under $50 lightweight compact 2025 2026',
    ]
  },
  {
    id: "eldercare", label: "Elder Care", tier: 3,
    subs: "r/AgingParents (80K) · r/CaregiverSupport (50K) · r/disability (100K) · r/OccupationalTherapy (40K) · r/internetparents (800K) · r/Assistance (300K)",
    queries: [
      // Targeted sub queries
      'site:reddit.com/r/AgingParents "wish there was" "is there a" device gadget product 2025 2026',
      'site:reddit.com/r/CaregiverSupport gadget device tool help need 2025 2026',
      // Broad Reddit-wide queries (compensate for small sub volume)
      'reddit elderly parent problem safety "wish there was" device gadget 2025 2026',
      'reddit aging parent "someone should make" simple device gadget tool',
      'reddit senior "looking for" gadget alert monitor device simple cheap',
      'reddit caregiver hack DIY solution senior safety device workaround',
      'reddit dementia fall prevention medication reminder device gadget 2025',
      'reddit elderly "is there a product" help aging parent device accessible',
    ]
  },
  {
    id: "homebar", label: "Home Bar / Cocktails", tier: 3,
    subs: "r/cocktails (1.2M) · r/bartenders (250K) · r/HomeBar (80K) · r/Homebrewing (900K) · r/wine (600K) · r/bourbon (450K)",
    queries: [
      'site:reddit.com/r/cocktails "wish" "need" "looking for" bar tool gadget 2025 2026',
      'reddit bar tool frustrating cocktail "wish there was" gadget 2025 2026',
      'reddit "someone should make" bartending home bar tool device gadget',
      'reddit cocktail hack DIY bar tool solution cheap gadget workaround',
      'reddit "best bar gadget" cocktail tool accessory ice mold jigger',
      'site:reddit.com/r/Homebrewing "wish there was" "looking for" gadget tool device',
      'reddit home bar wine bourbon "is there a product" gadget accessory',
    ]
  },
];

const SCORING_WEIGHTS = {
  demandSignal: 0.30,
  marginPotential: 0.25,
  feasibility: 0.20,
  uniqueness: 0.15,
  regulatoryEase: 0.10,
};

function ScoreBar({ score, label, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", marginBottom: 2 }}>
        <span>{label}</span>
        <span>{score}/10</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3 }}>
        <div style={{
          height: "100%",
          width: `${score * 10}%`,
          background: color,
          borderRadius: 3,
          transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }} />
      </div>
    </div>
  );
}

function IdeaCard({ idea, rank, expanded, onToggle }) {
  const compositeScore = (
    (idea.scores.demandSignal * SCORING_WEIGHTS.demandSignal) +
    (idea.scores.marginPotential * SCORING_WEIGHTS.marginPotential) +
    (idea.scores.feasibility * SCORING_WEIGHTS.feasibility) +
    (idea.scores.uniqueness * SCORING_WEIGHTS.uniqueness) +
    (idea.scores.regulatoryEase * SCORING_WEIGHTS.regulatoryEase)
  ).toFixed(1);

  const marginPct = idea.estimatedCOGS > 0
    ? Math.round(((idea.estimatedPrice - idea.estimatedCOGS) / idea.estimatedPrice) * 100)
    : 0;

  const tierColor = rank <= 3 ? "#e8b931" : rank <= 8 ? "#7ec8e3" : "#8a8a8a";

  return (
    <div
      onClick={onToggle}
      style={{
        background: "var(--card-bg)",
        border: expanded ? "1px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.25s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Rank badge */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 36,
        height: 36,
        background: tierColor,
        clipPath: "polygon(0 0, 100% 0, 0 100%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        padding: "3px 0 0 5px",
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#0d0d0d" }}>#{rank}</span>
      </div>

      <div style={{ marginLeft: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {idea.name}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              {idea.oneLiner}
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
              {compositeScore}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>
              composite
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{
          display: "flex",
          gap: 16,
          marginTop: 12,
          flexWrap: "wrap",
        }}>
          <Stat label="Price" value={`$${idea.estimatedPrice}`} />
          <Stat label="COGS" value={`$${idea.estimatedCOGS}`} />
          <Stat label="Margin" value={`${marginPct}%`} accent={marginPct >= 60} />
          <Stat label="Demand" value={`${idea.scores.demandSignal}/10`} />
        </div>

        {expanded && (
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
            animation: "fadeIn 0.3s ease",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 16px" }}>
              {idea.fullDescription}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-dim)", margin: "0 0 8px" }}>
                  Scoring Breakdown
                </h4>
                <ScoreBar score={idea.scores.demandSignal} label="Demand Signal" color="#e8b931" />
                <ScoreBar score={idea.scores.marginPotential} label="Margin Potential" color="#4ecdc4" />
                <ScoreBar score={idea.scores.feasibility} label="Feasibility" color="#7ec8e3" />
                <ScoreBar score={idea.scores.uniqueness} label="Uniqueness" color="#c792ea" />
                <ScoreBar score={idea.scores.regulatoryEase} label="Regulatory Ease" color="#82b366" />
              </div>
              <div>
                <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-dim)", margin: "0 0 8px" }}>
                  Why It Ranks Here
                </h4>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                  {idea.rankingRationale}
                </p>

                {idea.redditSources && idea.redditSources.length > 0 && (
                  <>
                    <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-dim)", margin: "16px 0 6px" }}>
                      Source Signals
                    </h4>
                    {idea.redditSources.map((src, i) => (
                      <div key={i} style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        padding: "4px 0",
                        borderBottom: "1px dotted var(--border)",
                      }}>
                        {src}
                      </div>
                    ))}
                  </>
                )}

                {idea.competitorNotes && (
                  <>
                    <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-dim)", margin: "16px 0 6px" }}>
                      Competitive Landscape
                    </h4>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                      {idea.competitorNotes}
                    </p>
                  </>
                )}

                {idea.adCreativePotential && (
                  <>
                    <h4 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-dim)", margin: "16px 0 6px" }}>
                      Ad Creative Angle
                    </h4>
                    <p style={{ fontSize: 12, color: "var(--accent)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
                      {idea.adCreativePotential}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent ? "var(--green)" : "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  );
}

function CategoryChip({ cat, selected, onClick }) {
  const tierColors = { 1: "#4ecdc4", 2: "#7ec8e3", 3: "#8a8a8a" };
  return (
    <button
      onClick={() => onClick(cat.id)}
      title={cat.subs || ""}
      style={{
        padding: "6px 14px",
        borderRadius: 20,
        border: selected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        background: selected ? "var(--accent-bg)" : "transparent",
        color: selected ? "var(--accent)" : "var(--text-secondary)",
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "var(--font-body)",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {cat.tier && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: tierColors[cat.tier] || "#8a8a8a",
          flexShrink: 0,
        }} />
      )}
      {cat.label}
      {cat.queries && (
        <span style={{
          fontSize: 10,
          opacity: 0.6,
          fontFamily: "var(--font-mono)",
        }}>
          {cat.queries.length}v
        </span>
      )}
    </button>
  );
}

function ProgressStep({ step, current, total }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      color: "var(--text-secondary)",
      fontSize: 13,
    }}>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "2px solid var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "pulse 1.5s infinite",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
      </div>
      <span>{step}</span>
      {total > 0 && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
          {current}/{total}
        </span>
      )}
    </div>
  );
}

export default function GadgetMiner() {
  const [selectedCategories, setSelectedCategories] = useState(["pets", "cleaning", "desk", "kitchen", "lifehacks"]);
  const [ideas, setIdeas] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progressSteps, setProgressSteps] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState("composite");
  const [filterMinMargin, setFilterMinMargin] = useState(0);
  const [error, setError] = useState(null);
  const [customNiche, setCustomNiche] = useState("");
  const abortRef = useRef(false);

  const toggleCategory = (id) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const addProgress = (step) => {
    setProgressSteps(prev => [...prev, step]);
  };

  const runMining = useCallback(async () => {
    if (selectedCategories.length === 0 && !customNiche.trim()) return;
    setIsRunning(true);
    setIdeas([]);
    setProgressSteps([]);
    setError(null);
    abortRef.current = false;

    const allCategories = [...selectedCategories];
    const customNiches = customNiche.trim() ? customNiche.split(",").map(s => s.trim()).filter(Boolean) : [];

    // Build search queries from selected categories
    const searchQueries = [];

    // Always include cross-category vectors first
    for (const q of CROSS_CATEGORY_QUERIES) {
      searchQueries.push({ query: q, category: "Cross-Category" });
    }

    // Add category-specific queries
    for (const catId of allCategories) {
      const cat = CATEGORIES.find(c => c.id === catId);
      if (cat) {
        for (const q of cat.queries) {
          searchQueries.push({ query: q, category: cat.label });
        }
      }
    }
    for (const niche of customNiches) {
      searchQueries.push({ query: `reddit ${niche} problem "wish there was" gadget device 2025 2026`, category: niche });
      searchQueries.push({ query: `reddit ${niche} frustrating need device product gadget 2025 2026`, category: niche });
      searchQueries.push({ query: `reddit "someone should make" ${niche} gadget tool 2025`, category: niche });
      searchQueries.push({ query: `reddit ${niche} hack DIY workaround "janky solution" gadget`, category: niche });
      searchQueries.push({ query: `reddit "is there a product" "looking for" ${niche} gadget under $50`, category: niche });
    }

    addProgress(`Scanning ${searchQueries.length} search vectors across ${allCategories.length + customNiches.length} categories...`);

    // Phase 1: Use Claude with web search to mine Reddit for problems
    const systemPrompt = `You are a product opportunity analyst specializing in identifying sub-$50 consumer gadget ideas from Reddit discussions.

Your job is to find RECENT posts (2024-2026) where users describe problems that could be solved with a small, physical gadget or device.

CRITICAL REQUIREMENTS:
- The gadget MUST be plausible to manufacture as a small physical product
- Estimated retail price MUST be under $50
- Focus on RECENT posts (2024-2026) with genuine demand signals (upvotes, multiple commenters agreeing, repeated complaints)
- Prefer ideas with simple hardware, low certification burden, and attractive margins
- Each idea should be distinct and specific — not a generic "smart" version of something
- Prioritize problems that are VISUAL and DEMONSTRABLE (good for short-form video ads)
- Consider whether an influencer could naturally use/demo this product in their content
- The product should be sellable via Amazon, TikTok Shop, or DTC without heavy regulatory burden

For each idea you find, provide ALL of these fields in your JSON response:
- name: catchy product name (2-3 words)
- oneLiner: one sentence pitch
- fullDescription: 2-3 sentences explaining the product, how it works, and who it's for
- estimatedPrice: number (retail price in USD)
- estimatedCOGS: number (estimated cost of goods sold)
- scores.demandSignal: 1-10 (based on how many people seem to want this)
- scores.marginPotential: 1-10 (based on price vs COGS spread)
- scores.feasibility: 1-10 (how easy to actually manufacture)
- scores.uniqueness: 1-10 (how differentiated from existing products)
- scores.regulatoryEase: 1-10 (how easy to get to market without heavy certification)
- rankingRationale: why this idea is commercially viable
- redditSources: array of strings describing where you found the signal (subreddit names, post themes)
- competitorNotes: brief note on existing competition or lack thereof
- category: which niche this belongs to
- adCreativePotential: 1 sentence describing what the 15-second TikTok/IG ad would look like

Respond ONLY with valid JSON. No markdown, no backticks, no explanation. Just a JSON object with key "ideas" containing an array of idea objects.`;

    try {
      // Batch queries into groups to stay efficient
      const batchSize = 3;
      let allRawIdeas = [];

      for (let i = 0; i < searchQueries.length; i += batchSize) {
        if (abortRef.current) break;

        const batch = searchQueries.slice(i, i + batchSize);
        const batchCategories = [...new Set(batch.map(b => b.category))].join(", ");
        addProgress(`Mining ${batchCategories}...`);

        const queryList = batch.map(b => b.query).join("\n- ");
        const userPrompt = `Search for Reddit posts and discussions matching these queries and identify sub-$50 gadget opportunities:

- ${queryList}

Find 4-6 distinct, viable gadget ideas from these searches. Each must be a physical product under $50 retail. Focus on posts where users describe unsolved problems. Return as JSON only.`;

        const response = await fetch("/api/anthropic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
            tools: [{ type: "web_search_20250305", name: "web_search" }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();

        // Extract text content from response
        const textParts = data.content
          ?.filter(item => item.type === "text")
          ?.map(item => item.text)
          ?.join("\n") || "";

        if (textParts) {
          try {
            const cleaned = textParts.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.ideas && Array.isArray(parsed.ideas)) {
              allRawIdeas = [...allRawIdeas, ...parsed.ideas];
              addProgress(`Found ${parsed.ideas.length} ideas from ${batchCategories}`);
            }
          } catch (parseErr) {
            addProgress(`Partial parse issue in ${batchCategories}, continuing...`);
          }
        }

        // Small delay between batches
        if (i + batchSize < searchQueries.length) {
          await new Promise(r => setTimeout(r, 15000));
        }
      }

      if (abortRef.current) {
        setIsRunning(false);
        return;
      }

      addProgress(`Raw mining complete: ${allRawIdeas.length} ideas found. Deduplicating and ranking...`);

      // Phase 2: Deduplicate and re-rank with a second pass
      if (allRawIdeas.length > 0) {
        const dedupePrompt = `You are a product strategist evaluating gadget ideas for a solo entrepreneur selling sub-$50 physical products via Amazon/TikTok Shop/DTC.

Below are ${allRawIdeas.length} gadget ideas mined from Reddit. Many may be duplicates or near-duplicates.

TASK:
1. Merge duplicates into single stronger entries (combine demand signals)
2. Remove ideas that are NOT viable physical gadgets under $50
3. Remove ideas that would require heavy regulatory certification (FCC for wireless, FDA for medical, CPSC for children)
4. Favor ideas that are VISUALLY DEMONSTRABLE in a 15-second video ad
5. Re-score each surviving idea on these dimensions (1-10 each):
   - demandSignal (30% weight): how many people genuinely want this based on Reddit activity
   - marginPotential (25% weight): price vs COGS spread  
   - feasibility (20% weight): manufacturing simplicity (injection mold, simple PCB, or off-shelf components)
   - uniqueness (15% weight): differentiation from existing products on Amazon
   - regulatoryEase (10% weight): certification/compliance burden
6. Sort by composite score (weighted sum above)
7. Return the TOP 25 ideas maximum

RAW IDEAS:
${JSON.stringify(allRawIdeas, null, 1)}

Respond ONLY with valid JSON: {"ideas": [...]}. Each idea must have ALL fields: name, oneLiner, fullDescription, estimatedPrice, estimatedCOGS, scores (with all 5 sub-scores), rankingRationale, redditSources (array), competitorNotes, category, adCreativePotential. No markdown, no backticks.`;

        const rankResponse = await fetch("/api/anthropic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8000,
            messages: [{ role: "user", content: dedupePrompt }],
          }),
        });

        if (rankResponse.ok) {
          const rankData = await rankResponse.json();
          const rankText = rankData.content
            ?.filter(item => item.type === "text")
            ?.map(item => item.text)
            ?.join("\n") || "";

          try {
            const cleaned = rankText.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.ideas && Array.isArray(parsed.ideas)) {
              // Ensure all ideas have proper structure
              const validated = parsed.ideas.map((idea, idx) => ({
                id: idx,
                name: idea.name || "Unnamed",
                oneLiner: idea.oneLiner || "",
                fullDescription: idea.fullDescription || "",
                estimatedPrice: Number(idea.estimatedPrice) || 29,
                estimatedCOGS: Number(idea.estimatedCOGS) || 10,
                scores: {
                  demandSignal: Number(idea.scores?.demandSignal) || 5,
                  marginPotential: Number(idea.scores?.marginPotential) || 5,
                  feasibility: Number(idea.scores?.feasibility) || 5,
                  uniqueness: Number(idea.scores?.uniqueness) || 5,
                  regulatoryEase: Number(idea.scores?.regulatoryEase) || 5,
                },
                rankingRationale: idea.rankingRationale || "",
                redditSources: Array.isArray(idea.redditSources) ? idea.redditSources : [],
                competitorNotes: idea.competitorNotes || "",
                adCreativePotential: idea.adCreativePotential || "",
                category: idea.category || "General",
              }));
              setIdeas(validated);
              addProgress(`Final ranking complete: ${validated.length} unique opportunities identified.`);
            }
          } catch (parseErr) {
            // Fallback: use raw ideas directly
            const fallback = allRawIdeas.slice(0, 25).map((idea, idx) => ({
              id: idx,
              name: idea.name || "Unnamed",
              oneLiner: idea.oneLiner || "",
              fullDescription: idea.fullDescription || "",
              estimatedPrice: Number(idea.estimatedPrice) || 29,
              estimatedCOGS: Number(idea.estimatedCOGS) || 10,
              scores: {
                demandSignal: Number(idea.scores?.demandSignal) || 5,
                marginPotential: Number(idea.scores?.marginPotential) || 5,
                feasibility: Number(idea.scores?.feasibility) || 5,
                uniqueness: Number(idea.scores?.uniqueness) || 5,
                regulatoryEase: Number(idea.scores?.regulatoryEase) || 5,
              },
              rankingRationale: idea.rankingRationale || "",
              redditSources: Array.isArray(idea.redditSources) ? idea.redditSources : [],
              competitorNotes: idea.competitorNotes || "",
              adCreativePotential: idea.adCreativePotential || "",
              category: idea.category || "General",
            }));
            setIdeas(fallback);
            addProgress(`Ranking pass had parse issues. Showing ${fallback.length} ideas with initial scores.`);
          }
        }
      } else {
        addProgress("No ideas found. Try different categories or add custom niches.");
      }
    } catch (err) {
      setError(err.message);
      addProgress(`Error: ${err.message}`);
    }

    setIsRunning(false);
  }, [selectedCategories, customNiche]);

  // Sort ideas
  const sortedIdeas = [...ideas].sort((a, b) => {
    if (sortBy === "composite") {
      const scoreA = Object.entries(SCORING_WEIGHTS).reduce((sum, [k, w]) => sum + (a.scores[k] || 0) * w, 0);
      const scoreB = Object.entries(SCORING_WEIGHTS).reduce((sum, [k, w]) => sum + (b.scores[k] || 0) * w, 0);
      return scoreB - scoreA;
    }
    if (sortBy === "margin") {
      const mA = ((a.estimatedPrice - a.estimatedCOGS) / a.estimatedPrice) * 100;
      const mB = ((b.estimatedPrice - b.estimatedCOGS) / b.estimatedPrice) * 100;
      return mB - mA;
    }
    if (sortBy === "demand") return (b.scores.demandSignal || 0) - (a.scores.demandSignal || 0);
    if (sortBy === "price") return (a.estimatedPrice || 0) - (b.estimatedPrice || 0);
    return 0;
  }).filter(idea => {
    if (filterMinMargin > 0) {
      const margin = ((idea.estimatedPrice - idea.estimatedCOGS) / idea.estimatedPrice) * 100;
      return margin >= filterMinMargin;
    }
    return true;
  });

  // Summary stats
  const avgMargin = ideas.length > 0
    ? Math.round(ideas.reduce((sum, i) => sum + ((i.estimatedPrice - i.estimatedCOGS) / i.estimatedPrice) * 100, 0) / ideas.length)
    : 0;
  const avgDemand = ideas.length > 0
    ? (ideas.reduce((sum, i) => sum + (i.scores.demandSignal || 0), 0) / ideas.length).toFixed(1)
    : 0;

  return (
    <div style={{
      "--bg": "#0a0a0b",
      "--bg-surface": "#121214",
      "--bg-inset": "#1a1a1e",
      "--card-bg": "#16161a",
      "--border": "#2a2a2f",
      "--text-primary": "#e8e6e3",
      "--text-secondary": "#9f9d99",
      "--text-dim": "#5f5d59",
      "--accent": "#e8b931",
      "--accent-bg": "rgba(232, 185, 49, 0.1)",
      "--green": "#4ecdc4",
      "--red": "#e85d5d",
      "--font-display": "'Instrument Sans', 'DM Sans', sans-serif",
      "--font-body": "'Source Sans 3', 'IBM Plex Sans', sans-serif",
      "--font-mono": "'JetBrains Mono', 'Fira Code', monospace",
      fontFamily: "var(--font-body)",
      background: "var(--bg)",
      color: "var(--text-primary)",
      minHeight: "100vh",
      padding: "0",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=Source+Sans+3:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        padding: "24px 32px",
        background: "var(--bg-surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isRunning ? "var(--accent)" : "var(--green)",
            animation: isRunning ? "pulse 1s infinite" : "none",
          }} />
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}>
            GadgetMiner
          </h1>
          <span style={{
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 4,
            background: "var(--accent-bg)",
            color: "var(--accent)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}>
            v3
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
          AI-powered Reddit mining → sub-$50 gadget opportunity ranking · 14 niches · 87 subreddits · 78 vectors
        </p>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* Category Selection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <h2 style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "var(--text-dim)",
              margin: 0,
              fontWeight: 600,
            }}>
              Target Niches
            </h2>
            <button onClick={() => setSelectedCategories(CATEGORIES.map(c => c.id))} style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-body)",
            }}>All</button>
            <button onClick={() => setSelectedCategories([])} style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-body)",
            }}>None</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map(cat => (
              <CategoryChip
                key={cat.id}
                cat={cat}
                selected={selectedCategories.includes(cat.id)}
                onClick={toggleCategory}
              />
            ))}
          </div>

          {/* Tier legend & vector count */}
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "var(--text-dim)", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ecdc4" }} /> Tier 1</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7ec8e3" }} /> Tier 2</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8a8a8a" }} /> Tier 3</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
              {CROSS_CATEGORY_QUERIES.length + selectedCategories.reduce((sum, id) => {
                const cat = CATEGORIES.find(c => c.id === id);
                return sum + (cat?.queries?.length || 0);
              }, 0) + (customNiche.trim() ? customNiche.split(",").filter(Boolean).length * 3 : 0)} vectors selected
            </span>
          </div>

          {/* Custom niche input */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Add custom niches (comma-separated)..."
              value={customNiche}
              onChange={e => setCustomNiche(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 14px",
                background: "var(--bg-inset)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily: "var(--font-body)",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Action Bar */}
        <div style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
        }}>
          <button
            onClick={isRunning ? () => { abortRef.current = true; } : runMining}
            disabled={!isRunning && selectedCategories.length === 0 && !customNiche.trim()}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: isRunning ? "var(--red)" : "var(--accent)",
              color: "#0d0d0d",
              fontSize: 14,
              fontWeight: 700,
              cursor: selectedCategories.length === 0 && !customNiche.trim() && !isRunning ? "not-allowed" : "pointer",
              fontFamily: "var(--font-display)",
              opacity: !isRunning && selectedCategories.length === 0 && !customNiche.trim() ? 0.4 : 1,
              transition: "all 0.2s ease",
            }}
          >
            {isRunning ? "⏹ Stop Mining" : "⛏ Start Mining"}
          </button>

          {ideas.length > 0 && (
            <>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                }}
              >
                <option value="composite">Sort: Composite Score</option>
                <option value="demand">Sort: Demand Signal</option>
                <option value="margin">Sort: Margin %</option>
                <option value="price">Sort: Price (Low→High)</option>
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Min margin:</span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={filterMinMargin}
                  onChange={e => setFilterMinMargin(Number(e.target.value))}
                  style={{ width: 80, accentColor: "var(--accent)" }}
                />
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", width: 35 }}>
                  {filterMinMargin}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* Progress Log */}
        {isRunning && progressSteps.length > 0 && (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 16,
            marginBottom: 24,
            maxHeight: 200,
            overflowY: "auto",
          }}>
            {progressSteps.map((step, i) => (
              <ProgressStep key={i} step={step} current={0} total={0} />
            ))}
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(232, 93, 93, 0.1)",
            border: "1px solid var(--red)",
            borderRadius: 10,
            padding: 16,
            marginBottom: 24,
            color: "var(--red)",
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Summary Stats */}
        {ideas.length > 0 && !isRunning && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { label: "Ideas Found", value: ideas.length, sub: "unique opportunities" },
              { label: "Avg Margin", value: `${avgMargin}%`, sub: "gross margin" },
              { label: "Avg Demand", value: `${avgDemand}/10`, sub: "signal strength" },
              { label: "Categories", value: [...new Set(ideas.map(i => i.category))].length, sub: "niches covered" },
            ].map((stat, i) => (
              <div key={i} style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "16px 20px",
                animation: `slideUp 0.4s ease ${i * 0.1}s both`,
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>{stat.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Scoring Methodology */}
        {ideas.length === 0 && !isRunning && (
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 24,
            marginBottom: 24,
          }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontFamily: "var(--font-display)", fontWeight: 700 }}>
              How It Works
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { step: "01", title: "Mine", desc: "87 subreddits across 14 niches + 6 cross-category vectors. Searches prioritize recent (2024-2026) problem posts using 4 query types: pain, wish, search, and hack signals." },
                { step: "02", title: "Score", desc: "Each idea scored on 5 weighted dimensions: demand (30%), margin (25%), feasibility (20%), uniqueness (15%), regulatory ease (10%). Also evaluates ad creative potential and influencer fit." },
                { step: "03", title: "Rank", desc: "Deduplicated, merged, and stack-ranked. Ideas with heavy certification burden or poor visual demo potential are filtered out. Export to CSV or send top 5 to Claude for deeper analysis." },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)", opacity: 0.5 }}>
                    {s.step}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "4px 0", fontFamily: "var(--font-display)" }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {sortedIdeas.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sortedIdeas.map((idea, idx) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                rank={idx + 1}
                expanded={expandedId === idea.id}
                onToggle={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
              />
            ))}
          </div>
        )}

        {/* Export button */}
        {ideas.length > 0 && !isRunning && (
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <button
              onClick={() => {
                const csv = [
                  ["Rank", "Name", "One-Liner", "Price", "COGS", "Margin%", "Demand", "MarginScore", "Feasibility", "Uniqueness", "RegEase", "Composite", "Category", "Rationale", "Ad Creative Angle"].join(","),
                  ...sortedIdeas.map((idea, idx) => {
                    const composite = Object.entries(SCORING_WEIGHTS).reduce((sum, [k, w]) => sum + (idea.scores[k] || 0) * w, 0).toFixed(1);
                    const margin = Math.round(((idea.estimatedPrice - idea.estimatedCOGS) / idea.estimatedPrice) * 100);
                    return [
                      idx + 1,
                      `"${idea.name}"`,
                      `"${idea.oneLiner.replace(/"/g, '""')}"`,
                      idea.estimatedPrice,
                      idea.estimatedCOGS,
                      margin,
                      idea.scores.demandSignal,
                      idea.scores.marginPotential,
                      idea.scores.feasibility,
                      idea.scores.uniqueness,
                      idea.scores.regulatoryEase,
                      composite,
                      `"${idea.category}"`,
                      `"${(idea.rankingRationale || '').replace(/"/g, '""')}"`,
                      `"${(idea.adCreativePotential || '').replace(/"/g, '""')}"`,
                    ].join(",");
                  }),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `gadgetminer-results-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-display)",
              }}
            >
              ↓ Export CSV
            </button>
            <button
              onClick={() => {
                const text = `Here are my GadgetMiner results. Please analyze the top 5 ideas and tell me which one you'd recommend pursuing first as a solo hardware entrepreneur, considering manufacturing complexity, go-to-market speed, and margin potential:\n\n${sortedIdeas.slice(0, 5).map((idea, idx) => `${idx + 1}. ${idea.name}: ${idea.oneLiner} (Price: $${idea.estimatedPrice}, COGS: $${idea.estimatedCOGS}, Demand: ${idea.scores.demandSignal}/10)`).join("\n")}`;
                navigator.clipboard.writeText(text).then(() => {
                  alert("Copied to clipboard! Paste into Claude to analyze.");
                });
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid var(--accent)",
                background: "var(--accent-bg)",
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-display)",
              }}
            >
              → Analyze Top 5 with Claude
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
