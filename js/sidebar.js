// Sidebar: top-level groups (Quick Links, Guides, Resources) mirroring Home's
// sections, each collapsible. Within Guides, topics are a second collapsible
// level. Only the group/topic containing the current page starts open.
const SITE_TREE = [
  {
    label: "Quick Links",
    pages: [
      { label: "Privacy Checklist", href: null },
      { label: "Test your privacy", href: null },
      { label: "Common Security Attacks", href: null },
    ],
  },
  {
    label: "Guides",
    categories: [
      {
        label: "Personal Data & Tracking",
        pages: [
          { label: "Overview", href: "/guides/personal-data-tracking/overview.html" },
          { label: "Browser Fingerprinting and Tracking", href: "/guides/personal-data-tracking/browser-fingerprinting-and-tracking.html" },
        ],
      },
      {
        label: "Browser Privacy",
        pages: [
          { label: "Browser Privacy", href: "/guides/browser-privacy/browser-privacy.html" },
        ],
      },
      {
        label: "Communication Privacy",
        pages: [
          { label: "Overview", href: "/guides/communication-privacy/overview.html" },
          { label: "Email Alternatives and Aliasing", href: "/guides/communication-privacy/email-alternatives-and-aliasing.html" },
          { label: "VoIP and Calling Privacy", href: "/guides/communication-privacy/voip-and-calling-privacy.html" },
        ],
      },
      {
        label: "AI Security",
        pages: [
          { label: "AI Security", href: "/guides/ai-security/ai-security.html" },
        ],
      },
      {
        label: "Mobile & Device Privacy",
        pages: [
          { label: "Overview", href: "/guides/mobile-device-privacy/overview.html" },
          { label: "Choosing a More Private Phone", href: "/guides/mobile-device-privacy/choosing-a-more-private-phone.html" },
          { label: "Rendering Whatever Phone You Actually Have", href: "/guides/mobile-device-privacy/rendering-whatever-phone-you-actually-have.html" },
          { label: "Interrogating the Data Actually Stored on Your Device", href: "/guides/mobile-device-privacy/interrogating-the-data-actually-stored-on-your-device.html" },
        ],
      },
      {
        label: "Surveillance",
        pages: [
          { label: "Surveillance", href: "/guides/surveillance/surveillance.html" },
        ],
      },
      {
        label: "Network Privacy",
        pages: [
          { label: "Network Privacy", href: "/guides/network-privacy/network-privacy.html" },
        ],
      },
      {
        label: "Secure OS Systems",
        pages: [
          { label: "Secure OS Systems", href: "/guides/secure-os-systems/secure-os-systems.html" },
        ],
      },
      {
        label: "Accounts & Authentication",
        pages: [
          { label: "Accounts and Authentication", href: "/guides/accounts-authentication/accounts-and-authentication.html" },
          { label: "Passkeys Explained", href: "/guides/accounts-authentication/passkeys-explained.html" },
        ],
      },
      {
        label: "VPN & VPS",
        pages: [
          { label: "VPN Fundamentals", href: "/advanced/vpn-vps/vpn-fundamentals.html" },
          { label: "VPS Fundamentals", href: "/advanced/vpn-vps/vps-fundamentals.html" },
          { label: "Where VPNs and VPS Meet", href: "/advanced/vpn-vps/where-vpns-and-vps-meet.html" },
        ],
      },
      {
        label: "Cloud Storage & Files",
        pages: [
          { label: "Overview", href: "/advanced/cloud-storage-files/overview.html" },
          { label: "Sharing Files With Others", href: "/advanced/cloud-storage-files/sharing-files-with-others.html" },
          { label: "Local Backup + Encryption Basics", href: "/advanced/cloud-storage-files/local-backup-and-encryption-basics.html" },
        ],
      },
    ],
  },
  {
    label: "Resources",
    pages: [
      { label: "VPNs and ISPs", href: null },
      { label: "Browsers", href: null },
      { label: "Messaging", href: null },
      { label: "Password Managers", href: null },
      { label: "Browser Extensions", href: null },
      { label: "File Storage", href: null },
      { label: "Operating Systems", href: null },
      { label: "Wi-Fi & Networking", href: null },
      { label: "Toolkits", href: null },
    ],
  },
];

function pageMatches(page, currentPath) {
  return page.href && page.href === currentPath;
}

function categoryContainsCurrent(category, currentPath) {
  return category.pages.some((p) => pageMatches(p, currentPath));
}

function groupContainsCurrent(group, currentPath) {
  if (group.pages) return group.pages.some((p) => pageMatches(p, currentPath));
  if (group.categories) return group.categories.some((c) => categoryContainsCurrent(c, currentPath));
  return false;
}

function renderPageLink(page, currentPath) {
  const li = document.createElement("li");
  li.className = "tree-item";
  const a = document.createElement("a");
  a.className = "tree-file";
  if (page.href) {
    a.href = page.href;
    if (pageMatches(page, currentPath)) a.classList.add("active");
  } else {
    a.href = "#";
    a.classList.add("tree-file-disabled");
    a.addEventListener("click", (e) => e.preventDefault());
  }
  a.innerHTML = `<span>${page.label}</span>`;
  li.appendChild(a);
  return li;
}

function renderCollapsible(label, open, buildBody) {
  const li = document.createElement("li");
  li.className = "tree-item";

  const details = document.createElement("details");
  if (open) details.open = true;

  const summary = document.createElement("summary");
  summary.className = "tree-dir";
  summary.innerHTML = `<svg class="tree-caret" viewBox="0 0 16 16" width="12" height="12"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
    <span>${label}</span>`;
  details.appendChild(summary);
  details.appendChild(buildBody());

  li.appendChild(details);
  return li;
}

function renderCategory(category, currentPath) {
  return renderCollapsible(category.label, categoryContainsCurrent(category, currentPath), () => {
    const pageList = document.createElement("ul");
    pageList.className = "tree-list";
    for (const page of category.pages) {
      pageList.appendChild(renderPageLink(page, currentPath));
    }
    return pageList;
  });
}

function renderGroup(group, currentPath) {
  return renderCollapsible(group.label, groupContainsCurrent(group, currentPath), () => {
    const list = document.createElement("ul");
    list.className = "tree-list";
    if (group.pages) {
      for (const page of group.pages) {
        list.appendChild(renderPageLink(page, currentPath));
      }
    } else if (group.categories) {
      for (const category of group.categories) {
        list.appendChild(renderCategory(category, currentPath));
      }
    }
    return list;
  });
}

function renderTree(currentPath) {
  const ul = document.createElement("ul");
  ul.className = "tree-list tree-root";
  for (const group of SITE_TREE) {
    ul.appendChild(renderGroup(group, currentPath));
  }
  return ul;
}

function initSidebar() {
  const mount = document.getElementById("file-sidebar");
  if (!mount) return;
  const currentPath = window.location.pathname === "/" ? "/index.html" : window.location.pathname;
  mount.innerHTML = `<div class="sidebar-header">
      <span class="sidebar-repo-name">privacy4all</span>
    </div>`;
  mount.appendChild(renderTree(currentPath));

  const toggle = document.getElementById("sidebar-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });
  }
}

document.addEventListener("DOMContentLoaded", initSidebar);
