// ========================================
// LEVEL UTILITIES - Shared Level System
// ========================================

// Level tiers with colors and effects
export const LEVEL_TIERS = [
  {
    minLevel: 1,
    name: 'Beginner',
    colors: {
      badge: 'linear-gradient(135deg, #6b7280, #4b5563)',
      progress: 'linear-gradient(90deg, #6b7280, #9ca3af)',
      text: '#6b7280',
      glow: 'none'
    },
    effects: []
  },
  {
    minLevel: 3,
    name: 'Rookie',
    colors: {
      badge: 'linear-gradient(135deg, #22c55e, #16a34a)',
      progress: 'linear-gradient(90deg, #22c55e, #4ade80)',
      text: '#22c55e',
      glow: 'none'
    },
    effects: []
  },
  {
    minLevel: 5,
    name: 'Regular',
    colors: {
      badge: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      progress: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
      text: '#3b82f6',
      glow: 'none'
    },
    effects: []
  },
  {
    minLevel: 10,
    name: 'Veteran',
    colors: {
      badge: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      progress: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
      text: '#8b5cf6',
      glow: '0 0 10px rgba(139, 92, 246, 0.3)'
    },
    effects: ['glow-pulse']
  },
  {
    minLevel: 15,
    name: 'Elite',
    colors: {
      badge: 'linear-gradient(135deg, #f59e0b, #d97706)',
      progress: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
      text: '#f59e0b',
      glow: '0 0 15px rgba(245, 158, 11, 0.4)'
    },
    effects: ['glow-pulse']
  },
  {
    minLevel: 20,
    name: 'Champion',
    colors: {
      badge: 'linear-gradient(135deg, #ef4444, #dc2626)',
      progress: 'linear-gradient(90deg, #ef4444, #f87171)',
      text: '#ef4444',
      glow: '0 0 20px rgba(239, 68, 68, 0.5)'
    },
    effects: ['glow-pulse', 'fire-glow']
  },
  {
    minLevel: 30,
    name: 'Master',
    colors: {
      badge: 'linear-gradient(135deg, #ec4899, #db2777)',
      progress: 'linear-gradient(90deg, #ec4899, #f472b6)',
      text: '#ec4899',
      glow: '0 0 25px rgba(236, 72, 153, 0.5)'
    },
    effects: ['glow-pulse', 'shimmer']
  },
  {
    minLevel: 50,
    name: 'Grandmaster',
    colors: {
      badge: 'linear-gradient(135deg, #14b8a6, #0d9488, #06b6d4)',
      progress: 'linear-gradient(90deg, #14b8a6, #2dd4bf, #06b6d4)',
      text: '#14b8a6',
      glow: '0 0 30px rgba(20, 184, 166, 0.6)'
    },
    effects: ['glow-pulse', 'shimmer', 'rainbow-border']
  },
  {
    minLevel: 100,
    name: 'Legend',
    colors: {
      badge: 'linear-gradient(135deg, #fbbf24, #f59e0b, #ef4444, #ec4899)',
      progress: 'linear-gradient(90deg, #fbbf24, #f59e0b, #ef4444, #ec4899)',
      text: '#fbbf24',
      glow: '0 0 40px rgba(251, 191, 36, 0.7)'
    },
    effects: ['glow-pulse', 'shimmer', 'rainbow-border', 'legendary']
  }
];

// XP per level constant
export const XP_PER_LEVEL = 200;

// Get tier for a given level
export function getTierForLevel(level) {
  let tier = LEVEL_TIERS[0];
  for (const t of LEVEL_TIERS) {
    if (level >= t.minLevel) {
      tier = t;
    } else {
      break;
    }
  }
  return tier;
}

// Calculate level from total XP
export function calculateLevel(totalXP) {
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const currentLevelXP = totalXP % XP_PER_LEVEL;
  const progressPercent = (currentLevelXP / XP_PER_LEVEL) * 100;
  
  return {
    level,
    currentXP: currentLevelXP,
    xpNeeded: XP_PER_LEVEL,
    progressPercent,
    totalXP,
    tier: getTierForLevel(level)
  };
}

// Get level badge color based on level
export function getLevelBadgeColor(level) {
  const tier = getTierForLevel(level);
  return tier.colors.badge;
}

// Get level text color based on level
export function getLevelTextColor(level) {
  const tier = getTierForLevel(level);
  return tier.colors.text;
}

// Create a level badge HTML element
export function createLevelBadgeHTML(level, size = 'small') {
  const tier = getTierForLevel(level);
  const sizeClass = size === 'small' ? 'level-badge-sm' : size === 'large' ? 'level-badge-lg' : 'level-badge-md';
  const effects = tier.effects.join(' ');
  
  return `
    <div class="level-badge ${sizeClass} ${effects}" 
         style="background: ${tier.colors.badge}; box-shadow: ${tier.colors.glow || 'none'};"
         title="Level ${level} - ${tier.name}">
      ${level}
    </div>
  `;
}

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.LevelUtils = {
    LEVEL_TIERS,
    XP_PER_LEVEL,
    getTierForLevel,
    calculateLevel,
    getLevelBadgeColor,
    getLevelTextColor,
    createLevelBadgeHTML
  };
}
