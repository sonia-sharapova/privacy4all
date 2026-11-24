/* privacy4all — in-browser admin editor.
 *
 * Loaded by js/p4a.js only when /admin/check-session.php reports an admin
 * session (the same login as the rest of soniapolis.com). Decorates the
 * rendered page with edit controls, edits P4A.site / P4A.page in memory, and
 * saves them through api/save.php (which backs up the previous version).
 */
(function () {
  'use strict';
  var P = window.P4A;
  var esc = P.esc;
  var A = P.admin = { dirty: { site: false, page: false }, newPages: {} };

  try { P.editing = sessionStorage.getItem('p4a-edit') !== '0'; } catch (e) { P.editing = true; }

  function clone(o) { return JSON.parse(JSON.stringify(o == null ? null : o)); }
  function h(tag, attrs, html) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    if (html != null) el.innerHTML = html;
    return el;
  }
  function btn(label, onclick, cls, titleText) {
    return h('button', { type: 'button', class: 'p4a-ed-btn ' + (cls || ''), title: titleText || null, onclick: function (e) { e.preventDefault(); e.stopPropagation(); onclick(e); } }, label);
  }
  function move(arr, i, d) {
    var j = i + d;
    if (j < 0 || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }

  /* ---------- dirty state + save ---------- */

  function changed(what) {
    if (what === 'site' || what === 'both') A.dirty.site = true;
    if (what === 'page' || what === 'both') A.dirty.page = true;
    P.render();
    updateBar();
  }
  A.changed = changed;

  function anyDirty() { return A.dirty.site || A.dirty.page || Object.keys(A.newPages).length > 0; }

  function post(payload) {
    return fetch(P.api + 'save.php', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.success) throw new Error(d.error || 'Save failed');
      return d;
    });
  }

  A.save = function () {
    if (!anyDirty()) return Promise.resolve();
    setStatus('Saving…');
    var jobs = [];
    if (A.dirty.site) jobs.push(post({ file: 'site', data: P.site }).then(function () { A.dirty.site = false; }));
    if (A.dirty.page && P.pageId !== 'home') jobs.push(post({ file: 'page', id: P.pageId, data: P.page }).then(function () { A.dirty.page = false; }));
    else A.dirty.page = false;
    Object.keys(A.newPages).forEach(function (id) {
      jobs.push(post({ file: 'page', id: id, data: A.newPages[id] }).then(function () { delete A.newPages[id]; }));
    });
    return Promise.all(jobs).then(function () { setStatus('Saved ✓'); updateBar(); })
      .catch(function (e) {
        setStatus('');
        updateBar();
        var msg = String(e.message || e);
        if (/unauthor/i.test(msg)) msg += ' — your admin session has ended. Log in again in another tab, then press Save.';
        notice('Could not save: ' + msg);
      });
  };

  window.addEventListener('beforeunload', function (e) {
    if (anyDirty()) { e.preventDefault(); e.returnValue = ''; }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); A.save(); }
    if (e.key === 'Escape' && A._modal) closeModal();
  });

  /* ---------- admin bar ---------- */

  var bar, statusEl, saveBtn, editToggle;
  function buildBar() {
    bar = h('div', { class: 'p4a-adminbar' });
    bar.appendChild(h('span', { class: 'p4a-adminbar-tag' }, 'ADMIN'));
    editToggle = btn('', function () {
      P.editing = !P.editing;
      try { sessionStorage.setItem('p4a-edit', P.editing ? '1' : '0'); } catch (e) {}
      P.render(); updateBar();
    }, 'p4a-adminbar-btn');
    bar.appendChild(editToggle);
    if (P.pageId !== 'home') bar.appendChild(btn('Page settings', function () { pageSettings(); }, 'p4a-adminbar-btn'));
    bar.appendChild(btn('Sidebar', function () { sidebarEditor(); }, 'p4a-adminbar-btn'));
    bar.appendChild(btn('Site', function () { siteSettings(); }, 'p4a-adminbar-btn'));
    statusEl = h('span', { class: 'p4a-adminbar-status' });
    bar.appendChild(statusEl);
    saveBtn = btn('Save', function () { A.save(); }, 'p4a-adminbar-btn p4a-adminbar-save');
    bar.appendChild(saveBtn);
    bar.appendChild(h('a', { class: 'p4a-adminbar-btn p4a-adminbar-out', href: P.root + 'api/logout.php?redirect=' + encodeURIComponent(location.pathname + location.search) }, 'Log out'));
    document.body.appendChild(bar);
    document.body.classList.add('p4a-has-adminbar');
    updateBar();
  }
  function setStatus(t) { if (statusEl) statusEl.textContent = t; }
  function updateBar() {
    if (!bar) return;
    editToggle.textContent = P.editing ? 'Editing: on' : 'Editing: off';
    editToggle.classList.toggle('on', P.editing);
    var d = anyDirty();
    saveBtn.disabled = !d;
    saveBtn.textContent = d ? 'Save changes' : 'Saved';
    if (d) setStatus('Unsaved changes');
  }

  /* ---------- modal ---------- */

  function closeModal() {
    if (A._modal) { A._modal.remove(); A._modal = null; document.body.classList.remove('p4a-modal-open'); }
  }
  function modal(titleText, content, actions, wide) {
    closeModal();
    var back = h('div', { class: 'p4a-modal-back' });
    var box = h('div', { class: 'p4a-modal' + (wide ? ' wide' : '') });
    var head = h('div', { class: 'p4a-modal-head' }, '<span>' + esc(titleText) + '</span>');
    head.appendChild(btn('✕', closeModal, 'p4a-modal-x', 'Close'));
    var bodyEl = h('div', { class: 'p4a-modal-body' });
    bodyEl.appendChild(content);
    var foot = h('div', { class: 'p4a-modal-foot' });
    (actions || []).forEach(function (a) { foot.appendChild(btn(a.label, a.onclick, a.cls || '')); });
    box.appendChild(head); box.appendChild(bodyEl); box.appendChild(foot);
    back.appendChild(box);
    back.addEventListener('mousedown', function (e) { if (e.target === back) back._down = true; });
    back.addEventListener('mouseup', function (e) { if (e.target === back && back._down) closeModal(); back._down = false; });
    document.body.appendChild(back);
    document.body.classList.add('p4a-modal-open');
    A._modal = back;
    var f = box.querySelector('input, textarea, [contenteditable]');
    if (f) setTimeout(function () { f.focus(); }, 30);
    return box;
  }
  function notice(text) {
    modal('Notice', h('p', null, esc(text)), [{ label: 'OK', onclick: closeModal, cls: 'primary' }]);
  }
  function confirmBox(text, yes, yesLabel) {
    modal('Are you sure?', h('p', null, esc(text)), [
      { label: 'Cancel', onclick: closeModal },
      { label: yesLabel || 'Delete', cls: 'danger', onclick: function () { closeModal(); yes(); } }
    ]);
  }

  /* Form: fields → { el, get() } */
  function form(fields, value, onSave, titleText, wide, extra) {
    var f = buildFields(fields, value || {});
    var wrap = h('div', { class: 'p4a-form' });
    if (extra && extra.top) wrap.appendChild(extra.top);
    wrap.appendChild(f.el);
    var actions = [{ label: 'Cancel', onclick: closeModal }];
    if (extra && extra.actions) actions = extra.actions.concat(actions);
    actions.push({ label: (extra && extra.saveLabel) || 'Done', cls: 'primary', onclick: function () {
      var v = f.get();
      if (onSave(v) !== false) closeModal();
    } });
    modal(titleText, wrap, actions, wide);
  }
  A.form = form;

  function buildFields(fields, value) {
    var el = h('div', { class: 'p4a-fields' });
    var getters = [];
    fields.forEach(function (fd) {
      if (fd.showIf && !fd.showIf(value)) { getters.push(function (out) { if (value[fd.key] !== undefined) out[fd.key] = value[fd.key]; }); return; }
      var w = h('div', { class: 'p4a-field p4a-field-' + fd.type });
      if (fd.type !== 'checkbox') w.appendChild(h('label', { class: 'p4a-field-label' }, esc(fd.label || '')));
      var ctl = control(fd, value[fd.key]);
      w.appendChild(ctl.el);
      if (fd.help) w.appendChild(h('div', { class: 'p4a-field-help' }, fd.help));
      el.appendChild(w);
      getters.push(function (out) { out[fd.key] = ctl.get(); });
    });
    return {
      el: el,
      get: function () {
        var out = clone(value) || {};
        getters.forEach(function (g) { g(out); });
        Object.keys(out).forEach(function (k) { if (out[k] === '' || out[k] == null) delete out[k]; });
        return out;
      }
    };
  }

  function pageOptions(includeBlank) {
    var opts = includeBlank ? '<option value="">— choose a page —</option>' : '';
    var seen = {};
    P.site.sections.forEach(function (s) {
      var ids = [];
      (s.items || []).forEach(function (id) { ids.push(id); (P.site.pages[id] && P.site.pages[id].parts || []).forEach(function (pid) { ids.push(pid); }); });
      if (!ids.length) return;
      opts += '<optgroup label="' + esc(s.title) + '">' + ids.map(function (id) {
        if (seen[id] || !P.site.pages[id]) return '';
        seen[id] = 1;
        var isPart = P.parentOf(id);
        return '<option value="' + esc(id) + '">' + (isPart ? '— ' : '') + esc(P.title(id)) + '</option>';
      }).join('') + '</optgroup>';
    });
    var rest = Object.keys(P.site.pages).filter(function (id) { return !seen[id]; });
    if (rest.length) opts += '<optgroup label="Other pages">' + rest.map(function (id) { return '<option value="' + esc(id) + '">' + esc(P.title(id)) + '</option>'; }).join('') + '</optgroup>';
    return opts;
  }

  function control(fd, v) {
    var t = fd.type, el, input;
    switch (t) {
      case 'text': case 'number':
        input = h('input', { type: t === 'number' ? 'number' : 'text', class: 'p4a-input', placeholder: fd.placeholder || '' });
        input.value = v == null ? '' : v;
        return { el: input, get: function () { return t === 'number' ? (input.value === '' ? '' : +input.value) : input.value.trim(); } };
      case 'textarea': case 'code':
        input = h('textarea', { class: 'p4a-input' + (t === 'code' ? ' mono' : ''), rows: fd.rows || (t === 'code' ? 8 : 4), spellcheck: t === 'code' ? 'false' : null, placeholder: fd.placeholder || '' });
        input.value = v == null ? '' : v;
        if (t === 'code') input.addEventListener('keydown', function (e) {
          if (e.key === 'Tab') { e.preventDefault(); var s = input.selectionStart; input.setRangeText('  ', s, input.selectionEnd, 'end'); }
        });
        return { el: input, get: function () { return t === 'code' ? input.value.replace(/\s+$/, '') : input.value.trim(); } };
      case 'lines':
        input = h('textarea', { class: 'p4a-input', rows: fd.rows || 5, placeholder: 'One per line' });
        input.value = (v || []).join('\n');
        return { el: input, get: function () { return input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); } };
      case 'cells':
        input = h('input', { type: 'text', class: 'p4a-input', placeholder: 'Column 1 | Column 2 | Column 3' });
        input.value = (v || []).join(' | ');
        return { el: input, get: function () { return input.value ? input.value.split('|').map(function (s) { return s.trim(); }) : []; } };
      case 'csv':
        input = h('input', { type: 'text', class: 'p4a-input', placeholder: fd.placeholder || 'yes, part, no' });
        input.value = (v || []).join(', ');
        return { el: input, get: function () { return input.value ? input.value.split(',').map(function (s) { return s.trim(); }) : []; } };
      case 'rows':
        input = h('textarea', { class: 'p4a-input mono', rows: fd.rows || 6, placeholder: 'One row per line, cells separated by |' });
        input.value = (v || []).map(function (r) { return r.join(' | '); }).join('\n');
        return { el: input, get: function () {
          return input.value.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return l.split('|').map(function (s) { return s.trim(); }); });
        } };
      case 'select':
        input = h('select', { class: 'p4a-input' }, fd.options.map(function (o) {
          return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>';
        }).join(''));
        input.value = v == null ? fd.options[0][0] : String(v);
        return { el: input, get: function () { var x = input.value; return fd.numeric ? +x : x; } };
      case 'checkbox':
        el = h('label', { class: 'p4a-check' });
        input = h('input', { type: 'checkbox' });
        input.checked = v == null ? !!fd.default : !!v;
        el.appendChild(input); el.appendChild(document.createTextNode(' ' + (fd.label || '')));
        return { el: el, get: function () { return input.checked; } };
      case 'page':
        input = h('select', { class: 'p4a-input' }, pageOptions(true));
        input.value = v || '';
        return { el: input, get: function () { return input.value; } };
      case 'link': return linkControl(v);
      case 'image': return imageControl(v);
      case 'html': return richControl(v, fd);
      case 'pages': return pagesControl(v, fd);
      case 'list': return listControl(v, fd);
    }
    throw new Error('Unknown field type ' + t);
  }

  function linkControl(v) {
    var el = h('div', { class: 'p4a-link-ctl' });
    var input = h('input', { type: 'text', class: 'p4a-input', placeholder: 'https://… or choose a page →' });
    input.value = v || '';
    var sel = h('select', { class: 'p4a-input p4a-link-pick' }, '<option value="">Link to a page…</option>' + pageOptions(false));
    sel.addEventListener('change', function () { if (sel.value) input.value = 'page:' + sel.value; sel.value = ''; });
    el.appendChild(input); el.appendChild(sel);
    return { el: el, get: function () { return input.value.trim(); } };
  }

  function imageControl(v) {
    var el = h('div', { class: 'p4a-img-ctl' });
    var input = h('input', { type: 'text', class: 'p4a-input', placeholder: 'assets/picture.jpg or https://…' });
    input.value = v || '';
    var prev = h('img', { class: 'p4a-img-prev', alt: '' });
    function sync() { if (input.value) { prev.src = P.url(input.value); prev.style.display = ''; } else prev.style.display = 'none'; }
    input.addEventListener('input', sync); sync();
    var file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp,image/avif', style: 'display:none' });
    var up = btn('Upload…', function () { file.click(); }, 'p4a-ed-small');
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      var fdta = new FormData(); fdta.append('image', file.files[0]);
      up.textContent = 'Uploading…';
      fetch(P.api + 'upload.php', { method: 'POST', credentials: 'same-origin', body: fdta })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d.success) throw new Error(d.error); input.value = d.path; sync(); })
        .catch(function (e) { alertInline(el, 'Upload failed: ' + e.message); })
        .then(function () { up.textContent = 'Upload…'; file.value = ''; });
    });
    var row = h('div', { class: 'p4a-img-row' }); row.appendChild(input); row.appendChild(up);
    el.appendChild(row); el.appendChild(prev); el.appendChild(file);
    return { el: el, get: function () { return input.value.trim(); } };
  }
  function alertInline(el, text) {
    var n = h('div', { class: 'p4a-field-error' }, esc(text)); el.appendChild(n);
    setTimeout(function () { n.remove(); }, 5000);
  }

  function richControl(v, fd) {
    var el = h('div', { class: 'p4a-rte' });
    var tools = h('div', { class: 'p4a-rte-tools' });
    var area = h('div', { class: 'p4a-rte-area p4a-rich', contenteditable: 'true' });
    area.innerHTML = v || '';
    var src = h('textarea', { class: 'p4a-input mono p4a-rte-src', rows: 8, spellcheck: 'false' });
    var srcMode = false;
    function cmd(c, arg) { area.focus(); document.execCommand(c, false, arg); }
    [['<b>B</b>', 'Bold', function () { cmd('bold'); }],
     ['<i>I</i>', 'Italic', function () { cmd('italic'); }],
     ['<u>U</u>', 'Underline', function () { cmd('underline'); }],
     ['🔗', 'Link (select text first)', function () {
        var sel = window.getSelection(); var range = sel.rangeCount ? sel.getRangeAt(0) : null;
        var u = window.prompt('Link URL (https://… or page:<id>)', 'https://');
        if (!u) return;
        if (range) { sel.removeAllRanges(); sel.addRange(range); }
        cmd('createLink', u);
     }],
     ['• List', 'Bullet list', function () { cmd('insertUnorderedList'); }],
     ['1. List', 'Numbered list', function () { cmd('insertOrderedList'); }],
     ['¶', 'Paragraph', function () { cmd('formatBlock', 'p'); }],
     ['<code>code</code>', 'Inline code (select text)', function () {
        var sel = window.getSelection(); if (!sel.rangeCount || sel.isCollapsed) return;
        var t = sel.toString(); cmd('insertHTML', '<code>' + esc(t) + '</code>');
     }],
     ['Clear', 'Remove formatting', function () { cmd('removeFormat'); cmd('unlink'); }]
    ].forEach(function (t) { tools.appendChild(btn(t[0], t[2], 'p4a-rte-btn', t[1])); });
    var srcBtn = btn('&lt;/&gt; HTML', function () {
      srcMode = !srcMode;
      if (srcMode) { src.value = area.innerHTML; area.style.display = 'none'; src.style.display = ''; }
      else { area.innerHTML = src.value; src.style.display = 'none'; area.style.display = ''; }
      srcBtn.classList.toggle('on', srcMode);
    }, 'p4a-rte-btn p4a-rte-srcbtn', 'Edit HTML source');
    tools.appendChild(srcBtn);
    src.style.display = 'none';
    area.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    if (fd && fd.small) area.classList.add('small');
    el.appendChild(tools); el.appendChild(area); el.appendChild(src);
    return { el: el, get: function () {
      var html = srcMode ? src.value : area.innerHTML;
      html = html.replace(/<br\s*\/?>$/, '').trim();
      if (html === '<br>' || html === '<p><br></p>') html = '';
      return html;
    } };
  }

  function pagesControl(v, fd) {
    var ids = (v || []).slice();
    var el = h('div', { class: 'p4a-pages-ctl' });
    var list = h('div', { class: 'p4a-pages-list' });
    function draw() {
      list.innerHTML = '';
      if (!ids.length) list.appendChild(h('div', { class: 'p4a-field-help' }, 'None yet.'));
      ids.forEach(function (id, i) {
        var row = h('div', { class: 'p4a-pages-row' }, '<span>' + esc(P.title(id)) + '</span>');
        row.appendChild(btn('↑', function () { move(ids, i, -1); draw(); }, 'p4a-ed-small'));
        row.appendChild(btn('↓', function () { move(ids, i, 1); draw(); }, 'p4a-ed-small'));
        row.appendChild(btn('✕', function () { ids.splice(i, 1); draw(); }, 'p4a-ed-small'));
        list.appendChild(row);
      });
    }
    var sel = h('select', { class: 'p4a-input' }, '<option value="">+ Add an existing page…</option>' + pageOptions(false));
    sel.addEventListener('change', function () { if (sel.value && ids.indexOf(sel.value) === -1) ids.push(sel.value); sel.value = ''; draw(); });
    el.appendChild(list); el.appendChild(sel);
    if (fd.allowNew) {
      var nt = h('input', { type: 'text', class: 'p4a-input', placeholder: 'or type a new page name and press +' });
      var row = h('div', { class: 'p4a-img-row' }); row.appendChild(nt);
      row.appendChild(btn('+ New', function () {
        if (!nt.value.trim()) return;
        ids.push(createPage(nt.value.trim(), '')); nt.value = ''; draw();
      }, 'p4a-ed-small'));
      el.appendChild(row);
    }
    draw();
    return { el: el, get: function () { return ids.slice(); } };
  }

  function listControl(v, fd) {
    var items = clone(v || []);
    var el = h('div', { class: 'p4a-list-ctl' });
    var list = h('div', { class: 'p4a-list-items' });
    var getters = [];
    function snapshot() { getters.forEach(function (g, i) { items[i] = g(); }); }
    function summary(it, i) {
      var s = fd.summary ? fd.summary(it) : (it.title || it.label || it.text || it.name || '');
      var d = document.createElement('div'); d.innerHTML = s || ''; s = d.textContent;
      return (i + 1) + '. ' + (s ? s.slice(0, 70) : '(empty)');
    }
    function draw(openIndex) {
      list.innerHTML = ''; getters = [];
      items.forEach(function (it, i) {
        var row = h('details', { class: 'p4a-list-item' });
        if (i === openIndex || items.length === 1) row.open = true;
        var sum = h('summary', null, '<span>' + esc(summary(it, i)) + '</span>');
        var tb = h('span', { class: 'p4a-list-tools' });
        tb.appendChild(btn('↑', function () { snapshot(); move(items, i, -1); draw(i - 1); }, 'p4a-ed-small', 'Move up'));
        tb.appendChild(btn('↓', function () { snapshot(); move(items, i, 1); draw(i + 1); }, 'p4a-ed-small', 'Move down'));
        tb.appendChild(btn('⧉', function () { snapshot(); items.splice(i + 1, 0, clone(items[i])); draw(i + 1); }, 'p4a-ed-small', 'Duplicate'));
        tb.appendChild(btn('✕', function () { snapshot(); items.splice(i, 1); draw(); }, 'p4a-ed-small', 'Remove'));
        sum.appendChild(tb);
        row.appendChild(sum);
        var sub = buildFields(fd.fields, it);
        row.appendChild(sub.el);
        getters.push(sub.get);
        list.appendChild(row);
      });
    }
    el.appendChild(list);
    el.appendChild(btn('+ Add ' + (fd.itemLabel || 'item'), function () {
      snapshot(); items.push(fd.make ? fd.make() : {}); draw(items.length - 1);
    }, 'p4a-ed-add'));
    draw();
    return { el: el, get: function () { snapshot(); return items.slice(); } };
  }

  /* ---------- block types ---------- */

  var COMMON = [
    { key: 'before', label: 'Body text before this element (optional)', type: 'html', small: true },
    { key: 'after', label: 'Body text after this element (optional)', type: 'html', small: true },
    { key: 'card', label: 'Show inside a glass card', type: 'checkbox' }
  ];
  var COLS = [['2', '2 columns'], ['3', '3 columns'], ['4', '4 columns'], ['1', '1 column']];

  var TYPES = [
    { type: 'text', label: 'Body text', desc: 'Paragraphs, lists and links.', icon: '¶',
      fields: [{ key: 'html', label: 'Text', type: 'html' }], make: function () { return { html: '' }; }, noCommon: true },
    { type: 'checklist', label: 'Checklist', desc: 'Tick-off items with progress; each item can open an accordion with more information.', icon: '☑',
      fields: [
        { key: 'title', label: 'Checklist title (optional — the subsection title is shown above)', type: 'text' },
        { key: 'items', label: 'Items', type: 'list', itemLabel: 'item', summary: function (i) { return i.text; }, make: function () { return { text: '' }; },
          fields: [
            { key: 'text', label: 'Item', type: 'html', small: true },
            { key: 'details', label: 'More information (shown in a dropdown — optional)', type: 'html', small: true }
          ] }
      ], make: function () { return { items: [{ text: '' }], card: true }; } },
    { type: 'numbered', label: 'Numbered containers', desc: 'Tips, steps or ordered points — as cards, an accordion of steps, or a plain list.', icon: '①',
      fields: [
        { key: 'style', label: 'Style', type: 'select', options: [['cards', 'Numbered cards (tips)'], ['accordion', 'Step accordion (click to open)'], ['list', 'Numbered list']] },
        { key: 'label', label: 'Number label (e.g. STEP, TIP — optional)', type: 'text' },
        { key: 'cols', label: 'Columns (cards only)', type: 'select', options: COLS, numeric: true },
        { key: 'start', label: 'Start numbering at', type: 'number' },
        { key: 'items', label: 'Items', type: 'list', itemLabel: 'item', make: function () { return { title: '', text: '' }; },
          summary: function (i) { return i.title || i.text; },
          fields: [
            { key: 'title', label: 'Title (optional for cards/list)', type: 'text' },
            { key: 'url', label: 'Title links to (optional, cards)', type: 'link' },
            { key: 'text', label: 'Text', type: 'html', small: true }
          ] }
      ], make: function () { return { style: 'cards', cols: 4, items: [{ text: '' }, { text: '' }] }; } },
    { type: 'redirects', label: 'Redirects', desc: 'Elements that lead somewhere: recommended apps, download pages, resources.', icon: '↗',
      fields: [
        { key: 'style', label: 'Style', type: 'select', options: [['buttons', 'Buttons (e.g. password managers)'], ['cards', 'Cards with icon, details and link (e.g. recommended browsers)'], ['rows', 'Rows with a button on the right (download pages)']] },
        { key: 'cols', label: 'Columns (cards only)', type: 'select', options: COLS, numeric: true },
        { key: 'items', label: 'Links', type: 'list', itemLabel: 'link', make: function () { return { label: '', url: '' }; },
          summary: function (i) { return i.label || i.url; },
          fields: [
            { key: 'label', label: 'Name (leave empty for a page link to use the page’s name)', type: 'text' },
            { key: 'url', label: 'Link', type: 'link' },
            { key: 'icon', label: 'Icon (optional)', type: 'image' },
            { key: 'meta', label: 'Small caption, e.g. “Desktop, Android · Free” (cards/rows)', type: 'text' },
            { key: 'desc', label: 'Description (cards/rows)', type: 'html', small: true },
            { key: 'linkText', label: 'Button / link text (cards/rows, e.g. “Download”)', type: 'text' }
          ] }
      ], make: function () { return { style: 'buttons', items: [{ label: '', url: '' }] }; } },
    { type: 'columns', label: 'Info columns', desc: 'Two, three or four columns of titled information.', icon: '▥',
      fields: [
        { key: 'cols', label: 'Columns', type: 'select', options: COLS, numeric: true },
        { key: 'style', label: 'Style', type: 'select', options: [['divided', 'Line above each column'], ['headed', 'Heading with rule (e.g. Step 1 / Step 2)'], ['terms', 'Boxed terms (glossary)'], ['plain', 'Plain']] },
        { key: 'items', label: 'Columns', type: 'list', itemLabel: 'column', make: function () { return { title: '', html: '' }; },
          fields: [
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'url', label: 'Title links to (optional)', type: 'link' },
            { key: 'html', label: 'Content', type: 'html' }
          ] }
      ], make: function () { return { cols: 3, style: 'divided', items: [{}, {}, {}] }; } },
    { type: 'faq', label: 'Accordion / FAQ', desc: 'Questions or headings that open to reveal more (FAQ, troubleshooting).', icon: '▾',
      fields: [
        { key: 'openFirst', label: 'Open the first one by default', type: 'checkbox' },
        { key: 'items', label: 'Entries', type: 'list', itemLabel: 'entry', summary: function (i) { return i.q; }, make: function () { return { q: '', a: '' }; },
          fields: [{ key: 'q', label: 'Question / heading', type: 'text' }, { key: 'a', label: 'Answer', type: 'html', small: true }] }
      ], make: function () { return { items: [{ q: '', a: '' }] }; } },
    { type: 'topic-index', label: 'Everything on this topic', desc: 'Automatically lists every page tagged with this topic (guides, checkers, generators, projects…), grouped by kind.', icon: '⊞',
      fields: [
        { key: 'style', label: 'Style', type: 'select', options: [['groups', 'Cards grouped by kind'], ['table', 'Table rows'], ['tiles', 'Tiles']] },
        { key: 'kinds', label: 'Only these kinds (comma-separated, e.g. guide, tutorial, checklist) — optional', type: 'csv', placeholder: 'guide, tutorial, checklist, template' },
        { key: 'exclude', label: 'Leave out these pages (and their parts)', type: 'pages' },
        { key: 'includeParts', label: 'Also list this page’s own parts', type: 'checkbox' },
        { key: 'pages', label: 'Extra pages to include (pages tagged with this topic in their Page settings appear automatically)', type: 'pages' },
        { key: 'cols', label: 'Columns', type: 'select', options: COLS, numeric: true }
      ], make: function () { return { cols: 3 }; } },
    { type: 'section-list', label: 'Home section (all items)', desc: 'Every item in one of the home page sections, in the same layout.', icon: '▤',
      fields: [{ key: 'section', label: 'Section', type: 'select', options: P.site.sections.map(function (s) { return [s.id, s.title]; }) }], make: function () { return { section: P.site.sections[0].id }; }, noCommon: true },
    { type: 'glossary', label: 'Glossary A–Z', desc: 'Every term from every Terminology section on the site, as an A–Z dictionary. Updates itself.', icon: 'Az',
      fields: [], make: function () { return {}; }, noCommon: true },
    { type: 'resources', label: 'Resources list', desc: 'A list of links with short descriptions.', icon: '☰',
      fields: [
        { key: 'style', label: 'Style', type: 'select', options: [['list', 'Bulleted list'], ['numbered', 'Numbered references [1] [2]']] },
        { key: 'items', label: 'Resources', type: 'list', itemLabel: 'resource', make: function () { return { label: '', url: '', desc: '' }; },
          summary: function (i) { return i.label || i.url; },
          fields: [
            { key: 'label', label: 'Name', type: 'text' },
            { key: 'url', label: 'Link', type: 'link' },
            { key: 'desc', label: 'Description', type: 'text' }
          ] }
      ], make: function () { return { style: 'list', items: [{}] }; } },
    { type: 'code', label: 'Code', desc: 'A terminal-style code block or a single copyable line, with a copy button.', icon: '⌨',
      fields: [
        { key: 'style', label: 'Style', type: 'select', options: [['terminal', 'Code block (terminal)'], ['inline', 'Single line with copy button']] },
        { key: 'label', label: 'Caption above (optional, e.g. “Run on the server”)', type: 'text' },
        { key: 'lang', label: 'Language (optional, e.g. bash)', type: 'text' },
        { key: 'code', label: 'Code', type: 'code', rows: 10 },
        { key: 'copy', label: 'Show copy button', type: 'checkbox', default: true }
      ], make: function () { return { style: 'terminal', code: '', copy: true }; } },
    { type: 'template', label: 'Copyable template', desc: 'A letter/email template people copy and fill in (like the takedown templates).', icon: '✉',
      fields: [
        { key: 'label', label: 'Caption above (optional)', type: 'text' },
        { key: 'text', label: 'Template text', type: 'code', rows: 14 }
      ], make: function () { return { text: '' }; } },
    { type: 'callout', label: 'Tip / note box', desc: 'A dashed box for a tip, note or warning.', icon: '!',
      fields: [
        { key: 'label', label: 'Label (optional, e.g. TIP)', type: 'text' },
        { key: 'html', label: 'Text', type: 'html', small: true }
      ], make: function () { return { html: '' }; } },
    { type: 'table', label: 'Table', desc: 'Rows and columns — e.g. services, costs, DNS records.', icon: '▦',
      fields: [
        { key: 'headers', label: 'Column headings', type: 'cells' },
        { key: 'rows', label: 'Rows (one per line, cells separated by | — HTML links allowed)', type: 'rows', rows: 8 },
        { key: 'size', label: 'Size', type: 'select', options: [['sm', 'Compact'], ['lg', 'Large']] }
      ], make: function () { return { headers: ['Name', 'What it does'], rows: [] }; } },
    { type: 'matrix', label: 'Comparison matrix', desc: 'Yes / partial / no grid across options (like the browser “At a glance”).', icon: '◉',
      fields: [
        { key: 'corner', label: 'Corner label', type: 'text', placeholder: 'KEY METRICS' },
        { key: 'columns', label: 'Options (columns)', type: 'list', itemLabel: 'option', summary: function (c) { return c.name; }, make: function () { return { name: '' }; },
          fields: [{ key: 'name', label: 'Name', type: 'text' }, { key: 'icon', label: 'Icon', type: 'image' }, { key: 'url', label: 'Link', type: 'link' }] },
        { key: 'rows', label: 'Features (rows)', type: 'list', itemLabel: 'feature', make: function () { return { label: '', values: [] }; },
          fields: [{ key: 'label', label: 'Feature', type: 'text' }, { key: 'values', label: 'Values in column order: yes / part / no', type: 'csv' }] },
        { key: 'legend', label: 'Show legend', type: 'checkbox', default: true },
        { key: 'note', label: 'Footnote', type: 'html', small: true }
      ], make: function () { return { columns: [], rows: [], card: true }; } },
    { type: 'quote', label: 'Quote', desc: 'A large quote, optionally beside an image or a short note.', icon: '❝',
      fields: [
        { key: 'quote', label: 'Quote', type: 'textarea' },
        { key: 'author', label: 'Author', type: 'text' },
        { key: 'side', label: 'Beside the quote', type: 'select', options: [['none', 'Nothing'], ['image', 'An image'], ['text', 'A short note']] },
        { key: 'sideFirst', label: 'Put it on the left', type: 'checkbox' },
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'sideLabel', label: 'Note label (e.g. WHAT IS A VPS?)', type: 'text' },
        { key: 'sideText', label: 'Note text', type: 'html', small: true }
      ], make: function () { return { quote: '', side: 'none', card: true }; } },
    { type: 'flow', label: 'Flow', desc: 'A short stepped flow, e.g. You → VPN → Website. The last line is highlighted.', icon: '↘',
      fields: [{ key: 'lines', label: 'Lines', type: 'lines' }], make: function () { return { lines: [] }; } },
    { type: 'subheading', label: 'Sub-heading', desc: 'A smaller heading or label inside a subsection.', icon: 'H',
      fields: [{ key: 'text', label: 'Text', type: 'text' }, { key: 'style', label: 'Style', type: 'select', options: [['label', 'Spaced label (e.g. PAID SERVICE)'], ['h3', 'Heading']] }],
      make: function () { return { text: '', style: 'label' }; }, noCommon: true },
    { type: 'image', label: 'Image', desc: 'A picture with an optional caption.', icon: '▣',
      fields: [{ key: 'src', label: 'Image', type: 'image' }, { key: 'alt', label: 'Description (alt text)', type: 'text' }, { key: 'caption', label: 'Caption', type: 'text' }, { key: 'width', label: 'Width (% of the column)', type: 'number' }],
      make: function () { return { src: '' }; } },
    { type: 'divider', label: 'Divider', desc: 'A thin horizontal rule.', icon: '—', fields: [], make: function () { return {}; }, noCommon: true },
    { type: 'widget', label: 'Special element', desc: 'Interactive tools, e.g. the password strength checker.', icon: '★',
      fields: [{ key: 'name', label: 'Element', type: 'select', options: Object.keys(P.widgets).map(function (k) { return [k, P.widgets[k].label]; }) }],
      make: function () { return { name: 'password-checker' }; } },
    { type: 'html', label: 'Custom HTML', desc: 'Raw HTML for anything the templates don’t cover (also used for migrated content).', icon: '</>',
      fields: [{ key: 'html', label: 'HTML', type: 'code', rows: 16 }], make: function () { return { html: '' }; }, noCommon: true }
  ];
  var TYPE = {}; TYPES.forEach(function (t) { TYPE[t.type] = t; });
  A.TYPES = TYPES;

  function blockFields(type) {
    var t = TYPE[type];
    if (!t) return [{ key: 'html', label: 'HTML', type: 'code' }];
    return t.noCommon ? t.fields : t.fields.concat(COMMON);
  }

  function editBlock(block, onSave, isNew) {
    var t = TYPE[block.type] || { label: block.type };
    form(blockFields(block.type), block, function (v) { v.type = block.type; onSave(v); }, (isNew ? 'Add ' : 'Edit ') + t.label, true,
      isNew ? null : { actions: block.type === 'html' ? [] : [] });
  }

  function typePicker(onPick, titleText) {
    var grid = h('div', { class: 'p4a-typegrid' });
    TYPES.forEach(function (t) {
      var c = h('button', { type: 'button', class: 'p4a-typecard', onclick: function () { closeModal(); onPick(t); } },
        '<span class="p4a-typeicon">' + esc(t.icon) + '</span><span class="p4a-typename">' + esc(t.label) + '</span><span class="p4a-typedesc">' + esc(t.desc) + '</span>');
      grid.appendChild(c);
    });
    modal(titleText || 'Choose a content type', grid, [{ label: 'Cancel', onclick: closeModal }], true);
  }

  function addBlockTo(list, index) {
    typePicker(function (t) {
      var b = t.make(); b.type = t.type;
      editBlock(b, function (v) { list.splice(index, 0, v); changed('page'); }, true);
    }, 'Add an element');
  }

  /* ---------- pages ---------- */

  function uniqueId(base, taken) {
    var id = P.slug(base), n = 2;
    while (taken(id)) id = P.slug(base) + '-' + n++;
    return id;
  }

  function createPage(titleText, summary, extra) {
    var id = uniqueId(titleText, function (x) { return !!P.site.pages[x] || x === 'home' || x === 'page'; });
    P.site.pages[id] = Object.assign({ title: titleText, summary: summary || '' }, extra || {});
    A.newPages[id] = { subsections: [] };
    A.dirty.site = true;
    return id;
  }
  A.createPage = createPage;

  function pageMetaFields(full) {
    var f = [
      { key: 'title', label: 'Name — used everywhere (home page, sidebar, guide maps, breadcrumbs, heading)', type: 'text' },
      { key: 'summary', label: 'Short description (home tile, guide map, projects list)', type: 'text' },
      { key: 'image', label: 'Tile image (home page)', type: 'image' },
      { key: 'imageFit', label: 'Image fit', type: 'select', options: [['cover', 'Fill the tile'], ['contain', 'Fit inside (icons/logos)']] }
    ];
    if (full) f = f.concat([
      { key: 'heading', label: 'Longer heading on the page itself (optional — otherwise the name is used)', type: 'text' },
      { key: 'keywords', label: 'Extra search keywords (optional)', type: 'text' },
      { key: 'topics', label: 'Topics — this page is listed on these Privacy & Security topic pages', type: 'pages' },
      { key: 'lesson', label: 'Lesson for this topic (the “Full guide to …” page)', type: 'page' },
      { key: 'kind', label: 'Kind (the group it is listed under on topic pages)', type: 'select',
        options: [['', 'Automatic (from its section)']].concat(P.KINDS) },
      { key: 'parts', label: 'Parts — sub-pages that walk through this topic (shown as a guide map)', type: 'pages', allowNew: true },
      { key: 'related', label: 'Related pages in the sidebar (optional — part pages default to their siblings)', type: 'pages' },
      { key: 'link', label: 'Send visitors somewhere else instead of this page (optional)', type: 'link' }
    ]);
    return f;
  }

  var PAGE_FIELDS = [
    { key: 'layout', label: 'Header style', type: 'select', options: [['masthead', 'Title with date/meta on the right'], ['hero', 'Large title with an introduction']] },
    { key: 'subtitle', label: 'Subtitle under the title (masthead style)', type: 'text' },
    { key: 'meta', label: 'Right-hand note, e.g. date or “READ TIME 12 MIN” (masthead style)', type: 'html', small: true },
    { key: 'lede', label: 'Introduction (hero style)', type: 'html', small: true },
    { key: 'toc', label: 'Table of contents', type: 'select', options: [['auto', 'Automatic — guide map for 4 or fewer, table for more'], ['guidemap', 'Always a guide map'], ['table', 'Always a table'], ['none', 'None']] },
    { key: 'tocSource', label: 'On pages with parts, the table of contents lists…', type: 'select', options: [['parts', 'The parts (sub-pages)'], ['sections', 'This page’s own subsections']] },
    { key: 'tocTitle', label: 'Table of contents heading (optional)', type: 'text' },
    { key: 'tocAfter', label: 'Place the contents after this subsection’s id (e.g. overview) — optional', type: 'text' },
    { key: 'download', label: 'Show a “Download” menu (prints/downloads the checklists on this page)', type: 'checkbox' }
  ];

  function pageSettings() {
    var id = P.pageId;
    var meta = P.site.pages[id] || { title: id };
    var both = Object.assign({}, clone(meta), clone(P.page));
    var fields = pageMetaFields(true).concat(PAGE_FIELDS);
    form(fields, both, function (v) {
      var mkeys = pageMetaFields(true).map(function (f) { return f.key; });
      var newMeta = {}, newPage = clone(P.page);
      Object.keys(meta).forEach(function (k) { if (mkeys.indexOf(k) === -1) newMeta[k] = meta[k]; });
      mkeys.forEach(function (k) { if (v[k] !== undefined && !(Array.isArray(v[k]) && !v[k].length)) newMeta[k] = v[k]; });
      PAGE_FIELDS.forEach(function (f) { if (v[f.key] === undefined || v[f.key] === false) delete newPage[f.key]; else newPage[f.key] = v[f.key]; });
      if (!newMeta.title) newMeta.title = meta.title;
      if (!newMeta.kind) delete newMeta.kind;
      P.site.pages[id] = newMeta;
      P.page = newPage;
      changed('both');
    }, 'Page settings', true, { actions: [{ label: 'Delete page', cls: 'danger', onclick: function () { deletePage(id); } }] });
  }

  function deletePage(id) {
    confirmBox('Delete “' + P.title(id) + '”? It is removed from every section, guide map and sidebar. (The saved content file stays on the server as a backup.)', function () {
      var parent = P.parentOf(id);
      removeEverywhere(id);
      delete P.site.pages[id];
      A.dirty.site = true;
      A.save().then(function () { location.href = parent ? P.href(parent) : P.href('home'); });
    });
  }
  function removeEverywhere(id) {
    P.site.sections.forEach(function (s) { if (s.items) s.items = s.items.filter(function (x) { return x !== id; }); });
    Object.keys(P.site.pages).forEach(function (k) {
      var p = P.site.pages[k];
      ['parts', 'related'].forEach(function (key) { if (p[key]) p[key] = p[key].filter(function (x) { return x !== id; }); });
    });
    ((P.site.sidebar || {}).groups || []).forEach(function (g) { if (g.items) g.items = g.items.filter(function (it) { return it.page !== id; }); });
  }

  function addPart() {
    var id = P.pageId;
    form([{ key: 'title', label: 'Part name', type: 'text' }, { key: 'summary', label: 'Short description (shown in the guide map)', type: 'text' }], {}, function (v) {
      if (!v.title) return false;
      var nid = createPage(v.title, v.summary);
      var meta = P.site.pages[id];
      meta.parts = (meta.parts || []).concat([nid]);
      changed('site');
      A.save();
    }, 'Add a part', false, { saveLabel: 'Create part' });
  }

  /* ---------- subsections ---------- */

  function subFields() {
    return [
      { key: 'title', label: 'Title (also used in the table of contents and sidebar)', type: 'text' },
      { key: 'summary', label: 'Short description for the guide map / table of contents (optional)', type: 'text' },
      { key: 'hideTitle', label: 'Hide the title on the page', type: 'checkbox' },
      { key: 'hideFromToc', label: 'Leave out of the table of contents', type: 'checkbox' }
    ];
  }
  function subId(t, except) {
    return uniqueId(t || 'section', function (x) {
      return (P.page.subsections || []).some(function (s) { return s !== except && s.id === x; }) || x === 'guide-map';
    });
  }

  function addSubsection(index) {
    form(subFields(), {}, function (v) {
      if (!v.title) v.title = 'New section';
      var s = { id: subId(v.title), title: v.title, blocks: [] };
      ['summary', 'hideTitle', 'hideFromToc'].forEach(function (k) { if (v[k]) s[k] = v[k]; });
      P.page.subsections = P.page.subsections || [];
      P.page.subsections.splice(index == null ? P.page.subsections.length : index, 0, s);
      changed('page');
      setTimeout(function () {
        typePicker(function (t) {
          var b = t.make(); b.type = t.type;
          editBlock(b, function (bv) { s.blocks.push(bv); changed('page'); }, true);
        }, 'First element for “' + s.title + '”');
      }, 50);
    }, 'Add a subsection', false, { saveLabel: 'Next: choose content →' });
  }

  function editSubsection(si) {
    var s = P.page.subsections[si];
    form(subFields(), s, function (v) {
      // The anchor id stays the same on rename so existing links (#id) keep working.
      Object.assign(s, v);
      ['summary', 'hideTitle', 'hideFromToc'].forEach(function (k) { if (!v[k]) delete s[k]; });
      changed('page');
    }, 'Edit subsection');
  }

  /* ---------- decorate: page ---------- */

  function toolbar(items, cls) {
    var tb = h('div', { class: 'p4a-ed p4a-ed-tools ' + (cls || '') });
    items.forEach(function (it) { if (it) tb.appendChild(btn(it[0], it[1], it[2] || '', it[3])); });
    return tb;
  }
  function addButton(label, fn, cls) {
    var w = h('div', { class: 'p4a-ed p4a-ed-addrow ' + (cls || '') });
    w.appendChild(btn(label, fn, 'p4a-ed-add'));
    return w;
  }

  function listFor(where, si) {
    if (where === 'intro') return (P.page.intro = P.page.intro || []);
    if (where === 'outro') return (P.page.outro = P.page.outro || []);
    var s = P.page.subsections[si];
    return (s.blocks = s.blocks || []);
  }

  function decoratePage(main) {
    var mh = main.querySelector('.p4a-masthead');
    if (mh) {
      mh.classList.add('p4a-ed-host');
      mh.appendChild(toolbar([['✎ Page settings', pageSettings, 'p4a-ed-primary']], 'p4a-ed-tools-static'));
    }

    main.querySelectorAll('.p4a-block').forEach(function (el) {
      var where = el.getAttribute('data-where'), si = +el.getAttribute('data-sub'), bi = +el.getAttribute('data-block');
      var list = listFor(where, si);
      var b = list[bi];
      el.classList.add('p4a-ed-host');
      var label = (TYPE[b.type] || { label: b.type }).label;
      el.appendChild(toolbar([
        [esc(label), function () {}, 'p4a-ed-label'],
        ['✎', function () { editBlock(b, function (v) { list[bi] = v; changed('page'); }); }, '', 'Edit'],
        ['↑', function () { move(list, bi, -1); changed('page'); }, '', 'Move up'],
        ['↓', function () { move(list, bi, 1); changed('page'); }, '', 'Move down'],
        ['⧉', function () { list.splice(bi + 1, 0, clone(b)); changed('page'); }, '', 'Duplicate'],
        ['+', function () { addBlockTo(list, bi + 1); }, '', 'Add an element after this'],
        ['✕', function () { confirmBox('Delete this ' + label.toLowerCase() + '?', function () { list.splice(bi, 1); changed('page'); }); }, 'danger', 'Delete']
      ]));
      el.addEventListener('dblclick', function (e) {
        if (e.target.closest('.p4a-ed')) return;
        e.preventDefault();
        editBlock(b, function (v) { list[bi] = v; changed('page'); });
      });
    });

    var intro = main.querySelector('.p4a-intro');
    if (intro) intro.appendChild(addButton('+ Add intro element (above the table of contents)', function () { addBlockTo(listFor('intro'), listFor('intro').length); }, 'subtle'));

    var subs = P.page.subsections || [];
    main.querySelectorAll('.p4a-sub').forEach(function (el) {
      var si = +el.getAttribute('data-sub');
      el.classList.add('p4a-ed-sub');
      var tb = toolbar([
        ['Subsection', function () {}, 'p4a-ed-label'],
        ['✎', function () { editSubsection(si); }, '', 'Edit title'],
        ['↑', function () { move(subs, si, -1); changed('page'); }, '', 'Move up'],
        ['↓', function () { move(subs, si, 1); changed('page'); }, '', 'Move down'],
        ['✕', function () { confirmBox('Delete the subsection “' + (subs[si].title || '') + '” and everything in it?', function () { subs.splice(si, 1); changed('page'); }); }, 'danger', 'Delete']
      ], 'p4a-ed-subtools');
      el.insertBefore(tb, el.firstChild);
      el.appendChild(addButton('+ Add element', function () { addBlockTo(listFor('sub', si), listFor('sub', si).length); }));
    });

    var outro = main.querySelector('.p4a-outro');
    var addSub = addButton('+ Add subsection', function () { addSubsection(); }, 'big');
    outro.parentNode.insertBefore(addSub, outro);
    outro.appendChild(addButton('+ Add closing element (after all subsections)', function () { addBlockTo(listFor('outro'), listFor('outro').length); }, 'subtle'));

    var meta = P.site.pages[P.pageId] || {};
    var sec = P.sectionOf(P.pageId);
    var canParts = (meta.parts && meta.parts.length) || (!P.parentOf(P.pageId) && sec && (sec.layout === 'topics' || sec.layout === 'projects'));
    if (canParts) {
      var gm = main.querySelector('.p4a-tocsec');
      var b = addButton('+ Add part (a new sub-page in this walkthrough)', addPart, 'parts');
      if (gm) gm.appendChild(b); else mh.parentNode.insertBefore(b, mh.nextSibling);
    }
  }

  /* ---------- decorate: home ---------- */

  function sectionFields(sec) {
    var f = [{ key: 'title', label: 'Section title', type: 'text' }];
    f.push({ key: 'description', label: 'Description', type: 'html' });
    if (sec.layout === 'resources') f.push({ key: 'links', label: 'Links', type: 'list', itemLabel: 'link', make: function () { return {}; },
      summary: function (l) { return l.label; },
      fields: [{ key: 'label', label: 'Name', type: 'text' }, { key: 'url', label: 'Link', type: 'link' }, { key: 'desc', label: 'Description', type: 'text' }] });
    return f;
  }

  function decorateHome(main) {
    main.querySelectorAll('.p4a-home-sec').forEach(function (el) {
      var si = +el.getAttribute('data-section');
      var sec = P.site.sections[si];
      el.classList.add('p4a-ed-host', 'p4a-ed-sub');
      el.insertBefore(toolbar([
        ['Section', function () {}, 'p4a-ed-label'],
        ['✎ Edit title & description' + (sec.layout === 'resources' ? ' & links' : ''), function () {
          form(sectionFields(sec), sec, function (v) { Object.assign(sec, v); if (!v.description) delete sec.description; changed('site'); }, 'Edit section', true);
        }],
        ['↑', function () { move(P.site.sections, si, -1); changed('site'); }, '', 'Move section up'],
        ['↓', function () { move(P.site.sections, si, 1); changed('site'); }, '', 'Move section down']
      ], 'p4a-ed-subtools'), el.firstChild);

      el.querySelectorAll('[data-item]').forEach(function (tile) {
        var ii = +tile.getAttribute('data-item');
        var id = sec.items[ii];
        tile.classList.add('p4a-ed-host', 'p4a-ed-tile');
        tile.appendChild(toolbar([
          ['✎', function () {
            var meta = P.site.pages[id];
            form(pageMetaFields(false), meta, function (v) { Object.assign(meta, v); if (!v.image) delete meta.image; changed('site'); }, 'Edit “' + meta.title + '”');
          }, '', 'Edit name, description, image'],
          ['←', function () { move(sec.items, ii, -1); changed('site'); }, '', 'Move earlier'],
          ['→', function () { move(sec.items, ii, 1); changed('site'); }, '', 'Move later'],
          ['✕', function () {
            confirmBox('Remove “' + P.title(id) + '” from ' + sec.title + '? The page itself is kept and can be added back from the sidebar or another section.', function () {
              sec.items.splice(ii, 1); changed('site');
            }, 'Remove');
          }, 'danger', 'Remove from this section']
        ], 'p4a-ed-tiletools'));
      });

      var slot = el.querySelector('[data-add="entry"]');
      if (slot) {
        var add = btn('+ Add new entry', function () { addEntry(sec); }, 'p4a-ed-add p4a-ed-entry');
        slot.replaceWith(add);
        var pick = h('select', { class: 'p4a-input p4a-ed p4a-ed-pick' }, '<option value="">+ Add an existing page…</option>' + pageOptions(false));
        pick.addEventListener('change', function () { if (pick.value && sec.items.indexOf(pick.value) === -1) { sec.items.push(pick.value); changed('site'); } });
        add.parentNode.appendChild(pick);
      }
    });
  }

  function addEntry(sec) {
    form([
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'summary', label: 'Description', type: 'text' },
      { key: 'image', label: 'Tile image (optional)', type: 'image' },
      { key: 'imageFit', label: 'Image fit', type: 'select', options: [['cover', 'Fill the tile'], ['contain', 'Fit inside (icons/logos)']] }
    ], {}, function (v) {
      if (!v.title) return false;
      var extra = {};
      if (v.image) { extra.image = v.image; extra.imageFit = v.imageFit; }
      var id = createPage(v.title, v.summary, extra);
      if (sec.layout === 'topics') {
        // A topic starts as a hub: overview, terminology, and everything tagged with it.
        A.newPages[id] = { subsections: [
          { id: 'overview', title: 'Overview', summary: 'What it is and why it matters.', blocks: [{ type: 'text', html: '' }] },
          { id: 'terminology', title: 'Terminology', summary: 'The words you will run into.', blocks: [{ type: 'columns', cols: 2, style: 'terms', items: [] }] },
          { id: 'everything', title: 'Everything on ' + v.title, summary: 'Guides, tools, checkers and resources.', blocks: [{ type: 'topic-index', cols: 3 }, { type: 'resources', style: 'list', items: [] }] }
        ] };
      }
      sec.items = (sec.items || []).concat([id]);
      changed('site');
      A.save().then(function () {
        modal('Entry created', h('p', null, '“' + esc(v.title) + '” was added to ' + esc(sec.title) + '. Open it to add subsections — until then it shows “In progress…”.'), [
          { label: 'Stay here', onclick: closeModal },
          { label: 'Open the new page →', cls: 'primary', onclick: function () { location.href = P.href(id); } }
        ]);
      });
    }, 'Add a new entry to ' + sec.title, false, { saveLabel: 'Create' });
  }

  /* ---------- sidebar + site ---------- */

  function sidebarEditor() {
    var sb = P.site.sidebar = P.site.sidebar || { groups: [] };
    var secOpts = [['', '— pick the links below —']].concat(P.site.sections.map(function (s) { return [s.id, 'Every entry in “' + s.title + '”']; }));
    form([{
      key: 'groups', label: 'Sidebar groups (shown under “On this page”)', type: 'list', itemLabel: 'group', make: function () { return { label: 'NEW GROUP', showOn: 'all', items: [] }; },
      summary: function (g) { return g.label; },
      fields: [
        { key: 'label', label: 'Group heading', type: 'text' },
        { key: 'showOn', label: 'Show on', type: 'select', options: [['all', 'Every page'], ['home', 'Home page only'], ['pages', 'Every page except home']] },
        { key: 'fromSection', label: 'Fill automatically from a section', type: 'select', options: secOpts },
        { key: 'items', label: 'Links (used when not filled from a section)', type: 'list', itemLabel: 'link', make: function () { return {}; },
          summary: function (it) { return it.page ? P.title(it.page) : it.label; },
          fields: [
            { key: 'page', label: 'Page (its name stays in sync)', type: 'page' },
            { key: 'label', label: 'or a custom label…', type: 'text' },
            { key: 'url', label: '…and link', type: 'link' }
          ] }
      ]
    }], sb, function (v) { P.site.sidebar = v; changed('site'); }, 'Edit sidebar', true);
  }

  function siteSettings() {
    form([
      { key: 'tagline', label: 'Home page tagline', type: 'html', small: true },
      { key: 'footer', label: 'Footer text', type: 'text' },
      { key: 'nav', label: 'Header links', type: 'list', itemLabel: 'link', make: function () { return {}; }, summary: function (n) { return n.label; },
        fields: [{ key: 'label', label: 'Label', type: 'text' }, { key: 'url', label: 'Link (#projects jumps to a home section)', type: 'link' }] }
    ], P.site, function (v) { Object.assign(P.site, v); changed('site'); }, 'Site settings', true);
  }

  /* ---------- hook in ---------- */

  P.afterRender.push(function (main) {
    document.body.classList.toggle('p4a-editing', !!P.editing);
    if (!P.editing) return;
    if (P.pageId === 'home') decorateHome(main); else decoratePage(main);
  });

  if (!P.site.pages[P.pageId] && P.pageId !== 'home') {
    // Unknown id (e.g. a new page not yet saved): give it a stub so it renders.
    P.site.pages[P.pageId] = { title: P.pageId };
  }
  buildBar();
})();
