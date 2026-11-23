/* privacy4all — data-driven page renderer.
 *
 * Every page is a thin HTML shell (<body data-page="id" data-root="../">) that
 * loads this script. Content comes from JSON:
 *   data/site.json        sections, page names, sidebar   (server copy, edited in admin)
 *   data/pages/<id>.json  one page's subsections + blocks (server copy, edited in admin)
 * with seed/… as the fallback when a data/ file has not been saved yet.
 *
 * A page's name lives only in site.json (pages[id].title), so renaming it
 * anywhere renames it everywhere: home tiles, sidebar, breadcrumbs, guide maps,
 * the page heading and any "page:<id>" link.
 *
 * All stored URLs are site-root-relative ("assets/x.png", "page:password-check").
 * When the admin session is active, js/p4a-admin.js is loaded and decorates the
 * rendered page with edit controls (see P4A.afterRender).
 */
(function () {
  'use strict';

  var body = document.body;
  var ROOT = body.getAttribute('data-root') || '';
  var VERSION = '20261124';
  var pageId = body.getAttribute('data-page') || '';
  if (pageId === '?') {
    pageId = (new URLSearchParams(location.search).get('id') || '').replace(/[^a-z0-9-]/g, '');
  }

  var P = window.P4A = {
    root: ROOT,
    version: VERSION,
    pageId: pageId,
    site: null,
    page: null,
    isAdmin: false,
    editing: false,
    blocks: {},
    widgets: {},
    afterRender: [],
    api: ROOT + 'api/',
    loginUrl: '/admin/login.html',
    sessionUrl: '/admin/check-session.php'
  };

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  P.esc = esc;

  function isExternal(u) { return /^(https?:)?\/\//i.test(u || ''); }

  // Resolve a stored URL to one usable from this page.
  function url(u) {
    if (!u) return '#';
    u = String(u);
    var m = u.match(/^page:([a-z0-9-]+)(#.*)?$/);
    if (m) return href(m[1]) + (m[2] || '');
    if (/^(#|\?|\/|[a-z][a-z0-9+.-]*:)/i.test(u)) {
      if (u.charAt(0) === '#' && pageId !== 'home' && /^#(quick-check|privacy-security|projects|additional-resources|contact|about)$/.test(u)) {
        return ROOT + 'index.html' + u;
      }
      return u;
    }
    return ROOT + u;
  }
  P.url = url;

  function href(id) {
    if (!id || id === 'home') return ROOT + 'index.html';
    var pg = P.site && P.site.pages[id];
    if (pg && pg.link) return url(pg.link);
    if (pg && pg.path) return ROOT + pg.path;
    return ROOT + 'page.html?id=' + encodeURIComponent(id);
  }
  P.href = href;

  function linkAttrs(u) {
    return 'href="' + esc(url(u)) + '"' + (isExternal(u) ? ' target="_blank" rel="noopener"' : '');
  }
  P.linkAttrs = linkAttrs;

  function title(id) {
    if (id === 'home') return 'Home';
    var pg = P.site && P.site.pages[id];
    return pg ? pg.title : id;
  }
  P.title = title;

  // Rich text from the editor: resolve relative/page: links and open external
  // links in a new tab. Stored HTML is only ever written by the admin.
  var tpl = document.createElement('template');
  function rich(html) {
    if (!html) return '';
    tpl.innerHTML = String(html);
    var els = tpl.content.querySelectorAll('[href],[src]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      ['href', 'src'].forEach(function (a) {
        var v = el.getAttribute(a);
        if (v == null) return;
        el.setAttribute(a, url(v));
        if (a === 'href' && isExternal(v) && !el.hasAttribute('target')) {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener');
        }
      });
    }
    return tpl.innerHTML;
  }
  P.rich = rich;

  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  }
  P.slug = slug;

  function hash(s) {
    var h = 0; s = String(s);
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return (h >>> 0).toString(36);
  }

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  function getJSON(path) {
    return fetch(ROOT + path + '?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function load(name) {
    return getJSON('data/' + name + '.json').catch(function () { return getJSON('seed/' + name + '.json'); });
  }
  P.load = load;

  /* ---------- structure queries ---------- */

  function parentOf(id) {
    var pages = P.site.pages;
    for (var k in pages) {
      if ((pages[k].parts || []).indexOf(id) !== -1) return k;
    }
    return null;
  }
  P.parentOf = parentOf;

  function sectionOf(id) {
    var top = id, p;
    while ((p = parentOf(top)) && p !== id) top = p;
    var secs = P.site.sections;
    for (var i = 0; i < secs.length; i++) {
      if ((secs[i].items || []).indexOf(top) !== -1) return secs[i];
    }
    return null;
  }
  P.sectionOf = sectionOf;

  function img(src, cls, alt) {
    if (!src) return '';
    return '<img src="' + esc(url(src)) + '" alt="' + esc(alt || '') + '"' + (cls ? ' class="' + cls + '"' : '') + ' loading="lazy">';
  }

  /* ---------- chrome: sidebar + header + footer ---------- */

  function tocEntries() {
    if (pageId === 'home') {
      return P.site.sections.map(function (s) { return { href: '#' + s.id, label: s.title }; });
    }
    return (P.page.subsections || []).filter(function (s) { return s.title && !s.hideFromToc; })
      .map(function (s) { return { href: '#' + s.id, label: s.title }; });
  }

  function sidebarLink(item) {
    if (item.page) {
      return '<a href="' + esc(href(item.page)) + '" class="p4a-8">' + esc(title(item.page)) + '</a>';
    }
    if (item.section) {
      var sec = P.site.sections.filter(function (s) { return s.id === item.section; })[0];
      return sec ? '<a href="' + esc(url('#' + sec.id)) + '" class="p4a-8">' + esc(item.label || sec.title) + '</a>' : '';
    }
    return '<a ' + linkAttrs(item.url) + ' class="p4a-8">' + esc(item.label || item.url) + '</a>';
  }

  function sidebarGroups() {
    var out = '';
    var where = pageId === 'home' ? 'home' : 'pages';
    (P.site.sidebar && P.site.sidebar.groups || []).forEach(function (g, gi) {
      var showOn = g.showOn || 'all';
      if (showOn !== 'all' && showOn !== where) return;
      var items = g.items || [];
      if (g.fromSection) {
        var sec = P.site.sections.filter(function (s) { return s.id === g.fromSection; })[0];
        items = sec ? (sec.items || []).map(function (id) { return { page: id }; }) : [];
      }
      if (!items.length) return;
      out += '<div class="p4a-4" data-sidebar-group="' + gi + '">' + esc(g.label) + '</div><div class="p4a-7">' +
        items.map(sidebarLink).join('') + '</div>';
    });
    if (pageId !== 'home') {
      var own = (P.site.pages[pageId] || {}).parts || [];
      if (own.length) {
        out += '<div class="p4a-4">PARTS</div><div class="p4a-7">' +
          own.map(function (id) { return sidebarLink({ page: id }); }).join('') + '</div>';
      }
      var rel = (P.site.pages[pageId] || {}).related;
      var parent = parentOf(pageId);
      if (!rel || !rel.length) {
        rel = parent ? [parent].concat((P.site.pages[parent].parts || []).filter(function (x) { return x !== pageId; })) : [];
      }
      if (rel.length) {
        out += '<div class="p4a-4">RELATED</div><div class="p4a-7">' +
          rel.map(function (id) { return sidebarLink({ page: id }); }).join('') + '</div>';
      }
    }
    return out;
  }

  function chrome() {
    var site = P.site;
    var toc = tocEntries();
    var isHome = pageId === 'home';
    var crumbs = '';
    if (!isHome) {
      var chain = [], p = parentOf(pageId), guard = 0;
      while (p && guard++ < 5) { chain.unshift(p); p = parentOf(p); }
      crumbs = '<a href="' + esc(href('home')) + '" style="color:inherit;">Home</a>' +
        chain.map(function (id) { return ' / <a href="' + esc(href(id)) + '" style="color:inherit;">' + esc(title(id)) + '</a>'; }).join('') +
        ' / ' + esc(title(pageId));
    }
    var nav = (site.nav || []).map(function (n) {
      return '<a ' + linkAttrs(n.url) + ' class="p4a-o">' + esc(n.label) + '</a>';
    }).join('');
    var cats = '<option value="All">All</option>' + site.sections.filter(function (s) { return s.layout !== 'resources'; })
      .map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.title) + '</option>'; }).join('');

    return '' +
      '<div class="p4a-0"><div class="p4a-1">' +
      '<aside class="p4a-2">' +
        (isHome ? '<div class="p4a-3">p4a</div>' : '<a href="' + esc(href('home')) + '" class="p4a-3">p4a</a>') +
        (toc.length ? '<div class="p4a-4">ON THIS PAGE</div><nav class="p4a-5" id="p4a-toc">' +
          toc.map(function (t) { return '<a href="' + esc(t.href) + '" class="p4a-6">' + esc(t.label) + '</a>'; }).join('') + '</nav>' : '') +
        '<div id="p4a-sidebar-groups">' + sidebarGroups() + '</div>' +
        '<div class="p4a-4">THEME</div>' +
        '<div class="p4a-theme">' +
          '<label><input type="checkbox" id="theme-night">Night mode</label>' +
          '<label><input type="checkbox" id="theme-contrast">High contrast</label>' +
          '<label><input type="checkbox" id="theme-backdrop" checked>Backdrop visibility</label>' +
          '<label class="p4a-theme-range" for="theme-glass">Glass' +
            '<input type="range" id="theme-glass" min="0" max="150" step="5" value="100" aria-describedby="theme-glass-ends">' +
            '<span class="p4a-theme-range-ends" id="theme-glass-ends" aria-hidden="true"><span>CLEAR</span><span>FROSTED</span></span>' +
          '</label>' +
        '</div>' +
      '</aside>' +
      '<div class="p4a-a"><div class="p4a-b"></div>' +
      '<header class="p4a-c"><div class="p4a-i">' +
        '<div class="p4a-d"><form class="p4a-e" id="p4a-search" role="search">' +
          '<input type="text" placeholder="Search topics..." id="search-input" class="p4a-f" autocomplete="off">' +
          '<select id="search-category" class="p4a-g">' + cats + '</select>' +
          '<button type="submit" id="search-go" class="p4a-h">Go</button>' +
        '</form></div>' +
        '<div class="p4a-j"><div>' +
          (isHome ? '<div class="p4a-k">privacy4all</div><p class="p4a-l" data-edit-site="tagline">' + rich(site.tagline) + '</p>'
                  : '<a href="' + esc(href('home')) + '" class="p4a-k" style="text-decoration:none; color:inherit;">privacy4all</a><p class="p4a-l">' + crumbs + '</p>') +
          '<div id="search-message" class="p4a-m"></div>' +
        '</div><nav class="p4a-n">' + nav + '</nav></div>' +
      '</div></header>' +
      '<div class="p4a-p"><main class="p4a-q" id="p4a-main"></main>' +
      '<footer id="contact" class="p4a-1q">' + esc(site.footer || '') +
        '<span class="p4a-admin-entry">' + (P.isAdmin ? '' : '<a href="' + esc(P.loginUrl + '?redirect=' + encodeURIComponent(location.pathname + location.search)) + '" class="p4a-admin-login">admin</a>') + '</span>' +
      '</footer></div>' +
      '</div></div></div>';
  }

  /* ---------- home ---------- */

  function tileImage(pg, cls) {
    return pg.image ? img(pg.image, pg.imageFit === 'contain' ? 'p4a-y' : 'p4a-v') : '<span class="p4a-v p4a-tile-blank"></span>';
  }

  var HOME = {
    quick: function (sec) {
      return (sec.description ? '<div class="p4a-21 p4a-rich p4a-sec-desc">' + rich(sec.description) + '</div>' : '') +
        '<div class="p4a-t">' + (sec.items || []).map(function (id, i) {
          var pg = P.site.pages[id]; if (!pg) return '';
          return '<a href="' + esc(href(id)) + '" class="p4a-u" data-item="' + i + '">' + tileImage(pg) +
            '<div><div class="p4a-w">' + esc(pg.title) + '</div><div class="p4a-x">' + esc(pg.summary || '') + '</div></div></a>';
        }).join('') + '<span class="p4a-add-slot" data-add="entry"></span></div>';
    },
    topics: function (sec) {
      return '<div class="p4a-10"><div class="p4a-11">' + (sec.items || []).map(function (id, i) {
          var pg = P.site.pages[id]; if (!pg) return '';
          var pic = pg.image ? '<div class="p4a-13">' + img(pg.image, 'p4a-14', pg.title) + '</div>'
            : '<div class="p4a-16"><div class="p4a-17">' + esc(pg.title) + '</div><div class="p4a-18"><span class="p4a-19"></span><span class="p4a-1a">' + esc(pg.summary || 'In progress') + '</span></div></div>';
          return '<a href="' + esc(href(id)) + '" id="topic-' + esc(id) + '" class="p4a-12" data-item="' + i + '">' + pic +
            '<div class="p4a-15">' + esc(pg.title.toUpperCase()) + '</div></a>';
        }).join('') + '<span class="p4a-add-slot" data-add="entry"></span></div>' +
        '<div class="p4a-1b p4a-rich p4a-sec-desc">' + rich(sec.description) + '</div></div>';
    },
    projects: function (sec) {
      return '<div class="p4a-1g"><div class="p4a-1h p4a-rich p4a-sec-desc">' + rich(sec.description) + '</div>' +
        '<div class="p4a-1j">' + (sec.items || []).map(function (id, i) {
          var pg = P.site.pages[id]; if (!pg) return '';
          return '<a href="' + esc(href(id)) + '" class="p4a-1k" data-item="' + i + '"><div class="p4a-1l">' + esc(pg.title) +
            '</div><div class="p4a-1m">' + esc(pg.summary || '') + '</div></a>';
        }).join('') + '<span class="p4a-add-slot" data-add="entry"></span></div></div>';
    },
    resources: function (sec) {
      return (sec.description ? '<div class="p4a-21 p4a-rich p4a-sec-desc">' + rich(sec.description) + '</div>' : '') +
        '<ul class="p4a-1p">' + (sec.links || []).map(function (l) {
          return '<li><a ' + linkAttrs(l.url) + '><b>' + esc(l.label) + '</b></a>' + (l.desc ? ' &mdash; ' + esc(l.desc) : '') + '</li>';
        }).join('') + '</ul>';
    }
  };

  function renderHome() {
    return P.site.sections.map(function (sec, i) {
      var fn = HOME[sec.layout] || HOME.quick;
      return '<section id="' + esc(sec.id) + '" class="' + (i === 0 ? 'p4a-r' : 'p4a-z') + ' p4a-home-sec" data-section="' + i + '">' +
        '<h2 class="p4a-s">' + esc(sec.title.toUpperCase()) + '</h2>' + fn(sec) + '</section>';
    }).join('');
  }

  /* ---------- blocks ---------- */

  function cols(n, fallback) { n = parseInt(n, 10); return n >= 1 && n <= 4 ? n : fallback; }

  var B = P.blocks;

  B.text = function (b) { return '<div class="p4a-21 p4a-rich">' + rich(b.html) + '</div>'; };

  B.subheading = function (b) {
    return b.style === 'h3'
      ? '<h3 class="p4a-20 p4a-20-tight p4a-h3">' + esc(b.text) + '</h3>'
      : '<div class="p4a-label">' + esc(b.text) + '</div>';
  };

  B.divider = function () { return '<hr class="p4a-hr">'; };

  B.checklist = function (b, ctx) {
    var items = b.items || [];
    var key = 'p4a-cl:' + pageId + ':';
    return '<div class="p4a-checklist" data-cl="' + esc(key) + '">' +
      '<div class="p4a-2e">' + (b.title ? '<h3 class="p4a-cl-title">' + esc(b.title) + '</h3>' : '<span></span>') +
      '<span class="p4a-2f" data-cl-progress>0 / ' + items.length + ' done</span></div>' +
      '<div class="p4a-2g">' + items.map(function (it) {
        var k = hash(it.text);
        var det = it.details ? '<button type="button" class="p4a-cl-more" aria-expanded="false" aria-label="More information">+</button>' : '';
        return '<div class="p4a-cl-item" data-k="' + k + '"><div class="p4a-cl-row">' +
          '<button type="button" class="p4a-2h"><span class="p4a-2i"></span><span class="p4a-2j">' + rich(it.text) + '</span></button>' + det + '</div>' +
          (it.details ? '<div class="p4a-cl-details p4a-rich" hidden>' + rich(it.details) + '</div>' : '') + '</div>';
      }).join('') + '</div></div>';
  };

  B.numbered = function (b) {
    var items = b.items || [];
    var label = b.label ? esc(b.label) + ' ' : '';
    var start = parseInt(b.start, 10) || 1;
    if (b.style === 'accordion') {
      return '<div class="bph-steps">' + items.map(function (it, i) {
        return '<details class="bph-step"' + (i === 0 && b.openFirst !== false ? ' open' : '') + '>' +
          '<summary class="bph-step-summary"><span><span class="p4a-26" style="margin:0;">' + label + (start + i) + '</span> ' +
          '<span class="bph-step-title">' + esc(it.title || '') + '</span></span></summary>' +
          '<div class="bph-step-body p4a-rich">' + rich(it.text) + '</div></details>';
      }).join('') + '</div>';
    }
    if (b.style === 'list') {
      return '<ol class="p4a-ol" start="' + start + '">' + items.map(function (it) {
        return '<li>' + (it.title ? '<b>' + esc(it.title) + '</b> ' : '') + '<span class="p4a-rich">' + rich(it.text) + '</span></li>';
      }).join('') + '</ol>';
    }
    return '<div class="p4a-grid cols-' + cols(b.cols, 4) + '">' + items.map(function (it, i) {
      var t = it.url ? '<a ' + linkAttrs(it.url) + '>' + esc(it.title || it.url) + '</a>' : esc(it.title || '');
      return '<div class="p4a-23 p4a-num-card"><div class="p4a-26 p4a-num">' + label + (start + i) + '</div><div>' +
        (t ? '<div class="p4a-24">' + t + '</div>' : '') +
        '<div class="p4a-25 p4a-rich">' + rich(it.text) + '</div></div></div>';
    }).join('') + '</div>';
  };

  function itemLabel(it) { return it.label || (/^page:/.test(it.url || '') ? title(it.url.slice(5).split('#')[0]) : it.url); }

  B.redirects = function (b) {
    var items = b.items || [];
    if (b.style === 'cards') {
      return '<div class="p4a-grid cols-' + cols(b.cols, 3) + '">' + items.map(function (it) {
        return '<div class="p4a-23 p4a-redirect-card">' + img(it.icon, 'p4a-26-icon', '') +
          '<div class="p4a-24"><a ' + linkAttrs(it.url) + ' class="p4a-plain">' + esc(itemLabel(it)) + '</a></div>' +
          (it.meta ? '<div class="p4a-meta">' + esc(it.meta) + '</div>' : '') +
          (it.desc ? '<div class="p4a-25 p4a-rich">' + rich(it.desc) + '</div>' : '') +
          '<a ' + linkAttrs(it.url) + ' class="p4a-redirect-link">' + esc(it.linkText || 'Visit') + ' &rarr;</a></div>';
      }).join('') + '</div>';
    }
    if (b.style === 'rows') {
      return '<div class="p4a-redirect-rows">' + items.map(function (it) {
        return '<div class="p4a-redirect-row">' + img(it.icon, 'p4a-26-icon', '') +
          '<div class="p4a-redirect-row-text"><div class="p4a-24">' + esc(itemLabel(it)) + '</div>' +
          (it.meta ? '<div class="p4a-meta">' + esc(it.meta) + '</div>' : '') +
          (it.desc ? '<div class="p4a-25 p4a-rich">' + rich(it.desc) + '</div>' : '') + '</div>' +
          '<a ' + linkAttrs(it.url) + ' class="p4a-glass-btn p4a-btn-redirect p4a-2a">' + esc(it.linkText || 'Open') + ' &rarr;</a></div>';
      }).join('') + '</div>';
    }
    return '<div class="p4a-29">' + items.map(function (it) {
      return '<a ' + linkAttrs(it.url) + ' class="p4a-glass-btn p4a-btn-redirect p4a-2a">' + img(it.icon, 'p4a-2a-icon', '') + esc(itemLabel(it)) + '</a>';
    }).join('') + '</div>';
  };

  B.columns = function (b) {
    var style = b.style || 'divided';
    return '<div class="p4a-grid cols-' + cols(b.cols, 3) + ' p4a-cols-' + style + '">' + (b.items || []).map(function (it) {
      var t = it.title ? (it.url ? '<a ' + linkAttrs(it.url) + ' class="p4a-plain">' + esc(it.title) + '</a>' : esc(it.title)) : '';
      if (style === 'terms') {
        return '<div class="p4a-3c p4a-col">' + (t ? '<div class="p4a-3c-title">' + t + '</div>' : '') + '<div class="p4a-25 p4a-rich">' + rich(it.html) + '</div></div>';
      }
      if (style === 'headed') {
        return '<div class="p4a-col">' + (t ? '<h3 class="p4a-col-h">' + t + '</h3><hr class="p4a-hr">' : '') + '<div class="p4a-rich p4a-col-body">' + rich(it.html) + '</div></div>';
      }
      return '<div class="' + (style === 'divided' ? 'p4a-23 ' : '') + 'p4a-col">' + (t ? '<div class="p4a-24">' + t + '</div>' : '') +
        '<div class="p4a-25 p4a-rich">' + rich(it.html) + '</div></div>';
    }).join('') + '</div>';
  };

  B.faq = function (b) {
    return '<div class="p4a-faq">' + (b.items || []).map(function (it, i) {
      return '<details class="p4a-details"' + ((i === 0 && b.openFirst) ? ' open' : '') + '><summary>' + esc(it.q) + '</summary>' +
        '<div class="p4a-rich p4a-faq-a">' + rich(it.a) + '</div></details>';
    }).join('') + '</div>';
  };

  B.resources = function (b) {
    var items = b.items || [];
    if (b.style === 'numbered') {
      return '<div class="p4a-res-num">' + items.map(function (it, i) {
        return '<p>[' + (i + 1) + '] <a ' + linkAttrs(it.url) + '>' + esc(itemLabel(it)) + '</a>' + (it.desc ? ' &mdash; ' + esc(it.desc) : '') + '</p>';
      }).join('') + '</div>';
    }
    return '<ul class="p4a-res-list">' + items.map(function (it) {
      return '<li><a ' + linkAttrs(it.url) + '><b>' + esc(itemLabel(it)) + '</b></a>' + (it.desc ? ' &mdash; ' + esc(it.desc) : '') + '</li>';
    }).join('') + '</ul>';
  };

  B.code = function (b) {
    var code = b.code || '';
    var copy = b.copy !== false;
    var label = b.label ? '<div class="p4a-code-label">' + esc(b.label) + '</div>' : '';
    if (b.style === 'inline') {
      return label + '<div class="bpe-code-row"><code>' + esc(code) + '</code>' +
        (copy ? '<button type="button" class="p4a-glass-btn bpe-copy-btn copy-btn" data-copy="' + esc(code) + '">Copy</button>' : '') + '</div>';
    }
    return label + '<div class="p4a-term">' +
      (copy ? '<button type="button" class="p4a-glass-btn p4a-term-copy copy-btn" data-copy="' + esc(code) + '">Copy</button>' : '') +
      '<pre' + (b.lang ? ' data-lang="' + esc(b.lang) + '"' : '') + '>' + esc(code) + '</pre></div>';
  };

  B.template = function (b) {
    return (b.label ? '<div class="p4a-code-label">' + esc(b.label) + '</div>' : '') +
      '<div class="tdt-box"><textarea readonly spellcheck="false">' + esc(b.text || '') + '</textarea></div>' +
      '<div class="tdt-copy-row"><button type="button" class="p4a-glass-btn bpe-copy-btn copy-btn" data-copy="' + esc(b.text || '') + '">Copy</button></div>';
  };

  B.callout = function (b) {
    return '<div class="p4a-27">' + (b.label ? '<div class="p4a-callout-label">' + esc(b.label) + '</div>' : '') +
      '<div class="p4a-rich">' + rich(b.html) + '</div></div>';
  };

  B.table = function (b) {
    var head = b.headers || [];
    return '<div class="p4a-2d' + (b.size === 'lg' ? ' p4a-2d-lg' : '') + '"><table>' +
      (head.length ? '<thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead>' : '') +
      '<tbody>' + (b.rows || []).map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + rich(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  };

  var MARK = { yes: 'Yes', part: 'Partial', no: 'No' };
  B.matrix = function (b) {
    var colsArr = b.columns || [];
    return '<div class="p4a-3m"><table><thead><tr><th scope="col"><span class="p4a-3m-label">' + esc(b.corner || 'KEY METRICS') + '</span></th>' +
      colsArr.map(function (c) {
        return '<th scope="col"' + (c.url ? ' data-href="' + esc(url(c.url)) + '"' : '') + '><a class="p4a-3m-head" ' + linkAttrs(c.url || '#') + '>' +
          img(c.icon, '', '') + '<span class="p4a-3m-name">' + esc(c.name) + '</span></a></th>';
      }).join('') + '</tr></thead><tbody>' +
      (b.rows || []).map(function (r) {
        var vals = r.values || [];
        return '<tr><th scope="row">' + esc(r.label) + '</th>' + colsArr.map(function (_, i) {
          var v = (vals[i] || 'no').trim();
          if (!MARK[v]) v = 'no';
          return '<td><span class="p4a-3m-mark ' + v + '" aria-hidden="true"></span><span class="sr-only">' + MARK[v] + '</span></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      (b.legend !== false ? '<div class="p4a-3m-legend"><span><span class="p4a-3m-mark yes" aria-hidden="true"></span>YES</span>' +
        '<span><span class="p4a-3m-mark part" aria-hidden="true"></span>PARTIAL / WITH CAVEATS</span>' +
        '<span><span class="p4a-3m-mark no" aria-hidden="true"></span>NO</span></div>' : '') +
      (b.note ? '<div class="p4a-3m-note p4a-rich">' + rich(b.note) + '</div>' : '');
  };

  B.quote = function (b) {
    var q = String(b.quote || '');
    var first = q.charAt(0), rest = q.slice(1);
    var quote = '<div class="p4a-quote-main"><p class="p4a-quote">&ldquo;<span class="p4a-dropcap">' + esc(first) + '</span>' + esc(rest) + '&rdquo;</p>' +
      (b.author ? '<p class="p4a-quote-author">&ndash; ' + esc(b.author) + '</p>' : '') + '</div>';
    var side = '';
    if (b.side === 'image' && b.image) side = '<div class="p4a-quote-side">' + img(b.image, 'p4a-quote-img', b.alt || '') + '</div>';
    if (b.side === 'text') side = '<div class="p4a-quote-side">' + (b.sideLabel ? '<div class="p4a-label-sm">' + esc(b.sideLabel) + '</div>' : '') +
      '<div class="p4a-rich p4a-quote-sidetext">' + rich(b.sideText) + '</div></div>';
    var cls = 'p4a-quote-wrap' + (side ? ' has-side' : '') + (b.sideFirst ? ' side-first' : '');
    return '<div class="' + cls + '">' + (b.sideFirst ? side + quote : quote + side) + '</div>';
  };

  B.flow = function (b) {
    var lines = b.lines || [];
    return '<div class="bph-flow">' + lines.map(function (l, i) {
      var last = i === lines.length - 1 && lines.length > 1;
      return '<div style="padding-left:' + (i * 16) + 'px;' + (last ? ' color:#2f6fed; font-weight:600;' : '') + '">' + esc(l) + '</div>';
    }).join('') + '</div>';
  };

  B.image = function (b) {
    if (!b.src) return '';
    return '<figure class="p4a-figure"' + (b.width ? ' style="max-width:' + (parseInt(b.width, 10) || 100) + '%"' : '') + '>' +
      img(b.src, '', b.alt) + (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '') + '</figure>';
  };

  B.widget = function (b) {
    var w = P.widgets[b.name];
    return w ? '<div class="p4a-widget" data-widget="' + esc(b.name) + '">' + w.html(b) + '</div>' : '';
  };

  B.html = function (b) { return '<div class="p4a-html">' + rich(b.html) + '</div>'; };

  /* Everything on a topic: every page tagged with this topic (pages[x].topics),
     optionally its own parts, plus hand-picked pages — grouped by kind. */
  var KINDS = [
    ['guide', 'Guides'], ['tutorial', 'Tutorials'], ['checker', 'Checkers & tests'], ['generator', 'Generators'],
    ['tool', 'Tools'], ['checklist', 'Checklists'], ['template', 'Templates'], ['project', 'Projects'],
    ['resource', 'Resources'], ['topic', 'Related topics']
  ];
  P.KINDS = KINDS;
  function kindOf(id) {
    var p = P.site.pages[id] || {};
    if (p.kind) return p.kind;
    var sec = sectionOf(id);
    if (sec && !parentOf(id) && sec.layout === 'topics') return 'topic';
    if (sec && sec.layout === 'projects' && !parentOf(id)) return 'project';
    if (sec && sec.layout === 'quick') return 'tool';
    return 'guide';
  }
  P.kindOf = kindOf;
  function topicItems(topic, b) {
    var ids = [];
    function add(id) { if (id !== topic && P.site.pages[id] && ids.indexOf(id) === -1) ids.push(id); }
    if (b.includeParts) ((P.site.pages[topic] || {}).parts || []).forEach(add);
    (b.pages || []).forEach(add);
    Object.keys(P.site.pages).forEach(function (id) { if ((P.site.pages[id].topics || []).indexOf(topic) !== -1) add(id); });
    return ids;
  }
  P.topicItems = topicItems;
  B['topic-index'] = function (b) {
    var topic = b.topic || pageId;
    var ids = topicItems(topic, b);
    if (!ids.length) return '<p class="p4a-2b">Nothing else is tagged with this topic yet.</p>';
    var groups = {};
    ids.forEach(function (id) { var k = kindOf(id); (groups[k] = groups[k] || []).push(id); });
    var labels = {};
    KINDS.forEach(function (k) { labels[k[0]] = k[1]; });
    return KINDS.filter(function (k) { return groups[k[0]]; }).map(function (k) {
      return '<div class="p4a-topic-group"><div class="p4a-label">' + esc(k[1]) + '</div>' +
        '<div class="p4a-grid cols-' + cols(b.cols, 3) + '">' + groups[k[0]].map(function (id) {
          var p = P.site.pages[id];
          return '<a href="' + esc(href(id)) + '" class="p4a-23 p4a-topic-card">' +
            '<div class="p4a-24">' + esc(p.title) + '</div>' +
            (p.summary ? '<div class="p4a-25">' + esc(p.summary) + '</div>' : '') +
            '<span class="p4a-redirect-link">Open &rarr;</span></a>';
        }).join('') + '</div></div>';
    }).join('');
  };

  function renderBlock(b, where, si, bi) {
    var fn = B[b.type];
    var inner = fn ? fn(b) : '';
    var bodyHtml = (b.before ? '<div class="p4a-21 p4a-rich p4a-before">' + rich(b.before) + '</div>' : '') + inner +
      (b.after ? '<div class="p4a-21 p4a-rich p4a-after">' + rich(b.after) + '</div>' : '');
    return '<div class="p4a-block p4a-b-' + esc(b.type) + '" data-where="' + where + '" data-sub="' + si + '" data-block="' + bi + '">' +
      bodyHtml + '</div>';
  }
  P.renderBlock = renderBlock;

  // Consecutive blocks marked "card" share one glass card.
  function renderBlocks(list, where, si) {
    var out = '', open = false;
    (list || []).forEach(function (b, bi) {
      if (b.card && !open) { out += '<div class="p4a-1g p4a-card">'; open = true; }
      if (!b.card && open) { out += '</div>'; open = false; }
      out += renderBlock(b, where, si, bi);
    });
    if (open) out += '</div>';
    return out;
  }

  /* ---------- widgets ---------- */

  P.widgets['password-checker'] = {
    label: 'Password strength checker',
    html: function () {
      return '<div class="p4a-2k p4a-pw"><input type="password" class="p4a-2l" placeholder="Type a password to test..." autocomplete="off">' +
        '<div class="p4a-2m"><div class="p4a-2n"></div><div class="p4a-2n"></div><div class="p4a-2n"></div><div class="p4a-2n"></div></div>' +
        '<div class="p4a-2o">Enter a password above</div><ul class="p4a-2p">' +
        '<li data-rule="length" class="pw-pending">At least 12 characters</li>' +
        '<li data-rule="upper" class="pw-pending">Contains uppercase &amp; lowercase</li>' +
        '<li data-rule="number" class="pw-pending">Contains a number</li>' +
        '<li data-rule="symbol" class="pw-pending">Contains a symbol</li></ul></div>';
    },
    init: function (el) {
      var input = el.querySelector('input'), bars = el.querySelectorAll('.p4a-2n'), label = el.querySelector('.p4a-2o');
      var labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
      function update() {
        var p = input.value;
        var checks = { length: p.length >= 12, upper: /[a-z]/.test(p) && /[A-Z]/.test(p), number: /[0-9]/.test(p), symbol: /[^a-zA-Z0-9]/.test(p) };
        var passed = Object.keys(checks).filter(function (k) { return checks[k]; }).length;
        var color = passed <= 1 ? '#d9534f' : passed === 2 ? '#e0a92b' : passed === 3 ? '#7ab648' : '#2f8f4e';
        bars.forEach(function (bar, i) { bar.style.background = i < passed ? color : '#e5e5e5'; });
        label.textContent = p ? labels[passed] : 'Enter a password above';
        el.querySelectorAll('[data-rule]').forEach(function (li) {
          var ok = checks[li.getAttribute('data-rule')];
          li.classList.toggle('pw-ok', ok); li.classList.toggle('pw-pending', !ok);
        });
      }
      input.addEventListener('input', update);
      update();
    }
  };

  P.widgets['password-generator'] = {
    label: 'Password generator',
    html: function () {
      return '<div class="p4a-gen">' +
        '<div class="p4a-gen-out"><input type="text" class="p4a-2l p4a-gen-pw" readonly aria-label="Generated password">' +
        '<button type="button" class="p4a-glass-btn p4a-btn-action bpe-copy-btn p4a-gen-copy">Copy</button>' +
        '<button type="button" class="p4a-glass-btn p4a-btn-nav bpe-copy-btn p4a-gen-new">New</button></div>' +
        '<div class="p4a-gen-opts"><label>Length <input type="range" min="8" max="64" value="20" class="p4a-gen-len"> <b class="p4a-gen-lenval">20</b></label>' +
        '<label><input type="checkbox" class="p4a-gen-opt" data-set="upper" checked> A–Z</label>' +
        '<label><input type="checkbox" class="p4a-gen-opt" data-set="lower" checked> a–z</label>' +
        '<label><input type="checkbox" class="p4a-gen-opt" data-set="digits" checked> 0–9</label>' +
        '<label><input type="checkbox" class="p4a-gen-opt" data-set="symbols" checked> !@#</label></div>' +
        '<p class="p4a-gen-note">Generated in your browser with <code>crypto.getRandomValues</code> &mdash; nothing is sent anywhere. Save it straight into your password manager.</p></div>';
    },
    init: function (el) {
      var SETS = { upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', lower: 'abcdefghijkmnopqrstuvwxyz', digits: '23456789', symbols: '!@#$%^&*-_=+?' };
      var out = el.querySelector('.p4a-gen-pw'), len = el.querySelector('.p4a-gen-len'), lv = el.querySelector('.p4a-gen-lenval');
      function rand(n) { // unbiased integer in [0, n)
        var buf = new Uint32Array(1), lim = Math.floor(0x100000000 / n) * n;
        do { crypto.getRandomValues(buf); } while (buf[0] >= lim);
        return buf[0] % n;
      }
      function gen() {
        var sets = [];
        el.querySelectorAll('.p4a-gen-opt').forEach(function (c) { if (c.checked) sets.push(SETS[c.getAttribute('data-set')]); });
        if (!sets.length) { sets = [SETS.lower]; el.querySelector('[data-set="lower"]').checked = true; }
        var n = +len.value, all = sets.join(''), chars = [];
        sets.forEach(function (s) { chars.push(s[rand(s.length)]); }); // at least one of each chosen set
        while (chars.length < n) chars.push(all[rand(all.length)]);
        for (var i = chars.length - 1; i > 0; i--) { var j = rand(i + 1), t = chars[i]; chars[i] = chars[j]; chars[j] = t; }
        out.value = chars.join('');
        lv.textContent = n;
      }
      len.addEventListener('input', gen);
      el.querySelectorAll('.p4a-gen-opt').forEach(function (c) { c.addEventListener('change', gen); });
      el.querySelector('.p4a-gen-new').addEventListener('click', gen);
      var cp = el.querySelector('.p4a-gen-copy');
      cp.addEventListener('click', function () {
        if (navigator.clipboard) navigator.clipboard.writeText(out.value).catch(function () {});
        cp.textContent = 'Copied!'; setTimeout(function () { cp.textContent = 'Copy'; }, 1500);
      });
      gen();
    }
  };

  /* ---------- page ---------- */

  function tocBlock() {
    var pg = P.site.pages[pageId] || {};
    var page = P.page;
    var mode = page.toc || 'auto';
    if (mode === 'none') return '';
    var items;
    if ((pg.parts || []).length && page.tocSource !== 'sections') {
      items = pg.parts.map(function (id, i) {
        var p = P.site.pages[id] || { title: id };
        return { href: href(id), label: 'PART ' + (i + 1), title: p.title, desc: p.summary || '' };
      });
    } else {
      items = (page.subsections || []).filter(function (s) { return s.title && !s.hideFromToc; }).map(function (s, i) {
        return { href: '#' + s.id, label: 'PART ' + (i + 1), title: s.title, desc: s.summary || '' };
      });
    }
    if (items.length < 2 && !((pg.parts || []).length && page.tocSource !== 'sections')) return '';
    if (!items.length) return '';
    if (mode === 'auto') mode = items.length <= 4 ? 'guidemap' : 'table';
    if (mode === 'guidemap') {
      return '<section id="guide-map" class="p4a-1z p4a-tocsec"><h2 class="p4a-20">' + esc((page.tocTitle || 'Guide Map').toUpperCase()) + '</h2>' +
        '<div class="p4a-guide-map">' + items.map(function (t) {
          return '<a href="' + esc(t.href) + '" class="p4a-guide-map-tile"><div class="p4a-26" style="margin:0 0 8px;">' + t.label + '</div>' +
            '<div class="p4a-w" style="margin-bottom:6px;">' + esc(t.title) + '</div><div class="p4a-25">' + esc(t.desc) + '</div></a>';
        }).join('') + '</div></section>';
    }
    return '<section id="guide-map" class="p4a-1z p4a-tocsec"><h2 class="p4a-20 p4a-20-tight p4a-toc-h">' + esc((page.tocTitle || 'Jump to a section').toUpperCase()) + '</h2>' +
      '<div class="p4a-1g p4a-card"><nav class="tdt-toc">' + items.map(function (t, i) {
        return '<a href="' + esc(t.href) + '"><span class="tdt-toc-num">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
          '<span class="tdt-toc-label">' + esc(t.title) + '</span>' + (t.desc ? '<span class="tdt-toc-desc">' + esc(t.desc) + '</span>' : '') + '</a>';
      }).join('') + '</nav></div></section>';
  }

  function masthead() {
    var pg = P.site.pages[pageId] || { title: pageId };
    var page = P.page;
    var parent = parentOf(pageId);
    var back = parent ? '<a href="' + esc(href(parent)) + '">&larr; ' + esc(title(parent)) + '</a>'
      : '<a href="' + esc(href('home')) + '">&larr; back home</a>';
    var heading = esc(pg.heading || pg.title);
    var dl = page.download ? '<div class="pcl-download"><button type="button" class="p4a-glass-btn p4a-btn-action pcl-download-trigger">&#8595; Download &#9662;</button>' +
      '<div class="pcl-download-menu"><button type="button" class="pcl-download-item" data-dl="print">Print / Save as PDF</button>' +
      '<button type="button" class="pcl-download-item" data-dl="txt">Download .txt</button>' +
      '<button type="button" class="pcl-download-item" data-dl="doc">Download .doc</button></div></div>' : '';
    if (page.layout === 'hero') {
      return '<section class="bph-hero p4a-masthead"><div class="p4a-1w p4a-back">' + back + '</div>' +
        '<h1 class="p4a-1x p4a-hero-title">' + heading + '</h1>' +
        (page.lede ? '<div class="p4a-21 p4a-rich p4a-hero-lede">' + rich(page.lede) + '</div>' : '') + dl + '</section>';
    }
    return '<section class="p4a-1v p4a-masthead"><div><div class="p4a-1w p4a-back">' + back + '</div>' +
      '<h1 class="p4a-1x">' + heading + '</h1>' +
      (page.subtitle ? '<p class="p4a-subtitle">' + esc(page.subtitle) + '</p>' : '') + '</div>' +
      '<div class="p4a-1y">' + (page.meta ? rich(page.meta) : '') + dl + '</div></section>';
  }

  function bottomNav() {
    var parent = parentOf(pageId);
    var pg = P.site.pages[pageId] || {};
    var left = '', right = '';
    if (parent) {
      var parts = P.site.pages[parent].parts || [];
      var i = parts.indexOf(pageId);
      left = i > 0 ? '<a href="' + esc(href(parts[i - 1])) + '" class="p4a-glass-btn p4a-nav-btn-prev">&larr; Part ' + i + ': ' + esc(title(parts[i - 1])) + '</a>'
        : '<a href="' + esc(href(parent)) + '" class="p4a-glass-btn p4a-btn-home">&larr; ' + esc(title(parent)) + '</a>';
      if (i < parts.length - 1) right = '<a href="' + esc(href(parts[i + 1])) + '" class="p4a-glass-btn p4a-btn-nav">Part ' + (i + 2) + ': ' + esc(title(parts[i + 1])) + ' &rarr;</a>';
    } else {
      left = '<a href="' + esc(href('home')) + '" class="p4a-glass-btn p4a-btn-home">&larr; Back to Home</a>';
      if ((pg.parts || []).length) right = '<a href="' + esc(href(pg.parts[0])) + '" class="p4a-glass-btn p4a-btn-nav">Start with Part 1: ' + esc(title(pg.parts[0])) + ' &rarr;</a>';
    }
    return '<div class="p4a-2c p4a-2c-nav p4a-bottom-nav">' + left + right + '</div>';
  }

  function renderPage() {
    var page = P.page;
    var subs = page.subsections || [];
    var pg = P.site.pages[pageId] || {};
    var empty = !subs.length && !(page.intro || []).length && !(pg.parts || []).length;
    var out = masthead();
    out += '<div class="p4a-intro" data-where="intro">' + renderBlocks(page.intro, 'intro', -1) + '</div>';
    out += tocBlock();
    out += subs.map(function (s, si) {
      return '<section id="' + esc(s.id) + '" class="p4a-1z p4a-sub" data-sub="' + si + '">' +
        (s.title && !s.hideTitle ? '<h2 class="p4a-20 p4a-sub-title' + (s.blocks && s.blocks.length ? ' p4a-20-tight' : '') + '">' + esc(s.title.toUpperCase()) + '</h2>' : '') +
        renderBlocks(s.blocks, 'sub', si) + '</section>';
    }).join('');
    if (empty) out += '<div class="p4a-inprogress"><span>In progress&hellip;</span><p>This page is still being written. Check back soon.</p></div>';
    out += '<div class="p4a-outro" data-where="outro">' + renderBlocks(page.outro, 'outro', -2) + '</div>';
    out += bottomNav();
    return out;
  }

  /* ---------- behaviours ---------- */

  function activate(root) {
    root.querySelectorAll('.copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-copy');
        var target = btn.getAttribute('data-copy-target');
        if (target && document.getElementById(target)) t = document.getElementById(target).value;
        if (navigator.clipboard) navigator.clipboard.writeText(t).catch(function () {});
        var o = btn.textContent; btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = o; }, 1500);
      });
    });

    root.querySelectorAll('.tdt-box textarea').forEach(function (ta) {
      function fit() { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
      fit(); window.addEventListener('resize', fit);
    });

    root.querySelectorAll('.p4a-checklist').forEach(function (cl) {
      var key = cl.getAttribute('data-cl');
      var items = cl.querySelectorAll('.p4a-cl-item');
      var prog = cl.querySelector('[data-cl-progress]');
      function update() {
        var n = cl.querySelectorAll('.p4a-2i.checked').length;
        prog.textContent = n + ' / ' + items.length + ' done';
      }
      items.forEach(function (it) {
        var k = key + it.getAttribute('data-k');
        var box = it.querySelector('.p4a-2i'), txt = it.querySelector('.p4a-2j');
        function set(on) { box.classList.toggle('checked', on); box.textContent = on ? '✓' : ''; txt.classList.toggle('checked', on); }
        set(store(k) === '1');
        it.querySelector('.p4a-2h').addEventListener('click', function (e) {
          if (e.target.closest('a')) return;
          var on = !box.classList.contains('checked'); set(on); store(k, on ? '1' : null); update();
        });
        var more = it.querySelector('.p4a-cl-more');
        if (more) more.addEventListener('click', function () {
          var d = it.querySelector('.p4a-cl-details');
          var open = d.hasAttribute('hidden');
          if (open) d.removeAttribute('hidden'); else d.setAttribute('hidden', '');
          more.setAttribute('aria-expanded', open ? 'true' : 'false');
          more.textContent = open ? '−' : '+';
          it.classList.toggle('open', open);
        });
      });
      update();
    });

    root.querySelectorAll('.p4a-3m').forEach(function (wrap) {
      var table = wrap.querySelector('table');
      if (!table || !table.rows.length) return;
      var lift = document.createElement('div');
      lift.className = 'p4a-3m-lift';
      wrap.insertBefore(lift, table);
      var current = -1;
      function place(col) {
        var th = table.rows[0].cells[col];
        lift.style.left = (table.offsetLeft + th.offsetLeft) + 'px';
        lift.style.width = th.offsetWidth + 'px';
        lift.style.top = (table.offsetTop - 10) + 'px';
        lift.style.height = (table.offsetHeight + 20) + 'px';
      }
      function hide() { current = -1; lift.classList.remove('on', 'slide'); }
      function show(target) {
        var cell = target.closest && target.closest('td, th');
        if (!cell || cell.cellIndex === 0) { hide(); return; }
        if (cell.cellIndex === current) return;
        lift.classList.toggle('slide', current !== -1);
        current = cell.cellIndex; place(current); lift.classList.add('on');
      }
      table.addEventListener('mouseover', function (e) { show(e.target); });
      table.addEventListener('focusin', function (e) { show(e.target); });
      table.addEventListener('focusout', hide);
      table.addEventListener('mouseleave', hide);
      table.addEventListener('click', function (e) {
        var cell = e.target.closest('td, th');
        if (!cell || cell.cellIndex === 0 || e.target.closest('a')) return;
        var u = table.rows[0].cells[cell.cellIndex].getAttribute('data-href');
        if (u) window.open(u, '_blank', 'noopener');
      });
      window.addEventListener('resize', function () { if (current !== -1) place(current); });
    });

    // Tabs inside migrated HTML: .bpe-tabs > [data-tab] switch #tab-<name> panels.
    root.querySelectorAll('.bpe-tabs').forEach(function (bar) {
      var btns = bar.querySelectorAll('[data-tab]');
      var scope = bar.closest('section') || root;
      function show(name) {
        btns.forEach(function (b) {
          var on = b.getAttribute('data-tab') === name;
          b.classList.toggle('bpe-tab-active', on); b.classList.toggle('p4a-btn-nav', on);
          b.classList.toggle('bpe-tab', !on); b.classList.toggle('p4a-btn-action', !on);
          var panel = scope.querySelector('#tab-' + b.getAttribute('data-tab'));
          if (panel) panel.style.display = on ? '' : 'none';
        });
      }
      btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-tab')); }); });
      var first = bar.querySelector('.bpe-tab-active') || btns[0];
      if (first) show(first.getAttribute('data-tab'));
    });

    root.querySelectorAll('[data-widget]').forEach(function (el) {
      var w = P.widgets[el.getAttribute('data-widget')];
      if (w && w.init) w.init(el);
    });

    var dl = root.querySelector('.pcl-download');
    if (dl) {
      dl.querySelector('.pcl-download-trigger').addEventListener('click', function (e) { e.stopPropagation(); dl.classList.toggle('open'); });
      document.addEventListener('click', function (e) { if (!dl.contains(e.target)) dl.classList.remove('open'); });
      dl.querySelectorAll('[data-dl]').forEach(function (b) {
        b.addEventListener('click', function () { dl.classList.remove('open'); download(b.getAttribute('data-dl')); });
      });
    }
  }

  function plain(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); }

  function download(kind) {
    if (kind === 'print') { window.print(); return; }
    var name = title(pageId);
    var groups = [];
    (P.page.subsections || []).forEach(function (s) {
      (s.blocks || []).forEach(function (b) {
        if (b.type === 'checklist') groups.push({ label: b.title || s.title, items: (b.items || []).map(function (i) { return plain(i.text); }) });
      });
    });
    var tagline = P.site.footer || '';
    var blob, file;
    if (kind === 'txt') {
      var lines = [name.toUpperCase(), tagline, ''];
      groups.forEach(function (g) {
        lines.push(g.label.toUpperCase(), '-'.repeat(g.label.length));
        g.items.forEach(function (t) { lines.push('[ ] ' + t); });
        lines.push('');
      });
      blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }); file = slug(name) + '.txt';
    } else {
      var html = '<h1 style="font-family:Georgia,serif;">' + esc(name) + '</h1><p style="font-family:Arial,sans-serif;font-size:11pt;color:#555;">' + esc(tagline) + '</p>';
      groups.forEach(function (g) {
        html += '<h2 style="font-family:Georgia,serif;font-size:14pt;margin-top:24pt;">' + esc(g.label) + '</h2><ul style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;">' +
          g.items.map(function (t) { return '<li>&#9633; ' + esc(t) + '</li>'; }).join('') + '</ul>';
      });
      blob = new Blob(['<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(name) + '</title></head><body>' + html + '</body></html>'],
        { type: 'application/msword;charset=utf-8' });
      file = slug(name) + '.doc';
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function wireChrome() {
    var root = document.documentElement;
    [['theme-night', 'data-night'], ['theme-contrast', 'data-contrast'], ['theme-backdrop', 'data-backdrop']].forEach(function (p) {
      var el = document.getElementById(p[0]);
      var cur = root.getAttribute(p[1]);
      if (cur) el.checked = cur === 'on';
      el.addEventListener('change', function () { root.setAttribute(p[1], el.checked ? 'on' : 'off'); });
    });
    if (!P._glass) {
      P._glass = true;
      var s = document.createElement('script');
      s.src = ROOT + 'js/glass.js?v=' + VERSION;
      document.body.appendChild(s);
    }

    document.getElementById('p4a-search').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = document.getElementById('search-input').value.trim().toLowerCase();
      var cat = document.getElementById('search-category').value;
      var msg = document.getElementById('search-message');
      var secs = P.site.sections.filter(function (s) { return cat === 'All' || s.id === cat; });
      if (!q) {
        if (cat !== 'All') location.href = url('#' + cat);
        return;
      }
      var hits = [];
      secs.forEach(function (s) {
        (s.items || []).forEach(function (id) {
          [id].concat((P.site.pages[id] || {}).parts || []).forEach(function (pid) {
            var p = P.site.pages[pid];
            if (p && hits.indexOf(pid) === -1 && (p.title + ' ' + (p.summary || '') + ' ' + (p.keywords || '')).toLowerCase().indexOf(q) !== -1) hits.push(pid);
          });
        });
      });
      msg.style.display = 'block';
      if (!hits.length) { msg.textContent = 'No matches for "' + q + '"'; return; }
      if (hits.length === 1) { location.href = href(hits[0]); return; }
      msg.innerHTML = 'Results for "' + esc(q) + '": ' + hits.map(function (id) { return '<a href="' + esc(href(id)) + '">' + esc(title(id)) + '</a>'; }).join(' &middot; ');
    });
  }

  /* ---------- render ---------- */

  P.render = function () {
    var y = window.scrollY;
    var night = document.documentElement.getAttribute('data-night');
    var app = document.getElementById('p4a-app');
    if (!app) { app = document.createElement('div'); app.id = 'p4a-app'; body.insertBefore(app, body.firstChild); }
    app.innerHTML = chrome();
    var main = document.getElementById('p4a-main');
    if (pageId === 'home') {
      main.innerHTML = renderHome();
      document.title = 'privacy4all';
    } else {
      main.innerHTML = renderPage();
      document.title = title(pageId) + ' — privacy4all';
    }
    if (night) document.documentElement.setAttribute('data-night', night);
    wireChrome();
    activate(main);
    P.afterRender.forEach(function (fn) { try { fn(main); } catch (e) { console.error(e); } });
    if (P._rendered) window.scrollTo(0, y);
    else if (location.hash) {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) setTimeout(function () { t.scrollIntoView(); }, 0);
    }
    P._rendered = true;
  };

  P.loadPage = function (id) {
    if (id === 'home') return Promise.resolve({});
    return load('pages/' + id).catch(function () { return {}; });
  };

  function checkAdmin() {
    return fetch(P.sessionUrl, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { admin: false }; })
      .then(function (d) { return !!(d && d.admin); })
      .catch(function () { return false; });
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.body.appendChild(s);
    });
  }

  function boot() {
    if (!pageId) { body.innerHTML = '<p style="padding:40px">Page not found. <a href="' + ROOT + 'index.html">Home</a></p>'; return; }
    Promise.all([load('site'), P.loadPage(pageId), checkAdmin()]).then(function (r) {
      P.site = r[0];
      P.page = r[1] || {};
      P.isAdmin = r[2];
      if (pageId !== 'home' && !P.site.pages[pageId] && !P.isAdmin) {
        body.innerHTML = '<p style="padding:40px;font-family:sans-serif">Page not found. <a href="' + ROOT + 'index.html">Back home</a></p>';
        return;
      }
      if (P.isAdmin) {
        var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = ROOT + 'style/p4a-admin.css?v=' + VERSION;
        document.head.appendChild(css);
        return loadScript(ROOT + 'js/p4a-admin.js?v=' + VERSION).then(function () { P.render(); });
      }
      P.render();
    }).catch(function (e) {
      console.error(e);
      body.insertAdjacentHTML('afterbegin', '<p style="padding:40px;font-family:sans-serif">Could not load site content.</p>');
    });
  }

  boot();
})();
