# privacy4all

Served at https://soniapolis.com/privacy4all/ from `/var/www/iSonia/privacy4all/`.

## How pages work

Every page is a thin HTML shell (`<body data-page="id">`) that loads `js/p4a.js`,
which renders the whole page from JSON:

- `data/site.json` — sections, page names, parts, sidebar (server copy, written by the admin)
- `data/pages/<id>.json` — one page's subsections and content blocks
- `seed/…` — the starting copy, used until a `data/` file has been saved

`data/` and `images/uploads/` are gitignored: they are live content on the server,
so a `git pull` never touches them. A page's name is stored once
(`site.json → pages[id].title`), so renaming it anywhere renames it everywhere.

## Admin

Log in with the soniapolis.com admin login (`/admin/login.html`, the "admin" link in
the footer). The same PHP session unlocks `js/p4a-admin.js`, which adds edit controls
and an admin bar. Saves go through `api/save.php`, which backs up the previous file to
`data/backups/` first. Images upload through `api/upload.php` into `images/uploads/`.

New pages created in the browser live at `page.html?id=<id>`. Pages with their own
file (`path` in site.json) need a shell — `python3 tools/build_shells.py` writes them.
Bump `VERSION` in `tools/build_shells.py` and `js/p4a.js` when changing js/css
(nginx caches them for 30 days), then re-run the script.

The pre-conversion HTML pages are kept in `archive/pre-cms/`.
