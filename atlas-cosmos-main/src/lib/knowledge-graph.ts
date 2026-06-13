// ATLAS knowledge universe — galaxies → clusters → terms.
// A deterministic, scattered layout in a fixed world; the canvas tiles
// it infinitely so the user can pan forever and wrap back to where they started.

export type NodeKind = "term" | "cluster" | "galaxy";

export interface KnowledgeNode {
  id: string;
  label: string;
  kind: NodeKind;
  category: string; // galaxy id
  cluster?: string; // cluster id (for terms)
  summary: string;
  example?: string;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  weight: number; // 0..1
}

interface ClusterDef { id: string; label: string; terms: string[] }
interface GalaxyDef { id: string; label: string; color: string; clusters: ClusterDef[] }

// ---------- DATA ----------
const slug = (s: string) =>
  s.toLowerCase().replace(/\+/g, "p").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const GALAXIES: GalaxyDef[] = [
  {
    id: "web", label: "Web Development", color: "oklch(0.78 0.16 230)",
    clusters: [
      { id: "basic-web", label: "Basic Web", terms: ["HTML","CSS","JavaScript","TypeScript","DOM","Responsive Design","Accessibility","SEO"] },
      { id: "web-hosting", label: "Web Hosting", terms: ["DNS","Domain","CDN","Static Website","Dynamic Website","SPA","SSR","SSG","Hydration","Browser Rendering"] },
      { id: "web-storage", label: "Browser Storage", terms: ["Cookies","Local Storage","Session Storage","PWA","Web Components"] },
      { id: "web-tooling", label: "Tooling", terms: ["Tailwind CSS","Bootstrap","Sass","Webpack","Vite","Babel","NPM","Yarn","PNPM"] },
      { id: "frontend", label: "Frontend", terms: ["React","Next.js","Vue.js","Nuxt.js","Angular","Svelte","Remix","Astro"] },
      { id: "state", label: "State & Patterns", terms: ["Redux","Zustand","MobX","Context API","React Hooks","Component Architecture","Routing","Virtual DOM","Server Components","Lazy Loading","Infinite Scroll","Client Side Rendering"] },
      { id: "design-sys", label: "Design Systems", terms: ["Design System","UI Library","Shadcn UI","Material UI","Chakra UI","Framer Motion","GSAP"] },
      { id: "backend", label: "Backend", terms: ["Node.js","Express.js","NestJS","Django","Flask","FastAPI","Spring Boot","Laravel","Ruby on Rails"] },
      { id: "api", label: "APIs", terms: ["REST API","GraphQL","RPC","WebSockets","Middleware","ORM","Prisma","Sequelize","API Gateway","Rate Limiting","CORS"] },
      { id: "backend-arch", label: "Backend Architecture", terms: ["Microservices","Monolith","Event Driven Architecture","Message Queue","RabbitMQ","Kafka","Cron Jobs","Reverse Proxy","Nginx","Apache"] },
    ],
  },
  {
    id: "mobile", label: "Mobile", color: "oklch(0.78 0.11 190)",
    clusters: [
      { id: "android", label: "Android", terms: ["Android Studio","Kotlin","Java","Jetpack Compose","XML Layouts","APK","AAB","Gradle","Android SDK","Activity Lifecycle","Intents","Fragments","Room Database"] },
      { id: "ios", label: "iOS", terms: ["Swift","SwiftUI","UIKit","Xcode","CocoaPods","TestFlight"] },
      { id: "cross-platform", label: "Cross Platform", terms: ["Flutter","Dart","React Native","Expo","Ionic","Capacitor","Xamarin"] },
    ],
  },
  {
    id: "db", label: "Databases", color: "oklch(0.72 0.14 165)",
    clusters: [
      { id: "sql", label: "SQL", terms: ["MySQL","PostgreSQL","SQLite","MariaDB","OracleDB","SQL Server","ACID","Joins","Indexing","Normalization","Query Optimization"] },
      { id: "nosql", label: "NoSQL", terms: ["MongoDB","Redis","Cassandra","DynamoDB","CouchDB","Firebase Firestore"] },
      { id: "vector-db", label: "Vector DB", terms: ["Pinecone","Weaviate","ChromaDB"] },
    ],
  },
  {
    id: "cloud", label: "Cloud & DevOps", color: "oklch(0.7 0.18 290)",
    clusters: [
      { id: "cloud-platforms", label: "Cloud Platforms", terms: ["AWS","Azure","Google Cloud","DigitalOcean","Vercel","Netlify","Cloudflare","Heroku","Render"] },
      { id: "devops", label: "DevOps", terms: ["Docker","Kubernetes","Containerization","Virtual Machines","CI/CD","GitHub Actions","Jenkins","GitLab CI","Terraform","Infrastructure as Code","Helm"] },
      { id: "ops", label: "Ops & Scaling", terms: ["Load Balancer","Auto Scaling","Monitoring","Logging","Grafana","Prometheus","ELK Stack"] },
      { id: "linux", label: "Linux", terms: ["Linux","Shell Scripting","Bash","SSH"] },
    ],
  },
  {
    id: "sec", label: "Security", color: "oklch(0.7 0.2 25)",
    clusters: [
      { id: "identity", label: "Identity", terms: ["Authentication","Authorization","MFA","SSO","Passkeys","Identity Provider","IAM","RBAC","Zero Trust","Access Tokens","Refresh Tokens","Biometric Authentication","JWT","OAuth","OAuth2","OpenID Connect","SAML"] },
      { id: "crypto", label: "Cryptography", terms: ["Encryption","Hashing","SSL/TLS","HTTPS","Public Key","Private Key","Symmetric Encryption","Asymmetric Encryption","End-to-End Encryption","Digital Signature","PKI"] },
      { id: "net-sec", label: "Network Security", terms: ["Firewall","VPN","Proxy","IDS","IPS"] },
      { id: "cyber", label: "Cybersecurity", terms: ["Penetration Testing","Ethical Hacking","SQL Injection","XSS","CSRF","DDoS","Malware","Ransomware","Phishing","Brute Force Attack","Packet Sniffing","Vulnerability Assessment","Threat Modeling","Bug Bounty","SOC","SIEM","Kali Linux","Metasploit","Wireshark"] },
    ],
  },
  {
    id: "ai", label: "AI & ML", color: "oklch(0.72 0.2 320)",
    clusters: [
      { id: "ai-basics", label: "AI Basics", terms: ["Machine Learning","Deep Learning","Neural Networks","LLM","Transformer","NLP","Computer Vision","Generative AI","AI Agent","AI Copilot","Multimodal AI"] },
      { id: "ai-techniques", label: "Techniques", terms: ["Prompt Engineering","Fine Tuning","Embeddings","Vector Search","RAG","Tokenization","Context Window","Inference","AI Workflow","AI Hallucination","Quantization"] },
      { id: "ai-frameworks", label: "Frameworks", terms: ["TensorFlow","PyTorch","Hugging Face","LangChain","Ollama","OpenAI API","Gemini API","Claude API","Stable Diffusion","Whisper","ONNX"] },
    ],
  },
  {
    id: "sw", label: "Software Engineering", color: "oklch(0.78 0.13 90)",
    clusters: [
      { id: "core", label: "Core Concepts", terms: ["Data Structures","Algorithms","OOP","Functional Programming","Design Patterns","SOLID Principles","Clean Architecture","MVC","MVVM","Singleton Pattern","Observer Pattern","Dependency Injection","Refactoring","Concurrency","Multithreading","Asynchronous Programming"] },
      { id: "vcs", label: "Version Control", terms: ["Git","GitHub","GitLab","Merge Conflict","Pull Request","Fork","Branching","Commit","Rebasing"] },
    ],
  },
  {
    id: "sys", label: "System Design", color: "oklch(0.74 0.14 250)",
    clusters: [
      { id: "scaling", label: "Scaling", terms: ["Scalability","High Availability","Fault Tolerance","Horizontal Scaling","Vertical Scaling","Distributed Systems","Caching","Sharding","Replication","CAP Theorem"] },
      { id: "infra-patterns", label: "Infra Patterns", terms: ["Event Streaming","Service Discovery","Circuit Breaker"] },
    ],
  },
  {
    id: "net", label: "IT & Networking", color: "oklch(0.8 0.13 200)",
    clusters: [
      { id: "protocols", label: "Protocols", terms: ["TCP/IP","HTTP","FTP","SMTP","DHCP","IPv4","IPv6"] },
      { id: "devices", label: "Devices", terms: ["Router","Switch","Gateway","Subnet","MAC Address","NAT","Port Forwarding"] },
      { id: "perf", label: "Performance", terms: ["Bandwidth","Latency","Packet Loss"] },
    ],
  },
  {
    id: "web3", label: "Blockchain & Web3", color: "oklch(0.78 0.15 60)",
    clusters: [
      { id: "chain", label: "Chain", terms: ["Blockchain","Smart Contract","Ethereum","Solidity","Consensus Mechanism","Layer 2","zk-Rollups","Gas Fees"] },
      { id: "web3-apps", label: "Apps", terms: ["NFT","DAO","DeFi","Wallet"] },
    ],
  },
  {
    id: "startup", label: "Startup & Industry", color: "oklch(0.78 0.14 130)",
    clusters: [
      { id: "models", label: "Models", terms: ["SaaS","PaaS","IaaS","B2B","B2C","MVP","Product Market Fit","Tech Stack"] },
      { id: "process", label: "Process", terms: ["Agile","Scrum","Sprint","Kanban"] },
      { id: "growth", label: "Growth", terms: ["KPI","Analytics","User Retention","Churn","A/B Testing","Growth Hacking","Product Analytics"] },
    ],
  },
  {
    id: "emerg", label: "Emerging Tech", color: "oklch(0.78 0.17 340)",
    clusters: [
      { id: "frontier", label: "Frontier", terms: ["Edge Computing","Spatial Computing","Quantum Computing","Digital Twin","IoT","Smart Devices","AR/VR","Mixed Reality","Autonomous Systems","Robotics","Brain Computer Interface"] },
      { id: "agentic", label: "Agentic & Code", terms: ["Agentic AI","MCP","AI Automation","Low Code","No Code","Serverless","Edge Functions"] },
    ],
  },
];

// Cross-galaxy bridges between related leaf terms (semantic shortcuts).
const BRIDGES: Array<[string, string]> = [
  ["react","typescript"], ["next-js","react"], ["next-js","vercel"],
  ["docker","kubernetes"], ["kubernetes","aws"], ["serverless","edge-functions"],
  ["oauth","jwt"], ["oauth","openid-connect"], ["sso","saml"], ["mfa","passkeys"],
  ["jwt","authentication"], ["https","ssl-tls"], ["encryption","public-key"],
  ["llm","transformer"], ["rag","embeddings"], ["embeddings","vector-search"],
  ["vector-search","pinecone"], ["langchain","openai-api"], ["fine-tuning","llm"],
  ["postgresql","prisma"], ["mongodb","mongoose" /* not present, ignored */],
  ["redis","caching"], ["graphql","rest-api"], ["websockets","event-streaming"],
  ["ci-cd","github-actions"], ["terraform","aws"], ["kubernetes","helm"],
  ["microservices","message-queue"], ["kafka","event-streaming"],
  ["react-native","react"], ["flutter","dart"], ["swift","swiftui"],
  ["ethereum","solidity"], ["smart-contract","ethereum"], ["wallet","defi"],
  ["agentic-ai","ai-agent"], ["mcp","ai-agent"], ["ai-automation","ai-workflow"],
  ["seo","analytics"], ["a-b-testing","product-analytics"],
];

// ---------- BUILD NODES + EDGES ----------
const NODES_BUILD: KnowledgeNode[] = [];
const EDGES_BUILD: KnowledgeEdge[] = [];
const CATEGORY_COLORS_BUILD: Record<string, string> = {};
const seen = new Set<string>();

for (const g of GALAXIES) {
  CATEGORY_COLORS_BUILD[g.id] = g.color;
  // galaxy center node
  NODES_BUILD.push({ id: `g-${g.id}`, label: g.label, kind: "galaxy", category: g.id, summary: `${g.label} — galaxy of related concepts.` });
  seen.add(`g-${g.id}`);

  for (const c of g.clusters) {
    const cid = `c-${c.id}`;
    NODES_BUILD.push({ id: cid, label: c.label, kind: "cluster", category: g.id, cluster: c.id, summary: `${c.label} cluster in ${g.label}.` });
    seen.add(cid);
    EDGES_BUILD.push({ source: `g-${g.id}`, target: cid, weight: 0.9 });

    for (const t of c.terms) {
      const tid = slug(t);
      if (seen.has(tid)) continue;
      // try to provide a concise human-friendly summary + example when available
      const key = tid;
      const defs: Record<string, { summary: string; example: string }> = {
        // Web
        html: { summary: "HTML — the standard markup language for creating web pages.", example: "Example: Use semantic tags like <article> and <nav> to structure content." },
        css: { summary: "CSS — styles and layout rules for HTML content.", example: "Example: Use Flexbox or Grid to build responsive layouts." },
        javascript: { summary: "JavaScript — the primary scripting language for web interactivity.", example: "Example: Add an event listener to respond to user clicks." },
        typescript: { summary: "TypeScript — statically typed superset of JavaScript.", example: "Example: Define interfaces to document object shapes and catch errors at compile time." },
        react: { summary: "React — a component-based UI library for building interactive web apps.", example: "Example: Create reusable components and manage state with hooks like useState." },
        "next-js": { summary: "Next.js — React framework for hybrid SSR/SSG and routing.", example: "Example: Use getStaticProps to pre-render pages at build time." },
        nodejs: { summary: "Node.js — JavaScript runtime for building server-side applications.", example: "Example: Create an HTTP server with Express to serve APIs." },
        expressjs: { summary: "Express.js — minimal web framework for Node.js.", example: "Example: Define routes for REST endpoints like GET /api/users." },
        graphql: { summary: "GraphQL — a query language for APIs that lets clients request exactly what they need.", example: "Example: Query a user with only the fields you need instead of a fixed REST response." },
        "rest-api": { summary: "REST API — representational state transfer style for HTTP APIs.", example: "Example: Use standard HTTP verbs (GET, POST, PUT, DELETE) for resources." },
        websocket: { summary: "WebSocket — persistent bidirectional communication channel over a single TCP connection.", example: "Example: Use WebSockets to push real-time chat messages to connected clients." },
        docker: { summary: "Docker — containerization platform to package apps and dependencies.", example: "Example: Build and run a containerized service with a Dockerfile." },
        kubernetes: { summary: "Kubernetes — orchestration system for deploying and managing containerized applications.", example: "Example: Define a Deployment and Service to scale and expose your app." },
        aws: { summary: "AWS — a major cloud provider offering compute, storage, and managed services.", example: "Example: Deploy a web app to EC2 or a serverless function to Lambda." },
        postgresql: { summary: "PostgreSQL — open-source relational database with strong SQL support.", example: "Example: Use transactions and indexes to optimize complex queries." },
        mysql: { summary: "MySQL — widely used relational database for structured data.", example: "Example: Use JOINs to combine related tables." },
        mongodb: { summary: "MongoDB — document-oriented NoSQL database for flexible schemas.", example: "Example: Store JSON-like documents for quick iteration on data models." },
        redis: { summary: "Redis — in-memory key-value store often used for caching and fast data access.", example: "Example: Cache computed responses to reduce database load." },
        pinecone: { summary: "Pinecone — vector database for similarity search and retrieval.", example: "Example: Index embeddings and perform nearest-neighbor search for semantic queries." },
        embeddings: { summary: "Embeddings — numeric vectors representing semantic meaning of text or other media.", example: "Example: Compute embeddings for documents and use vector search to find related content." },
        llm: { summary: "LLM — large language model used for natural language understanding and generation.", example: "Example: Use an LLM to generate summaries or answer questions from text." },
        transformer: { summary: "Transformer — neural architecture powering modern LLMs, using attention mechanisms.", example: "Example: Transformers process tokens in parallel using self-attention to model context." },
        rag: { summary: "RAG — retrieval-augmented generation combines retrieval with a generator to ground responses.", example: "Example: Fetch relevant documents and pass them as context to an LLM for accurate answers." },
        prompt: { summary: "Prompt Engineering — crafting inputs to steer LLM outputs effectively.", example: "Example: Provide clear instructions, examples, and constraints to the model." },
        jwt: { summary: "JWT — JSON Web Token, a compact token format for claiming identity and metadata.", example: "Example: Issue a JWT after login to authenticate API requests." },
        oauth: { summary: "OAuth — an authorization framework allowing delegated access to resources.", example: "Example: Sign in with a provider to obtain an access token without sharing user credentials." },
        "open-id-connect": { summary: "OpenID Connect — identity layer on top of OAuth 2.0 for user authentication.", example: "Example: Retrieve user profile information via the ID token after login." },
        // add more explicit definitions here as needed
      };

      const def = defs[key] ?? defs[tid.replace(/-/g, "")] ?? null;
      const summary = def ? def.summary : `${t} — part of the ${c.label} cluster in ${g.label}.`;
      const example = def ? def.example : `Example: A typical use of ${t} would be within ${c.label.toLowerCase()}.`;

      NODES_BUILD.push({ id: tid, label: t, kind: "term", category: g.id, cluster: c.id, summary, example });
      seen.add(tid);
      EDGES_BUILD.push({ source: cid, target: tid, weight: 0.75 });
    }
  }
}

for (const [a, b] of BRIDGES) {
  if (seen.has(a) && seen.has(b)) EDGES_BUILD.push({ source: a, target: b, weight: 0.85 });
}

export const NODES: KnowledgeNode[] = NODES_BUILD;
export const EDGES: KnowledgeEdge[] = EDGES_BUILD;
export const CATEGORY_COLORS: Record<string, string> = CATEGORY_COLORS_BUILD;
export const GALAXY_DEFS = GALAXIES;

// ---------- LAYOUT ----------
export const WORLD_W = 4200;
export const WORLD_H = 3000;

// deterministic pseudo-random in [0,1) from any seed string
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
const jitter = (seed: string, amp: number) => (hash(seed) - 0.5) * 2 * amp;

export interface Pos { x: number; y: number; r: number }

// Build a single static layout for the whole universe centered on (0,0).
export const POSITIONS: Map<string, Pos> = (() => {
  const map = new Map<string, Pos>();
  const cols = 4, rows = Math.ceil(GALAXIES.length / cols);
  const cellW = WORLD_W / cols;
  const cellH = WORLD_H / rows;

  GALAXIES.forEach((g, gi) => {
    const col = gi % cols;
    const row = Math.floor(gi / cols);
    const gx = -WORLD_W / 2 + cellW * (col + 0.5) + jitter(`gx-${g.id}`, cellW * 0.12);
    const gy = -WORLD_H / 2 + cellH * (row + 0.5) + jitter(`gy-${g.id}`, cellH * 0.12);
    map.set(`g-${g.id}`, { x: gx, y: gy, r: 26 });

    const clusterCount = g.clusters.length;
    g.clusters.forEach((c, ci) => {
      // place clusters around galaxy center on a scattered arc
      const baseAngle = (ci / clusterCount) * Math.PI * 2 + hash(`ca-${g.id}`) * Math.PI;
      const angle = baseAngle + jitter(`cj-${c.id}`, 0.55);
      const radius = Math.min(cellW, cellH) * (0.22 + hash(`cr-${c.id}`) * 0.18);
      const cx = gx + Math.cos(angle) * radius;
      const cy = gy + Math.sin(angle) * radius;
      map.set(`c-${c.id}`, { x: cx, y: cy, r: 14 });

      // scatter terms in a small constellation around their cluster center
      const n = c.terms.length;
      c.terms.forEach((t, ti) => {
        const tid = slug(t);
        const localAngle = (ti / Math.max(1, n)) * Math.PI * 2 + jitter(`ta-${c.id}-${ti}`, 0.9);
        const localR = 38 + hash(`tr-${tid}`) * 70 + (ti % 3) * 14;
        const px = cx + Math.cos(localAngle) * localR + jitter(`px-${tid}`, 12);
        const py = cy + Math.sin(localAngle) * localR + jitter(`py-${tid}`, 12);
        if (!map.has(tid)) map.set(tid, { x: px, y: py, r: 4 + hash(`r-${tid}`) * 3 });
      });
    });
  });
  return map;
})();
