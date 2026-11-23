// Theme "Glass" slider: scales content panel opacity + blur via --glass on <html>.
(function () {
  var KEY = 'p4a-glass';
  var root = document.documentElement;
  var input = document.getElementById('theme-glass');

  function apply(v) {
    root.style.setProperty('--glass', (v / 100).toString());
    root.setAttribute('data-glass', '');
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved !== null && !isNaN(+saved)) apply(+saved);

  if (!input) return;
  if (saved !== null && !isNaN(+saved)) input.value = saved;

  input.addEventListener('input', function () {
    apply(+input.value);
    try { localStorage.setItem(KEY, input.value); } catch (e) {}
  });

  // The slider has no effect with high contrast on or the backdrop hidden.
  var contrast = document.getElementById('theme-contrast');
  var backdrop = document.getElementById('theme-backdrop');
  function sync() {
    input.disabled = !!((contrast && contrast.checked) || (backdrop && !backdrop.checked));
  }
  if (contrast) contrast.addEventListener('change', sync);
  if (backdrop) backdrop.addEventListener('change', sync);
  sync();
})();
