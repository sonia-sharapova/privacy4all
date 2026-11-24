"""Write the thin HTML shell for every page in seed/site.json that has a `path`.

Each shell only names its page id; js/p4a.js renders everything from JSON.
Pages created in the browser admin don't need a shell — they live at
page.html?id=<id>. Run this after adding a page with a `path` by hand, or after
changing VERSION (bump it whenever js/ or style/ files change: nginx caches
them for 30 days).

    python3 tools/build_shells.py
"""
import html, json, os, sys

VERSION = '20261129'
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = ('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&amp;family=Averia+Libre:wght@700'
         '&amp;family=Poppins:wght@500;600;700&amp;family=Alef:wght@400&amp;family=Istok+Web:wght@400;700&amp;display=swap')

def shell(page_id, title, root):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="{root}styles.css?v={VERSION}">
<link rel="stylesheet" href="{root}style/p4a-blocks.css?v={VERSION}">
</head>
<body data-page="{page_id}" data-root="{root}">
<noscript><p style="padding:40px;font-family:sans-serif">{html.escape(title)} — this site needs JavaScript to display its content.</p></noscript>
<script src="{root}js/p4a.js?v={VERSION}"></script>
</body>
</html>
'''

def write(rel, page_id, title):
    depth = rel.count('/')
    path = os.path.join(HERE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(shell(page_id, title, '../' * depth))

def redirect(rel, target):
    depth = rel.count('/')
    to = '../' * depth + target
    with open(os.path.join(HERE, rel), 'w', encoding='utf-8') as f:
        f.write(f'<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url={to}">'
                f'<link rel="canonical" href="{to}"><title>Moved — privacy4all</title></head>\n'
                f'<body><p>This page has moved: <a href="{to}">continue</a>.</p></body></html>\n')

site = json.load(open(os.path.join(HERE, 'seed', 'site.json'), encoding='utf-8'))
write('index.html', 'home', 'privacy4all')
write('page.html', '?', 'privacy4all')
n = 2
for pid, p in site['pages'].items():
    if p.get('path'):
        write(p['path'], pid, p['title'] + ' — privacy4all'); n += 1
# Old URLs that now live elsewhere.
redirect('guides/browser-privacy/browser-privacy.html', 'browser-privacy/index.html')
redirect('browser-privacy/browsers.html', 'browser-privacy/index.html#recommended')
redirect('quick-action/google-alternatives.html', 'quick-action/alternatives.html')
redirect('guides/storage/storage.html', 'guides/personal-data-tracking/overview.html')
redirect('advanced/cloud-storage-files/sharing-files-with-others.html', 'guides/personal-data-tracking/file-sharing.html')
redirect('advanced/cloud-storage-files/overview.html', 'guides/personal-data-tracking/overview.html')
print(f'wrote {n} shells (v{VERSION})', file=sys.stderr)
