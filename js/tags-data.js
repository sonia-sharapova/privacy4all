// Tag metadata for every page linked from Home's content sections.
// type: one or more of "guides" | "tutorials" | "projects" | "concepts"
// difficulty: one of "beginner" | "easy" | "medium" | "hard"
const PAGE_TAGS = {
  "guides/personal-data-tracking/overview.html": { type: ["guides"], difficulty: "easy" },
  "guides/browser-privacy/browser-privacy.html": { type: ["guides", "tutorials"], difficulty: "easy" },
  "guides/communication-privacy/overview.html": { type: ["guides"], difficulty: "easy" },
  "guides/ai-security/ai-security.html": { type: ["guides", "concepts"], difficulty: "medium" },
  "guides/mobile-device-privacy/overview.html": { type: ["guides"], difficulty: "easy" },
  "guides/surveillance/surveillance.html": { type: ["guides", "concepts"], difficulty: "medium" },
  "guides/network-privacy/network-privacy.html": { type: ["guides", "concepts"], difficulty: "medium" },
  "guides/secure-os-systems/secure-os-systems.html": { type: ["guides", "tutorials"], difficulty: "hard" },
  "guides/accounts-authentication/accounts-and-authentication.html": { type: ["guides"], difficulty: "easy" },
  "advanced/vpn-vps/vpn-fundamentals.html": { type: ["guides", "concepts"], difficulty: "medium" },
  "advanced/cloud-storage-files/overview.html": { type: ["guides"], difficulty: "easy" },
  "advanced/cloud-storage-files/sharing-files-with-others.html": { type: ["guides", "tutorials"], difficulty: "medium" },
  "guides/accounts-authentication/passkeys-explained.html": { type: ["concepts"], difficulty: "easy" },
};

const TAG_LABELS = {
  type: {
    guides: "Guide",
    tutorials: "Tutorial",
    projects: "Project",
    concepts: "Concept",
  },
  difficulty: {
    beginner: "Beginner",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  },
};
