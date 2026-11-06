import { createSky } from './scene.js';

const WHATSAPP = '5519999997736';
const MESSAGES = {
  geral: 'Olá! Vim pelo site da Mellow Fun e quero consultar uma data.',
  castelinho: 'Olá! Vim pelo site e quero saber a disponibilidade do Castelinho para a minha festa.',
  bubble: 'Olá! Vim pelo site e quero saber a disponibilidade da Bubble House para a minha festa.',
  juntos: 'Olá! Vim pelo site e quero o Castelinho e a Bubble House juntos na minha festa.',
  casamento: 'Olá! Vim pelo site e quero consultar os infláveis para o meu casamento.',
  aniversario: 'Olá! Vim pelo site e quero consultar os infláveis para um aniversário.',
  celebracao: 'Olá! Vim pelo site e quero consultar os infláveis para uma celebração.',
};
const COLORS = [
  { id: 'rosa', name: 'Rosa', hex: '#F2B3BF' },
  { id: 'amarelo', name: 'Amarelo', hex: '#F6E3A1' },
  { id: 'menta', name: 'Menta', hex: '#BFE5D1' },
  { id: 'azul', name: 'Azul', hex: '#B2C0D8' },
  { id: 'lilas', name: 'Lilás', hex: '#D3C3EA' },
  { id: 'pessego', name: 'Pêssego', hex: '#F4C7A8' },
  { id: 'branco', name: 'Branco', hex: '#FFFFFF' },
  { id: 'cristal', name: 'Cristal', hex: 'cristal' },
];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const waUrl = text => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

$$('[data-wa]').forEach(a => {
  a.href = waUrl(MESSAGES[a.dataset.wa]);
  a.target = '_blank'; a.rel = 'noopener';
});

// ===== Céu de balões =====
const contact = $('#contato'), flyEl = $('#voo');
const skyEl = $('#sky'), heroImg = $('#heroImg'), heroClip = $('.hero-clip'), heroCopy = $('#inicio');
let sky = null;
// Altura estável: no iOS/Android a barra do navegador muda innerHeight ao rolar, clientHeight não (é o 100svh do pin).
const viewH = () => document.documentElement.clientHeight || innerHeight;
const wideHero = () => innerWidth >= 1000;
try {
  sky = createSky($('#sky'), { reduced });
} catch (e) {
  $('#sky').hidden = true;
}

addEventListener('pointerdown', e => {
  if (!sky || e.target.closest('a, button, input, label, summary, form')) return;
  sky.tryPop(e.clientX, e.clientY);
}, { passive: true });

// ===== Voo: a rolagem move uma câmera em profundidade =====
const flying = document.documentElement.classList.contains('voo');
const items = $$('.hero, .line, .cap, .portal').map(el => ({
  el, at: +el.dataset.at, x: +(el.dataset.x || 0), y: +(el.dataset.y || 0),
  portal: el.classList.contains('portal'), hero: el.classList.contains('hero'), cap: el.classList.contains('cap'),
  copy: $('.portal-copy', el), video: $('video', el), on: false,
}));
const stops = items.filter(i => !i.cap).sort((a, b) => a.at - b.at);
const LAST = stops.at(-1).at, HOLD = 0.12, TAIL = 0.3;
// Perspectiva (igual ao CSS) e distância em Z entre uma parada e a próxima.
const PERSP = 500, DEPTH = PERSP * 3.6;
const scaleAt = d => 1 / (1 + Math.max(d, -0.26) * DEPTH / PERSP);
const flatSections = $$('main > section[data-bg]');
const quoteForm = $('#quote');
let segPx = 1, cam = 0, currentBg = '', currentFlat = null;
let H = null;

function setBg(c) { if (c !== currentBg) { document.body.style.backgroundColor = c; currentBg = c; } }

// Fotos de abertura: alternam no painel; a atual abre até cobrir a tela e a câmera mergulha nela.
const shots = $$('img', heroImg);
const BUBBLE = { x: 0.5, y: 0.42 };
let shot = 0, shotT = 0;
function setShot(n) {
  shot = (n + shots.length) % shots.length;
  shots.forEach((im, i) => im.classList.toggle('on', i === shot));
  const [x, y] = (shots[shot].dataset.dive || '0.5 0.42').split(' ').map(Number);
  BUBBLE.x = x; BUBBLE.y = y;
  measure();
}
function measure() {
  if (!flying) return;
  const vw = innerWidth, vh = viewH();
  segPx = Math.max(1, vh * 1.1); // nunca zero: a câmera divide por isso
  flyEl.style.setProperty('--seg', segPx + 'px');
  flyEl.style.setProperty('--stops', LAST + TAIL);
  const wide = wideHero();
  const top = wide ? 0 : Math.min(vh * 0.62, Math.max(vh * 0.46, heroCopy.offsetHeight + 8));
  const panel = wide ? { x: vw * 0.42, y: 0, w: vw * 0.58, h: vh } : { x: 0, y: top, w: vw, h: vh - top };
  const w0 = Math.max(panel.w, panel.h * 0.75), h0 = w0 * 4 / 3;
  const fit = (p, size, a, len) => clamp(p, a + len - size, a);
  const tx = fit(panel.x + panel.w / 2 - BUBBLE.x * w0, w0, panel.x, panel.w);
  const ty = fit(panel.y + panel.h / 2 - BUBBLE.y * h0, h0, panel.y, panel.h);
  const s1 = Math.max(vw / w0, vh / h0) * 1.02;
  H = { panel, w0, h0, px: tx + BUBBLE.x * w0, py: ty + BUBBLE.y * h0, s1, wide };
  heroImg.style.width = w0 + 'px';
  heroImg.style.height = h0 + 'px';
  // Deslocamento de cada bloco em px (a profundidade é aplicada por frame em drawItem).
  items.forEach(i => {
    let x = i.x, y = i.y;
    if (i.cap) { // a foto não pode sair da tela nem passar por baixo do menu
      const xMax = 50 - (i.el.offsetWidth / 2 + 8) / vw * 100, yMax = 50 - (i.el.offsetHeight / 2 + 64) / vh * 100;
      x = Math.sign(x) * Math.min(Math.abs(x), xMax); y = Math.sign(y) * Math.min(Math.abs(y), yMax);
    }
    i.px = x * vw / 100; i.py = y * vh / 100;
  });
}

function drawHero(c) {
  if (!H) return;
  const vw = innerWidth, vh = viewH(), { panel: P } = H;
  const a = ease(clamp(c / 0.42)), g = clamp((c - 0.42) / 0.58);
  const s = lerp(1, H.s1, a) * (1 + g * g * 7);
  const px = lerp(H.px, vw / 2, a), py = lerp(H.py, vh / 2, a);
  const fade = 1 - clamp((g - 0.5) / 0.5);
  heroImg.style.transform = `translate3d(${(px - BUBBLE.x * H.w0 * s).toFixed(1)}px, ${(py - BUBBLE.y * H.h0 * s).toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
  const left = lerp(P.x, 0, a), top = lerp(P.y, 0, a), r = lerp(H.wide ? 44 : 30, 0, a);
  heroClip.style.clipPath = `inset(${top.toFixed(1)}px 0 0 ${left.toFixed(1)}px round ${r.toFixed(1)}px 0 0 ${r.toFixed(1)}px)`;
  heroClip.style.opacity = fade;
  heroClip.style.visibility = fade > 0 ? 'visible' : 'hidden';
}

// A perspectiva do CSS faz o bloco crescer ao chegar e passar por você ao sair;
// aqui só entram opacidade e detalhes que dependem da distância.
function drawItem(i, c) {
  const d = i.at - c, k = scaleAt(d);
  let op;
  if (i.hero) {
    // O texto de abertura fica em 2D (cancela a profundidade da cena): nítido, e só desliza
    // enquanto a foto faz o mergulho. No desktop sai pela esquerda, no celular sobe.
    const t = ease(clamp(c / 0.2));
    const dx = H?.wide ? -t * innerWidth * 0.12 : 0, dy = H?.wide ? 0 : -t * viewH() * 0.3;
    i.el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    op = 1 - clamp(c / 0.2);
  } else {
    // Cada bloco anda em Z por conta própria (se a cena inteira andasse, o Chrome não acharia
    // os cliques: a cena ficaria "atrás da câmera"). Nunca passa do plano do olho (500px).
    const z = Math.min((c - i.at) * DEPTH, PERSP - 40);
    i.el.style.transform = `translate3d(${i.px.toFixed(1)}px, ${i.py.toFixed(1)}px, ${z.toFixed(1)}px)`;
    // Saída curta e opaca: cresce até ~1,8x "passando por você" e só então some (texto ampliado borra).
    // As fotos (.cap) passam voando entre as frases 2 e 3 e já sumiram quando a câmera para: nada atrás do texto.
    const near = i.cap ? 0.2 : i.portal ? 0.4 : 0.32, ramp = i.cap ? 0.3 : 0.6, out = i.portal ? 0.14 : 0.12;
    op = d > 0 ? clamp(1 - (d - near) / ramp) : 1 - Math.pow(clamp(-d / out), 2);
  }
  if (i.portal) {
    i.el.classList.toggle('near', k >= 0.995);
    i.copy.style.opacity = clamp(1 - Math.abs(d) / 0.16);
  }
  i.el.style.opacity = op.toFixed(3);
  if (i.cap) i.el.style.visibility = op > 0 ? 'visible' : 'hidden';
  const live = op > 0.6 && Math.abs(d) < 0.3;
  if (live !== i.on) { i.on = live; i.el.style.pointerEvents = live ? 'auto' : 'none'; }
  if (i.video) {
    if (op > 0.02) loadVideo(i.video);
    playWhen(i.video, d < 0.6 && d > -0.08); // toca só perto; pausa assim que sai do foco
  }
}

function loadVideo(v) {
  const src = $('source', v);
  if (src?.dataset.src) { src.src = src.dataset.src; delete src.dataset.src; v.load(); }
}
function playWhen(v, on) {
  if (on) { if (v.paused && !reduced) v.play().catch(() => {}); }
  else if (!v.paused) v.pause();
}

// Segura em cada parada para dar tempo de ler.
function camAt(p) {
  const i = Math.floor(p), f = p - i;
  if (i >= LAST) return LAST;
  const hold = i === 0 ? 0 : HOLD;
  return i + (f < hold ? 0 : ease((f - hold) / (1 - hold)));
}

function scrollFor(at) { return flyEl.offsetTop + at * segPx + (at ? 2 : 0); }

function updateScene(dt, raw) {
  const inFly = flying && flyEl.getBoundingClientRect().bottom > innerHeight * 0.5;
  document.body.classList.toggle('flat', !inFly);
  if (flying) {
    const target = camAt(Math.max(0, scrollY - flyEl.offsetTop) / segPx);
    // Depois de uma pausa longa (aba oculta), a câmera salta direto para a parada.
    cam = reduced || raw > 0.25 || !Number.isFinite(cam) ? target : cam + (target - cam) * (1 - Math.exp(-9 * dt));
    if (Math.abs(target - cam) < 0.0004) cam = target;
    // Enquanto a câmera está parada na abertura, as fotos se revezam.
    shotT += Math.min(raw, 0.5);
    if (cam < 0.03 && shotT > 4.2) { shotT = 0; setShot(shot + 1); }
    drawHero(cam);
    items.forEach(i => drawItem(i, cam));
    sky?.fly(cam * 17);
  }

  const mid = innerHeight / 2;
  const sec = flatSections.find(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
  if (inFly) {
    const stop = stops[Math.min(stops.length - 1, Math.round(cam))];
    setBg(stop.el.dataset.bg);
    const gap = Math.abs(cam - stop.at);
    skyEl.style.opacity = (clamp((cam - 0.32) / 0.3) * (stop.portal ? clamp(gap / 0.3) : 1)).toFixed(3);
  } else {
    if (sec) { setBg(sec.dataset.bg); currentFlat = sec; }
    skyEl.style.opacity = sec === contact ? 1 : 0;
  }
  sky?.setActive(+skyEl.style.opacity > 0.01);
}

// Links internos e teclado levam à parada certa do voo.
function goTo(i, smooth = true) {
  scrollTo({ top: scrollFor(i.at), behavior: smooth && !reduced ? 'smooth' : 'instant' });
  i.el.focus({ preventScroll: true }); // o teclado segue junto
}
if (flying) {
  stops.forEach(i => i.el.setAttribute('tabindex', '-1'));
  addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    const stop = a && stops.find(i => '#' + i.el.id === a.getAttribute('href'));
    if (stop) { e.preventDefault(); goTo(stop); }
  });
  // "Quero o Castelinho": vai ao orçamento com o brinquedo já marcado.
  addEventListener('click', e => {
    const a = e.target.closest('a[data-pick]');
    if (!a) return;
    const r = $(`input[name="brinquedo"][value="${a.dataset.pick}"]`, quoteForm);
    if (r) { r.checked = true; quoteForm.dispatchEvent(new Event('change')); }
  });
  // Tab para dentro de um bloco distante leva a câmera até ele (o foco vindo do goTo não conta).
  flyEl.addEventListener('focusin', e => {
    const stop = stops.find(i => i.el.contains(e.target));
    if (stop && e.target !== stop.el && Math.abs(cam - stop.at) > 0.05) goTo(stop, false);
  });
}

// Celular fraco: reduz a resolução do 3D para manter a rolagem leve.
let last = performance.now(), slow = 0, frames = 0, lowered = false;
function watchFps(ms) {
  if (lowered || document.hidden) return;
  frames++; if (ms > 34) slow++;
  if (frames < 120) return;
  if (slow > 60) { lowered = true; sky?.lowQuality(); }
  frames = slow = 0;
}

// Se o navegador segura o requestAnimationFrame (aba oculta, painel em segundo plano),
// um vigia chama o quadro por temporizador para a cena não voltar "congelada".
let rafId = 0, watchdog = 0;
function schedule() {
  rafId = requestAnimationFrame(frame);
  clearTimeout(watchdog);
  watchdog = setTimeout(() => { cancelAnimationFrame(rafId); frame(performance.now()); }, 300);
}
function frame(now) {
  clearTimeout(watchdog);
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw);
  watchFps(now - last);
  last = now;
  updateScene(dt, raw);
  sky?.tick(dt, scrollY);
  schedule();
}
addEventListener('resize', () => { sky?.resize(); measure(); });
measure();
const hashStop = stops.find(i => '#' + i.el.id === location.hash);
if (flying && hashStop && hashStop.at) { goTo(hashStop, false); cam = hashStop.at; } // já nasce na parada, sem voar até ela

// ===== Vídeos só tocam quando estão na tela =====
const vio = new IntersectionObserver(entries => entries.forEach(({ target: v, isIntersecting }) => {
  if (isIntersecting) { loadVideo(v); if (!reduced) v.play().catch(() => {}); }
  else v.pause();
}), { rootMargin: '120px' });
$$('main > section:not(#voo) video[data-lazy]').forEach(v => vio.observe(v));

// ===== Monte sua mensagem =====
const sw = $('#swatches');
sw.innerHTML = COLORS.map(c => {
  const bg = c.id === 'cristal' ? 'radial-gradient(circle at 35% 30%, #fff, rgba(255,255,255,.45) 60%, rgba(178,192,216,.75))' : c.hex;
  return `<label title="${c.name}"><input type="checkbox" name="cor" value="${c.id}" aria-label="${c.name}"><span style="background:${bg}"></span></label>`;
}).join('');

const DEFAULT_SKY = ['#F2B3BF', 'cristal', '#FFFFFF', '#BFE5D1', '#F2B3BF', 'cristal'];
sky?.setColors(DEFAULT_SKY);

sw.addEventListener('change', e => {
  const on = $$('input:checked', sw);
  if (on.length > 4) { e.target.checked = false; return; }
  const list = $$('input:checked', sw).map(i => COLORS.find(c => c.id === i.value).hex);
  sky?.setColors(list.length ? list : DEFAULT_SKY);
});

// O link é atualizado a cada escolha para abrir direto, sem bloqueio de pop-up.
const quote = $('#quote'), send = $('#send');
function updateSend() {
  const f = new FormData(quote);
  const cores = f.getAll('cor').map(id => COLORS.find(c => c.id === id).name.toLowerCase());
  const data = f.get('data') ? f.get('data').split('-').reverse().join('/') : '';
  const lines = ['Olá! Vim pelo site da Mellow Fun e quero consultar uma data.', ''];
  if (f.get('festa')) lines.push(`Festa: ${f.get('festa')}`);
  if (f.get('brinquedo')) lines.push(`Brinquedo: ${f.get('brinquedo')}`);
  if (cores.length) lines.push(`Cores dos balões: ${cores.join(', ')}`);
  if (data) lines.push(`Data: ${data}`);
  if (f.get('cidade')) lines.push(`Cidade: ${f.get('cidade').trim()}`);
  send.href = waUrl(lines.join('\n').trim());
}
quote.addEventListener('input', updateSend);
quote.addEventListener('change', updateSend);
quote.addEventListener('submit', e => e.preventDefault());
updateSend();
schedule();
