"use client";

import { useState, type ReactNode } from "react";
import { AsciiDna } from "./ascii-dna";
import { Copy, Check } from "lucide-react";

const codeExamples = [
  {
    label: "Explore",
    code: `const architecture = await phoenix.graph.explore({
  service: "authentication-service",
  depth: 3
})`,
  },
  {
    label: "Search",
    code: `const insights = await phoenix.search({
  query: "payment architecture risk",
  include: ["decisions", "meetings"],
  stream: true
})

for await (const insight of insights) {
  console.log(insight.explanation)
}`,
  },
  {
    label: "Ingest",
    code: `await phoenix.ingest({
  source: "github",
  repository: "payments-service",
  extract: ["entities", "dependencies"]
})

// Knowledge graph updated
console.log("Ingestion complete")`,
  },
];

const features = [
  { 
    title: "TypeScript-first SDK", 
    description: "Full type safety for graph entities, evidence, and organizational insights."
  },
  { 
    title: "Graph-aware APIs", 
    description: "Traverse relationships, dependencies, ownership, and decision context in code."
  },
  { 
    title: "Streaming organizational insights", 
    description: "Deliver explanations and evidence as Phoenix reasons across the graph."
  },
  { 
    title: "Zero-config knowledge ingestion", 
    description: "Connect sources quickly and let Phoenix extract organizational context automatically."
  },
];

export function DevelopersSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developers" className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Content */}
          <div>
            <p className="text-sm font-mono text-primary mb-3">// FOR ENGINEERING TEAMS</p>
            <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight mb-6 text-balance">
              Built for developers,<br />architects, and technical leaders.
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Explore the knowledge graph with a TypeScript-first toolkit for decision intelligence, risk analysis, and streaming organizational insights.
            </p>
            
            {/* Features list */}
            <div className="grid gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="w-1 bg-primary/30 rounded-full shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* ASCII DNA decoration */}
            
          </div>
          
          {/* Right: Code block */}
          <div className="lg:sticky lg:top-32">
            <div className="rounded-xl overflow-hidden bg-card border border-border card-shadow">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-2 border-b border-border bg-secondary/30">
                {codeExamples.map((example, idx) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                      activeTab === idx
                        ? "bg-card text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {example.label}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {/* Code content */}
              <div className="p-6 font-mono text-sm overflow-x-auto">
                <pre className="text-muted-foreground">
                  <code>
                    {codeExamples[activeTab].code.split('\n').map((line, i) => (
                      <div key={i} className="leading-relaxed">
                        <span className="text-muted-foreground/40 select-none w-8 inline-block">{i + 1}</span>
                        <span>
                          {highlightSyntax(line).map((token, tokenIndex) => (
                            <span key={`${activeTab}-${i}-${tokenIndex}`}>{token}</span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
              
              {/* Terminal output */}
              <div className="border-t border-border p-4 bg-secondary/20">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-2">
                  <span className="text-green-500">$</span>
                  <span>npm install @phoenix/sdk</span>
                </div>
                <div className="text-xs font-mono text-muted-foreground/60">
                  added 1 package in 0.4s
                </div>
              </div>
            </div>
            
            {/* Docs link */}
            <div className="mt-6 flex items-center gap-4 text-sm">
              <a href="#" className="text-primary hover:underline font-mono">
                Read the docs
              </a>
              <span className="text-border">|</span>
              <a href="#" className="text-muted-foreground hover:text-foreground font-mono">
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function highlightSyntax(line: string): ReactNode[] {
  const parts = line.split(/(\/\/.*$|".*?"|'.*?'|\b(?:import|from|const|await|for|phoenix|graph|search)\b|[{}()[\]])/g);

  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith("//")) return <span className="text-muted-foreground/50" key={index}>{part}</span>;
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
      return <span className="text-green-400" key={index}>{part}</span>;
    }
    if (/^(import|from|const|await|for|phoenix|graph|search)$/.test(part)) {
      return <span className="text-primary" key={index}>{part}</span>;
    }
    if (/^[{}()[\]]$/.test(part)) return <span className="text-muted-foreground" key={index}>{part}</span>;
    return <span key={index}>{part}</span>;
  });
}
