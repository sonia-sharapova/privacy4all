// Search + multiselect tag filtering for Home's Guides/Advanced/Resources cards.
// Reads PAGE_TAGS (js/tags-data.js) to badge each card and drive filtering.

const DIFFICULTY_HELP = [
  {
    level: "Easy",
    desc: "little/no experience with computers",
    example: "using apps, browsing the web, basic settings",
  },
  {
    level: "Medium",
    desc: "have computer knowledge but new to privacy",
    example: "command-line, operating systems, hardware",
  },
  {
    level: "Hard",
    desc: "low-level CS experience, experience with cybersecurity",
    example: "understand servers, know cybersecurity jargon, experience building PCs",
  },
];

function getCardHref(card) {
  const a = card.querySelector(":scope > a");
  return a ? a.getAttribute("href") : null;
}

function getCardTags(card) {
  const href = getCardHref(card);
  if (!href || typeof PAGE_TAGS === "undefined") return null;
  return PAGE_TAGS[href] || null;
}

function renderBadges(card) {
  const tags = getCardTags(card);
  if (!tags) return;
  const body = card.querySelector(".card-body");
  if (!body) return;

  const badgeRow = document.createElement("div");
  badgeRow.className = "tag-badges";

  for (const t of tags.type) {
    const span = document.createElement("span");
    span.className = `tag-badge tag-badge-type tag-badge-${t}`;
    span.textContent = TAG_LABELS.type[t] || t;
    badgeRow.appendChild(span);
  }

  if (tags.difficulty) {
    const span = document.createElement("span");
    span.className = `tag-badge tag-badge-difficulty tag-badge-${tags.difficulty}`;
    span.textContent = TAG_LABELS.difficulty[tags.difficulty] || tags.difficulty;
    badgeRow.appendChild(span);
  }

  body.appendChild(badgeRow);
}

function buildFilterBar(allCards) {
  const bar = document.createElement("div");
  bar.className = "filter-bar";

  const searchWrap = document.createElement("div");
  searchWrap.className = "filter-search";
  searchWrap.innerHTML = `
    <input type="search" id="site-search" placeholder="Search pages..." aria-label="Search pages">
  `;

  const typeGroup = buildFilterGroup("Type", "type", ["guides", "tutorials", "projects", "concepts"]);
  const difficultyGroup = buildFilterGroup(
    "Difficulty",
    "difficulty",
    ["beginner", "easy", "medium", "hard"],
    true
  );

  bar.appendChild(searchWrap);
  bar.appendChild(typeGroup);
  bar.appendChild(difficultyGroup);

  return bar;
}

function buildFilterGroup(label, key, values, withHelp) {
  const group = document.createElement("div");
  group.className = "filter-group";

  const heading = document.createElement("div");
  heading.className = "filter-group-heading";
  heading.innerHTML = `<span>${label}</span>`;

  if (withHelp) {
    const help = document.createElement("button");
    help.type = "button";
    help.className = "filter-help-btn";
    help.setAttribute("aria-label", "What do difficulty levels mean?");
    help.textContent = "i";

    const tooltip = document.createElement("div");
    tooltip.className = "filter-help-tooltip";
    tooltip.innerHTML = `<p class="filter-help-intro">Each page has a difficulty level corresponding to the minimum level of technical experience the viewer has:</p>` +
      DIFFICULTY_HELP.map(
        (d) => `<p><strong>${d.level}</strong> &mdash; ${d.desc}<br><span class="filter-help-example">ex: ${d.example}</span></p>`
      ).join("");

    help.addEventListener("click", (e) => {
      e.stopPropagation();
      tooltip.classList.toggle("visible");
    });
    document.addEventListener("click", () => tooltip.classList.remove("visible"));
    tooltip.addEventListener("click", (e) => e.stopPropagation());

    heading.appendChild(help);
    heading.appendChild(tooltip);
  }

  const pills = document.createElement("div");
  pills.className = "filter-pills";
  for (const value of values) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "filter-pill";
    pill.dataset.filterKey = key;
    pill.dataset.filterValue = value;
    pill.textContent = TAG_LABELS[key][value] || value;
    pill.setAttribute("aria-pressed", "false");
    pills.appendChild(pill);
  }

  group.appendChild(heading);
  group.appendChild(pills);
  return group;
}

function applyFilters(allCards, activeFilters, searchTerm) {
  const term = searchTerm.trim().toLowerCase();

  for (const card of allCards) {
    const tags = getCardTags(card);
    const title = card.querySelector("h3")?.textContent.toLowerCase() || "";
    const desc = card.querySelector(".card-body p")?.textContent.toLowerCase() || "";

    const matchesSearch = !term || title.includes(term) || desc.includes(term);

    const typeFilters = activeFilters.type;
    const matchesType =
      typeFilters.size === 0 || (tags && tags.type.some((t) => typeFilters.has(t)));

    const difficultyFilters = activeFilters.difficulty;
    const matchesDifficulty =
      difficultyFilters.size === 0 || (tags && difficultyFilters.has(tags.difficulty));

    const visible = matchesSearch && matchesType && matchesDifficulty;
    card.style.display = visible ? "" : "none";
  }
}

function initHomeFilter() {
  const guidesGrid = document.querySelector("#guides .card-grid");
  const advancedGrid = document.querySelector("#advanced .card-grid");
  if (!guidesGrid) return;

  const allCards = [
    ...guidesGrid.querySelectorAll(":scope > li.card"),
    ...(advancedGrid ? advancedGrid.querySelectorAll(":scope > li.card") : []),
  ];

  for (const card of allCards) {
    renderBadges(card);
  }

  const filterBar = buildFilterBar(allCards);
  const guidesSection = document.getElementById("guides");
  guidesSection.parentElement.insertBefore(filterBar, guidesSection);

  const activeFilters = { type: new Set(), difficulty: new Set() };
  const searchInput = filterBar.querySelector("#site-search");

  filterBar.querySelectorAll(".filter-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const key = pill.dataset.filterKey;
      const value = pill.dataset.filterValue;
      const set = activeFilters[key];
      if (set.has(value)) {
        set.delete(value);
        pill.classList.remove("active");
        pill.setAttribute("aria-pressed", "false");
      } else {
        set.add(value);
        pill.classList.add("active");
        pill.setAttribute("aria-pressed", "true");
      }
      applyFilters(allCards, activeFilters, searchInput.value);
    });
  });

  searchInput.addEventListener("input", () => {
    applyFilters(allCards, activeFilters, searchInput.value);
  });
}

document.addEventListener("DOMContentLoaded", initHomeFilter);
