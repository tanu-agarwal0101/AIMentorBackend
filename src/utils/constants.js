export const ACHIEVEMENTS_SEED = [
  {
    title: "Consistent Learner",
    description: "Maintained a 3-day coding streak.",
    category: "STREAK",
    rarity: "COMMON",
    visibility: "PUBLIC",
    icon: "🔥",
    xpReward: 100,
    maxProgress: 3
  },
  {
    title: "Dedicated Habit",
    description: "Maintained a 7-day coding streak.",
    category: "STREAK",
    rarity: "RARE",
    visibility: "PUBLIC",
    icon: "⚡",
    xpReward: 250,
    maxProgress: 7
  },
  {
    title: "Unstoppable Momentum",
    description: "Maintained a 14-day coding streak.",
    category: "STREAK",
    rarity: "EPIC",
    visibility: "PUBLIC",
    icon: "☀️",
    xpReward: 500,
    maxProgress: 14
  },
  {
    title: "Phoenix Rise",
    description: "Maintained a 30-day coding streak.",
    category: "STREAK",
    rarity: "LEGENDARY",
    visibility: "PUBLIC",
    icon: "🐦",
    xpReward: 1000,
    maxProgress: 30
  },

  // CODING
  {
    title: "First Blood",
    description: "Solved your first coding problem.",
    category: "CODING",
    rarity: "COMMON",
    visibility: "PUBLIC",
    icon: "⚔️",
    xpReward: 50,
    maxProgress: 1
  },
  {
    title: "Algorithm Apprentice",
    description: "Solved 5 coding problems in the Arena.",
    category: "CODING",
    rarity: "COMMON",
    visibility: "PUBLIC",
    icon: "🛡️",
    xpReward: 150,
    maxProgress: 5
  },
  {
    title: "Arena Challenger",
    description: "Solved 20 coding problems in the Arena.",
    category: "CODING",
    rarity: "RARE",
    visibility: "PUBLIC",
    icon: "🏹",
    xpReward: 400,
    maxProgress: 20
  },
  {
    title: "Arena Warrior",
    description: "Solved 50 coding problems in the Arena.",
    category: "CODING",
    rarity: "EPIC",
    visibility: "PUBLIC",
    icon: "🗡️",
    xpReward: 1000,
    maxProgress: 50
  },
  {
    title: "Arena Grandmaster",
    description: "Solved 100 coding problems in the Arena.",
    category: "CODING",
    rarity: "LEGENDARY",
    visibility: "PUBLIC",
    icon: "👑",
    xpReward: 2000,
    maxProgress: 100
  },

  // ROADMAP / BUILDER
  {
    title: "Hello World",
    description: "Completed your first roadmap task.",
    category: "ROADMAP",
    rarity: "COMMON",
    visibility: "PUBLIC",
    icon: "⚙️",
    xpReward: 50,
    maxProgress: 1
  },
  {
    title: "Milestone Climber",
    description: "Completed 10 tasks in your learning roadmaps.",
    category: "ROADMAP",
    rarity: "COMMON",
    visibility: "PUBLIC",
    icon: "🧗",
    xpReward: 200,
    maxProgress: 10
  },
  {
    title: "Frontend Foundations Complete",
    description: "Completed 30 tasks in your learning roadmaps.",
    category: "ROADMAP",
    rarity: "RARE",
    visibility: "PUBLIC",
    icon: "🎨",
    xpReward: 500,
    maxProgress: 30
  },
  {
    title: "Full Stack Architect",
    description: "Completed 60 tasks in your learning roadmaps.",
    category: "ROADMAP",
    rarity: "EPIC",
    visibility: "PUBLIC",
    icon: "🏛️",
    xpReward: 1000,
    maxProgress: 60
  },
  {
    title: "Visionary Maker",
    description: "Completed 100 tasks in your learning roadmaps.",
    category: "ROADMAP",
    rarity: "LEGENDARY",
    visibility: "PUBLIC",
    icon: "👁️",
    xpReward: 2000,
    maxProgress: 100
  }
];

export const BADGE_STAGES_SEED = [
  { badgeType: "STREAK", stageOrder: 1, name: "Spark", requirement: 3, xpReward: 100, icon: "🔥", description: "Your coding journey begins with a single spark." },
  { badgeType: "STREAK", stageOrder: 2, name: "Flame", requirement: 7, xpReward: 200, icon: "💥", description: "You are building a consistent coding habit." },
  { badgeType: "STREAK", stageOrder: 3, name: "Bonfire", requirement: 14, xpReward: 350, icon: "🏕️", description: "Your dedication is burning bright." },
  { badgeType: "STREAK", stageOrder: 4, name: "Inferno", requirement: 21, xpReward: 500, icon: "🌋", description: "Nothing can stop your learning momentum." },
  { badgeType: "STREAK", stageOrder: 5, name: "Phoenix", requirement: 30, xpReward: 1000, icon: "🦅", description: "You have risen as a true coding master." },

  // CODING
  { badgeType: "CODING", stageOrder: 1, name: "Apprentice", requirement: 5, xpReward: 150, icon: "🤺", description: "First steps in the coding arena." },
  { badgeType: "CODING", stageOrder: 2, name: "Challenger", requirement: 20, xpReward: 300, icon: "⚔️", description: "Taking on harder practice challenges." },
  { badgeType: "CODING", stageOrder: 3, name: "Warrior", requirement: 50, xpReward: 600, icon: "🛡️", description: "A seasoned veteran of the algorithm arena." },
  { badgeType: "CODING", stageOrder: 4, name: "Champion", requirement: 100, xpReward: 1200, icon: "🎖️", description: "One of the absolute top minds in coding." },
  { badgeType: "CODING", stageOrder: 5, name: "Grandmaster", requirement: 250, xpReward: 2500, icon: "🏆", description: "Legendary status achieved in software engineering." },

  // BUILDER
  { badgeType: "BUILDER", stageOrder: 1, name: "Maker", requirement: 5, xpReward: 100, icon: "🛠️", description: "Building small components and learning basics." },
  { badgeType: "BUILDER", stageOrder: 2, name: "Creator", requirement: 15, xpReward: 250, icon: "🏗️", description: "Putting concepts together to build larger apps." },
  { badgeType: "BUILDER", stageOrder: 3, name: "Builder", requirement: 30, xpReward: 500, icon: "🧱", description: "Creating full application modules and roadmaps." },
  { badgeType: "BUILDER", stageOrder: 4, name: "Architect", requirement: 60, xpReward: 1000, icon: "📐", description: "Structuring scalable software systems." },
  { badgeType: "BUILDER", stageOrder: 5, name: "Visionary", requirement: 100, xpReward: 2000, icon: "🔮", description: "Unlocking advanced architecture and product design." }
];