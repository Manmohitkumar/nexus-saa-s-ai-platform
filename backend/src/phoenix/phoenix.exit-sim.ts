import { getFeatureFlags } from './phoenix.features';
import type { FeatureFlag } from './phoenix.features';
import type { ExitSimulationProfile, ExitSimulationRecommendation, ExitSimulationScenario } from './phoenix.types';

interface SystemProfile {
    id: string;
    label: string;
    keywords: string[];
}

const SYSTEM_PROFILES: SystemProfile[] = [
    {
        id: 'auth-service',
        label: 'Auth Service',
        keywords: ['AUTH', 'SESSION', 'JWT', 'WORKOS', 'ACL', 'ACCESS_ACL', 'BANNED', 'BANNED_IP', 'COUNTRY_KILL', 'AUTO_BANNER', 'PLUS-ADDRESS', 'ROLE', 'PERMISSION', 'RBAC'],
    },
    {
        id: 'api-gateway',
        label: 'API Gateway',
        keywords: ['API_SERVER', 'API_PROVIDER', 'API-TO-SESSION', 'HTTP_CLIENT', 'HTTP_2', 'SOFT_LIMIT', 'INFERENCE_API', 'PROXY_WEB', 'RESPONSES-API', 'USE_OPENAI', 'USE_ANTHROPIC', 'EXTERNAL_MODEL_STREAM', 'API-', 'CLIENT_'],
    },
    {
        id: 'payments',
        label: 'Payments & Billing',
        keywords: ['PRICING', 'PAYMENT', 'BILLING', 'PREMIUM', 'CROSS_SELL', 'QUOTA', 'CREDITS_USED', 'CREDITS', 'PURCHASE', 'PLAN', 'SUBSCRIPTION', 'SERVER-SIDE-PRICING'],
    },
    {
        id: 'data-pipeline',
        label: 'Data Pipeline',
        keywords: ['TELEMETRY', 'METRICS', 'EVENT', 'TRAJECTORY', 'PROFILING', 'RECORD_', 'RECORDING', 'SNAPSHOT', 'IMPLICIT', 'STREAM_USER', 'PERSIST_CODE', 'RANGE_TRACKING'],
    },
    {
        id: 'analytics',
        label: 'Analytics',
        keywords: ['ANALYTICS', 'SEGMENT', 'ATTRIBUTION', 'SENTIMENT', 'SORT_EOM', 'RECOMMEND'],
    },
    {
        id: 'user-db',
        label: 'User Context & Memory',
        keywords: ['MEMORY', 'MEMORIES', 'KNOWLEDGE', 'FAISS', 'EMBEDDING', 'USER_MEMORIES', 'KNOWLEDGE_BASE', 'SEARCH', 'WAVE_8_KNOWLEDGE'],
    },
    {
        id: 'infrastructure',
        label: 'Infrastructure',
        keywords: ['LANGUAGE_SERVER', 'R2_', 'DEPLOYMENT', 'DSV', 'SIDECAR', 'PTY', 'TERMINAL', 'VSCODE', 'JETBRAINS', 'MIN_IDE', 'BROWSER_', 'LAUNCH_CHROME', 'CDP', 'GRPC', 'MCP', 'PROXY', 'WINDOWS', 'MINIMUM'],
    },
    {
        id: 'ci-cd',
        label: 'CI/CD & Releases',
        keywords: ['AUTOUPDATE', 'VERSION', 'RELEASE', 'RATE_PROTECTION', 'CHECKPOINT', 'BACKFILL', 'FIREWORKS_ON_DEMAND'],
    },
    {
        id: 'monitoring',
        label: 'Monitoring & Reliability',
        keywords: ['SENTRY', 'LIVENESS', 'SAMPLE_RATE', 'LOG_CODES', 'MORE_LOGGING', 'ERROR_SAMPLE', 'VERBOSE_ERRORS', 'CLEARCUT', 'LOGGING', 'RECORD_TAB_SLOW', 'SHOW_DEBUG'],
    },
];

const SYSTEM_MAP = new Map(SYSTEM_PROFILES.map((s) => [s.id, s]));

function classifySystem(name: string): string | null {
    const upper = name.toUpperCase();
    for (const sys of SYSTEM_PROFILES) {
        if (sys.keywords.some((k) => upper.includes(k))) {
            return sys.id;
        }
    }
    return null;
}

interface SystemStats {
    id: string;
    label: string;
    total: number;
    undocumented: number;
    enabledUndocumented: number;
    killSwitches: number;
    experiments: number;
    enabled: number;
    risk: number;
}

const statsCache: { map: Map<string, SystemStats>; computed: boolean } = { map: new Map(), computed: false };

function computeSystemStats(): Map<string, SystemStats> {
    if (statsCache.computed) return statsCache.map;
    const counts = new Map<string, { total: number; undocumented: number; enabledUndocumented: number; killSwitches: number; experiments: number; enabled: number }>();
    for (const flag of getFeatureFlags()) {
        const sysId = classifySystem(flag.name);
        if (!sysId) continue;
        let c = counts.get(sysId);
        if (!c) {
            c = { total: 0, undocumented: 0, enabledUndocumented: 0, killSwitches: 0, experiments: 0, enabled: 0 };
            counts.set(sysId, c);
        }
        c.total += 1;
        if (flag.enabled) c.enabled += 1;
        if (!flag.description) {
            c.undocumented += 1;
            if (flag.enabled) c.enabledUndocumented += 1;
        }
        if (flag.type === 'kill-switch') c.killSwitches += 1;
        if (flag.type === 'experiment') c.experiments += 1;
    }
    const map = new Map<string, SystemStats>();
    for (const [id, c] of counts) {
        const undocRatio = c.total ? c.undocumented / c.total : 0;
        const enabledRatio = c.total ? c.enabled / c.total : 0;
        const liveUndocRatio = c.total ? c.enabledUndocumented / c.total : 0;
        const risk = Math.min(
            100,
            Math.round(
                undocRatio * 35 +
                liveUndocRatio * 25 +
                enabledRatio * 10 +
                Math.min(c.killSwitches, 5) * 4 +
                Math.min(c.experiments, 8) * 1.5,
            ),
        );
        map.set(id, { id, label: SYSTEM_MAP.get(id)?.label ?? id, ...c, risk });
    }
    statsCache.map = map;
    statsCache.computed = true;
    return map;
}

interface EmployeeDef {
    id: string;
    name: string;
    role: string;
    systems: string[];
}

const EMPLOYEES: EmployeeDef[] = [
    { id: 'sarah', name: 'Sarah Chen', role: 'Lead Architect', systems: ['auth-service', 'api-gateway', 'payments'] },
    { id: 'mike', name: 'Mike Ross', role: 'Backend Lead', systems: ['data-pipeline', 'analytics', 'user-db'] },
    { id: 'alice', name: 'Alice Park', role: 'DevOps Engineer', systems: ['infrastructure', 'ci-cd', 'monitoring'] },
];

function employeeRisk(emp: EmployeeDef, stats: Map<string, SystemStats>): { risk: number; weight: number } {
    let weightSum = 0;
    let riskSum = 0;
    for (const sysId of emp.systems) {
        const s = stats.get(sysId);
        if (!s) continue;
        const w = s.total;
        weightSum += w;
        riskSum += s.risk * w;
    }
    if (weightSum === 0) return { risk: 25, weight: 0 };
    const raw = riskSum / weightSum;
    const concentration = Math.min(emp.systems.length, 4) * 3;
    return { risk: Math.min(100, Math.round(raw * 0.75 + concentration)), weight: weightSum };
}

function onboardingEstimate(risk: number, weight: number): string {
    const score = risk + Math.min(weight, 40) * 0.2;
    if (score >= 90) return '8-12 weeks';
    if (score >= 70) return '6-8 weeks';
    if (score >= 55) return '4-6 weeks';
    return '2-4 weeks';
}

function buildSummary(emp: EmployeeDef, stats: Map<string, SystemStats>): string {
    const parts: string[] = [];
    for (const sysId of emp.systems) {
        const s = stats.get(sysId);
        if (!s) continue;
        if (s.undocumented > 0) {
            parts.push(`${s.undocumented} of ${s.total} ${sysId} flags undocumented`);
        }
        if (s.killSwitches > 0) {
            parts.push(`${s.killSwitches} kill-switch(es) on ${sysId}`);
        }
    }
    const joined = parts.length ? parts.join('; ') : 'no undocumented flags on owned systems';
    return `Owns ${emp.systems.join(', ')}. Knowledge concentration is high: ${joined}.`;
}

function buildMitigation(emp: EmployeeDef, stats: Map<string, SystemStats>): ExitSimulationProfile['mitigation'] {
    const items: ExitSimulationProfile['mitigation'] = [];
    let undocumentedTotal = 0;
    let killSwitchTotal = 0;
    for (const sysId of emp.systems) {
        const s = stats.get(sysId);
        if (!s) continue;
        undocumentedTotal += s.undocumented;
        killSwitchTotal += s.killSwitches;
    }
    if (undocumentedTotal > 0) {
        items.push({ icon: '📝', title: `Document ${undocumentedTotal} undocumented flags across ${emp.systems.slice(0, 2).join(', ')}`, priority: undocumentedTotal > 10 ? 'Critical' : 'High', est: `${Math.ceil(undocumentedTotal / 8)} days` });
    }
    if (killSwitchTotal > 0) {
        items.push({ icon: '🛡️', title: `Audit ${killSwitchTotal} kill-switch(es) for rollback ownership`, priority: 'Critical', est: '2 days' });
    }
    items.push({ icon: '🎥', title: `Record architecture walkthrough for ${emp.systems[0]}`, priority: 'High', est: '4 hours' });
    items.push({ icon: '👥', title: `Pair ${emp.name.split(' ')[0]} with 2 junior engineers for 4 weeks`, priority: 'High', est: '4 weeks' });
    return items.slice(0, 4);
}

export function getComputedExitSimulationProfiles(): ExitSimulationProfile[] {
    const stats = computeSystemStats();
    return EMPLOYEES.map((emp) => {
        const { risk, weight } = employeeRisk(emp, stats);
        return {
            id: emp.id,
            name: emp.name,
            role: emp.role,
            risk,
            systems: emp.systems,
            onboarding: onboardingEstimate(risk, weight),
            summary: buildSummary(emp, stats),
            mitigation: buildMitigation(emp, stats),
        };
    });
}

export function getComputedExitSimulationScenario(): ExitSimulationScenario {
    const stats = computeSystemStats();
    const profiles = getComputedExitSimulationProfiles();
    const totalWeight = profiles.reduce((acc, p) => acc + p.risk, 0) || 1;
    const projectedKnowledgeLoss = Math.min(100, Math.round(totalWeight / profiles.length));
    const atRiskSystems = [...stats.values()]
        .filter((s) => s.risk >= 50)
        .sort((a, b) => b.risk - a.risk)
        .slice(0, 4)
        .map((s) => s.id);
    const primaryRiskOwners = [...profiles].sort((a, b) => b.risk - a.risk).slice(0, 2).map((p) => p.name);
    const actionPlan: ExitSimulationScenario['actionPlan'] = [];
    const undocSystems = [...stats.values()].filter((s) => s.undocumented > 0).sort((a, b) => b.undocumented - a.undocumented);
    if (undocSystems[0]) {
        actionPlan.push({ title: `Document ${undocSystems[0].undocumented} undocumented ${undocSystems[0].id} flags`, eta: `${Math.ceil(undocSystems[0].undocumented / 8)} days`, impact: 'critical' });
    }
    actionPlan.push({ title: 'Pair Platform team with junior engineers on critical systems', eta: '3 weeks', impact: 'high' });
    actionPlan.push({ title: 'Create knowledge handover deck for highest-risk systems', eta: '1 week', impact: 'high' });
    return { summary: `Simulating a senior engineering departure shows ${atRiskSystems.length} systems at risk with ${projectedKnowledgeLoss}% projected knowledge loss.`, projectedKnowledgeLoss, criticalSystems: atRiskSystems, primaryRiskOwners, actionPlan };
}

export function getComputedExitSimulationRecommendations(): ExitSimulationRecommendation[] {
    const stats = computeSystemStats();
    const recommendations: ExitSimulationRecommendation[] = [];
    const undocSystems = [...stats.values()].filter((s) => s.undocumented > 0).sort((a, b) => b.enabledUndocumented - a.enabledUndocumented);
    if (undocSystems[0]) {
        const s = undocSystems[0];
        recommendations.push({
            id: 'r-1',
            title: `Schedule a knowledge transfer for ${s.id}`,
            detail: `${s.enabledUndocumented} live undocumented flags make ${s.label} a single-point-of-failure. Run a two-day deep dive and capture flag purpose in the wiki.`,
            priority: 'critical',
            due: '3 business days',
        });
    }
    const killSwitchSystems = [...stats.values()].filter((s) => s.killSwitches > 0).sort((a, b) => b.killSwitches - a.killSwitches);
    if (killSwitchSystems[0]) {
        recommendations.push({
            id: 'r-2',
            title: 'Formalize incident runbooks for kill-switches',
            detail: `Recovery depends on instant rollback via kill-switches. Document ownership and alert details for ${killSwitchSystems[0].id}.`,
            priority: 'high',
            due: '1 week',
        });
    }
    recommendations.push({
        id: 'r-3',
        title: 'Create onboarding shadow rotations',
        detail: 'Assign backup engineers to the most critical systems and run paired shadowing sessions to reduce bus-factor.',
        priority: 'medium',
        due: '2 weeks',
    });
    return recommendations;
}

export function classifyFlagSystem(flag: FeatureFlag): string | null {
    return classifySystem(flag.name);
}

export function resetExitSimCache(): void {
    statsCache.computed = false;
    statsCache.map.clear();
}
