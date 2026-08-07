import { readFileSync } from 'fs';
import { join } from 'path';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'safe';

export interface FeatureFlag {
    name: string;
    type: string;
    description: string;
    enabled: boolean;
    rollout: number;
    stickiness: string;
    variants: number;
    impressionData: boolean;
    createdAt: string;
}

export interface FeatureFlagSummary {
    total: number;
    enabled: number;
    disabled: number;
    enabledPct: number;
    byType: Record<string, number>;
    killSwitches: number;
    experiments: number;
    releases: number;
    operational: number;
    described: number;
    undocumented: number;
}

export interface FeatureRiskItem {
    name: string;
    type: string;
    risk: RiskLevel;
    coverage: number;
    owner: string | null;
}

export interface FeatureDocItem {
    name: string;
    type: string;
    status: 'generated' | 'generating' | 'stale' | 'missing';
    lastGen: string;
    coverage: number;
    icon: string;
}

export interface FeatureDocsState {
    total: number;
    documented: number;
    missing: number;
    items: FeatureDocItem[];
}

interface RawFlag {
    name?: string;
    type?: string;
    description?: string;
    enabled?: boolean;
    strategies?: Array<{ parameters?: { rollout?: string; stickiness?: string } }>;
    variants?: unknown[];
    impressionData?: boolean;
    createdAt?: string;
}

function loadRawFlags(): Record<string, RawFlag> {
    let raw: string;
    try {
        raw = readFileSync(join(__dirname, 'unleash.flags.json'), 'utf-8');
    } catch {
        raw = readFileSync(join(process.cwd(), 'src', 'phoenix', 'unleash.flags.json'), 'utf-8');
    }
    return JSON.parse(raw) as Record<string, RawFlag>;
}

let cached: FeatureFlag[] | null = null;

export function getFeatureFlags(): FeatureFlag[] {
    if (cached) return cached;
    const raw = loadRawFlags();
    cached = Object.values(raw).map((f) => ({
        name: f.name ?? '',
        type: f.type ?? 'release',
        description: f.description ?? '',
        enabled: !!f.enabled,
        rollout: Number(f.strategies?.[0]?.parameters?.rollout ?? 100),
        stickiness: f.strategies?.[0]?.parameters?.stickiness ?? 'default',
        variants: f.variants?.length ?? 0,
        impressionData: !!f.impressionData,
        createdAt: f.createdAt ?? '',
    }));
    return cached;
}

export function getFeatureFlagSummary(): FeatureFlagSummary {
    const flags = getFeatureFlags();
    const enabled = flags.filter((f) => f.enabled).length;
    const byType: Record<string, number> = {};
    for (const f of flags) {
        byType[f.type] = (byType[f.type] ?? 0) + 1;
    }
    return {
        total: flags.length,
        enabled,
        disabled: flags.length - enabled,
        enabledPct: Math.round((enabled / flags.length) * 100),
        byType,
        killSwitches: byType['kill-switch'] ?? 0,
        experiments: byType['experiment'] ?? 0,
        releases: byType['release'] ?? 0,
        operational: byType['operational'] ?? 0,
        described: flags.filter((f) => f.description).length,
        undocumented: flags.filter((f) => !f.description).length,
    };
}

function flagRisk(f: FeatureFlag): RiskLevel {
    if (!f.enabled) return 'low';
    if (f.type === 'kill-switch') return 'critical';
    if (f.type === 'experiment') return 'medium';
    if (f.type === 'permission') return 'medium';
    if (f.rollout < 100) return 'high';
    if (!f.description) return 'medium';
    return 'safe';
}

export function getFeatureRisk(): FeatureRiskItem[] {
    return getFeatureFlags().map((f) => ({
        name: f.name,
        type: f.type,
        risk: flagRisk(f),
        coverage: f.description ? 90 : 20,
        owner: null,
    }));
}

function flagPriority(f: FeatureFlag): number {
    if (f.type === 'kill-switch') return 0;
    if (f.type === 'experiment') return 1;
    if (f.type === 'permission') return 2;
    if (f.enabled) return 3;
    return 4;
}

export function getFeatureDocsState(): FeatureDocsState {
    const flags = getFeatureFlags();
    const documented = flags.filter((f) => f.description);
    const missing = flags.filter((f) => !f.description);
    const sortedMissing = [...missing].sort((a, b) => flagPriority(a) - flagPriority(b)).slice(0, 20);
    const generated = documented
        .filter((f) => f.type !== 'experiment')
        .slice(0, 4)
        .map((f) => ({
            name: f.name,
            type: `Feature Flag · ${f.type}`,
            status: 'generated' as const,
            lastGen: 'Live',
            coverage: 90,
            icon: '📄',
        }));
    const items: FeatureDocItem[] = sortedMissing.map((f) => ({
        name: f.name,
        type: `Feature Flag · ${f.type}`,
        status: 'missing' as const,
        lastGen: 'Never',
        coverage: 0,
        icon: f.type === 'kill-switch' ? '🛑' : f.type === 'experiment' ? '🧪' : '🚩',
    }));
    return {
        total: flags.length,
        documented: documented.length,
        missing: missing.length,
        items: [...generated, ...items],
    };
}

export function searchFeatureFlags(query: string): FeatureFlag[] {
    const q = query.trim().toLowerCase();
    if (!q) return getFeatureFlags().slice(0, 50);
    return getFeatureFlags()
        .filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
        .slice(0, 50);
}
