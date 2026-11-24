#target aftereffects
/*
 * Fawwad Zaheer Rizvi: portfolio promo, rebuilt as a native After Effects project.
 *
 * HOW TO USE
 *   1. Install the fonts in tools/promo/ (PressStart2P.ttf, PlexMono-Medium.ttf, PlexMono-Bold.ttf):
 *      right-click each > Install for all users. Restart After Effects afterwards.
 *   2. After Effects > File > Scripts > Run Script File... > choose this file.
 *   3. It imports the footage from public/, builds every scene as its own composition,
 *      and saves  tools/promo/ae/Fawwad_Promo.aep  (and queues a render of PROMO_MAIN).
 *
 * Everything stays editable: text layers, shape layers, keyframes, effects, expressions.
 * Timeline (120 BPM, 1 bar = 2 s) matches public/video/promo.mp4 and docs/video-storyboard.md.
 *
 * Written in ExtendScript (ES3): no let/const, arrow functions, template strings or JSON.
 */
(function () {
  var HERE = File($.fileName).parent; // tools/promo/ae
  var ROOT = HERE.parent.parent.parent; // project root
  var W = 1920, H = 1080, FPS = 30;
  var warnings = [];

  // ------------------------------------------------------------------ palette & fonts
  var C = {
    lightest: [224, 248, 208], light: [136, 192, 112], dark: [52, 104, 86], darkest: [8, 24, 32],
    black: [0, 0, 0], white: [255, 255, 255]
  };
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  C.grid = mixc(C.darkest, C.dark, 0.35);
  C.row = mixc(C.darkest, C.dark, 0.45);
  function rgb(a) { return [a[0] / 255, a[1] / 255, a[2] / 255]; }

  var FONT = { pix: 'PressStart2P-Regular', mono: 'IBMPlexMono-Medium', monoB: 'IBMPlexMono-Bold' };
  // baseline offsets (fraction of font size) to place text by its top edge ("la") or centre ("mm")
  var ASC = { pix: 0.875, mono: 0.98, monoB: 0.98 };
  var MID = { pix: 0.44, mono: 0.36, monoB: 0.36 };
  var ADV = { pix: 1.0, mono: 0.6, monoB: 0.6 }; // character advance (both fonts are monospaced)

  function attempt(label, fn) {
    try { return fn(); } catch (e) { warnings.push(label + ': ' + e.toString()); return null; }
  }

  // ------------------------------------------------------------------ project & import
  app.newProject();
  var proj = app.project;
  app.beginUndoGroup('Build Fawwad promo');

  var F = {
    comps: proj.items.addFolder('01 Main'),
    scenes: proj.items.addFolder('02 Scenes'),
    pre: proj.items.addFolder('03 Precomps (crops)'),
    footage: proj.items.addFolder('04 Footage'),
    audio: proj.items.addFolder('05 Audio'),
    images: proj.items.addFolder('06 Images')
  };

  function importRel(rel, folder) {
    var f = new File(ROOT.absoluteURI + '/' + rel);
    if (!f.exists) { warnings.push('Missing file: ' + rel); return null; }
    var item = attempt('import ' + rel, function () { return proj.importFile(new ImportOptions(f)); });
    if (item) item.parentFolder = folder;
    return item;
  }

  var M = {
    ship: importRel('public/media/games/ship-brawl/video.mp4', F.footage),
    bd: importRel('public/media/games/base-defenders/video.mp4', F.footage),
    de: importRel('public/media/games/dungeon-escape/video.mp4', F.footage),
    axe: importRel('public/media/models/low-poly-axe/video.mp4', F.footage),
    pistol: importRel('public/media/models/low-poly-pistol/video.mp4', F.footage),
    mship: importRel('public/media/models/low-poly-ship/video.mp4', F.footage),
    mchar: importRel('public/media/models/low-poly-character/video.mp4', F.footage),
    portrait: importRel('public/media/fawwad-portrait.jpg', F.images),
    music: importRel('public/video/soundtrack.wav', F.audio)
  };

  // ------------------------------------------------------------------ helpers
  function newComp(name, dur, folder, bg) {
    var c = proj.items.addComp(name, W, H, 1, dur, FPS);
    c.bgColor = rgb(bg || C.darkest);
    c.parentFolder = folder;
    return c;
  }

  function span(layer, tin, tout) {
    if (tout !== undefined) layer.outPoint = tout;
    if (tin !== undefined) layer.inPoint = tin;
    return layer;
  }

  function tr(layer, name) { return layer.property('ADBE Transform Group').property(name); }
  function pos(layer) { return tr(layer, 'ADBE Position'); }
  function scl(layer) { return tr(layer, 'ADBE Scale'); }
  function opa(layer) { return tr(layer, 'ADBE Opacity'); }

  function easeDims(p) {
    var t = p.propertyValueType;
    if (t === PropertyValueType.TwoD || t === PropertyValueType.ThreeD) return p.value.length;
    return 1;
  }
  function easeAll(p, influence) {
    var n = easeDims(p), k, i, e = [];
    for (i = 0; i < n; i++) e.push(new KeyframeEase(0, influence || 70));
    for (k = 1; k <= p.numKeys; k++) attempt('ease', function () { p.setTemporalEaseAtKey(k, e, e); });
  }
  function hold(p) {
    for (var k = 1; k <= p.numKeys; k++) p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD);
  }
  function keys(p, list, easeIt) { // list = [[t, v], ...]
    for (var i = 0; i < list.length; i++) p.setValueAtTime(list[i][0], list[i][1]);
    if (easeIt) easeAll(p, easeIt === true ? 70 : easeIt);
  }
  function appearAt(layer, t) { // instant on at t (hold keyframes)
    if (t <= 0) return;
    var o = opa(layer);
    o.setValueAtTime(0, 0);
    o.setValueAtTime(t, 100);
    hold(o);
  }

  function effect(layer, matchName, params) {
    return attempt('effect ' + matchName, function () {
      var fx = layer.property('ADBE Effect Parade').addProperty(matchName);
      for (var name in params) {
        if (!params.hasOwnProperty(name)) continue;
        (function (n, v) {
          attempt(matchName + ' > ' + n, function () { fx.property(n).setValue(v); });
        })(name, params[name]);
      }
      return fx;
    });
  }

  function hardShadow(layer, color, dist) {
    var fx = effect(layer, 'ADBE Drop Shadow', { 'Shadow Color': rgb(color), 'Direction': 135, 'Distance': dist, 'Softness': 0 });
    if (fx) attempt('shadow opacity', function () {
      try { fx.property('Opacity').setValue(255); } catch (e) { fx.property('Opacity').setValue(100); }
    });
  }

  /** Text layer. anchor 'la' = (x, y) is the top-left; 'mm' = (x, y) is the centre; 'ra' = top-right. */
  function text(c, str, font, size, color, x, y, anchor, o) {
    o = o || {};
    var l = c.layers.addText(str);
    l.name = o.name || str.substr(0, 30);
    var sp = l.property('ADBE Text Properties').property('ADBE Text Document');
    var td = sp.value;
    attempt('reset text style', function () { td.resetCharStyle(); td.resetParagraphStyle(); });
    attempt('font ' + FONT[font], function () { td.font = FONT[font]; });
    td.fontSize = size;
    td.applyFill = true;
    td.fillColor = rgb(color);
    td.applyStroke = false;
    td.tracking = 0;
    td.justification = anchor === 'mm' ? ParagraphJustification.CENTER_JUSTIFY
      : anchor === 'ra' ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
    sp.setValue(td);
    var by = anchor === 'mm' ? y + MID[font] * size : y + ASC[font] * size;
    pos(l).setValue([x, by]);
    if (o.shadow) hardShadow(l, o.shadow[0], o.shadow[1]);
    if (o.typeAt !== undefined) typewriter(l, o.typeAt, o.cps || 30, str.length);
    span(l, o['in'], o.out);
    return l;
  }
  function textWidth(str, font, size) { return str.length * ADV[font] * size; }

  /** Typewriter reveal with a Text Animator (opacity 0 + Range Selector start 0 -> 100). */
  function typewriter(l, t0, cps, n) {
    attempt('typewriter', function () {
      var anims = l.property('ADBE Text Properties').property('ADBE Text Animators');
      var an = anims.addProperty('ADBE Text Animator');
      an.name = 'Typewriter';
      an.property('ADBE Text Animator Properties').addProperty('ADBE Text Opacity').setValue(0);
      var sel = an.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
      var st = sel.property('ADBE Text Percent Start');
      st.setValueAtTime(t0, 0);
      st.setValueAtTime(t0 + Math.max(n, 1) / cps, 100);
      attempt('selector smoothness', function () {
        sel.property('ADBE Text Range Advanced').property('ADBE Text Selector Smoothness').setValue(0);
      });
    });
  }

  /** Shape-layer rectangle placed by its top-left corner. */
  function rect(c, x, y, w, h, o) {
    o = o || {};
    var l = c.layers.addShape();
    l.name = o.name || 'Rect';
    var g = l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    var v = g.property('ADBE Vectors Group');
    v.addProperty('ADBE Vector Shape - Rect').property('ADBE Vector Rect Size').setValue([w, h]);
    if (o.stroke) {
      var s = v.addProperty('ADBE Vector Graphic - Stroke');
      s.property('ADBE Vector Stroke Color').setValue(rgb(o.stroke));
      s.property('ADBE Vector Stroke Width').setValue(o.sw || 4);
    }
    if (o.fill) {
      var f = v.addProperty('ADBE Vector Graphic - Fill');
      f.property('ADBE Vector Fill Color').setValue(rgb(o.fill));
      if (o.fillOpacity !== undefined) f.property('ADBE Vector Fill Opacity').setValue(o.fillOpacity);
    }
    pos(l).setValue([x + w / 2, y + h / 2]);
    span(l, o['in'], o.out);
    return l;
  }
  /** Rectangle with a hard offset drop shadow (two layers). Returns [shadow, box]. */
  function box(c, x, y, w, h, o) {
    var sh = rect(c, x + (o.soff || 10), y + (o.soff || 10), w, h, { fill: o.shadow || C.darkest, name: (o.name || 'Box') + ' shadow', 'in': o['in'], out: o.out });
    var b = rect(c, x, y, w, h, { fill: o.fill, stroke: o.stroke, sw: o.sw, fillOpacity: o.fillOpacity, name: o.name || 'Box', 'in': o['in'], out: o.out });
    return [sh, b];
  }

  /** Pixel tick mark (shape path). */
  function check(c, x, y, s, color, o) {
    var l = c.layers.addShape();
    l.name = 'Check';
    var v = l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group');
    var path = v.addProperty('ADBE Vector Shape - Group');
    var shp = new Shape();
    shp.vertices = [[0, 3 * s], [2.5 * s, 5.5 * s], [8 * s, 0]];
    shp.closed = false;
    path.property('ADBE Vector Shape').setValue(shp);
    var st = v.addProperty('ADBE Vector Graphic - Stroke');
    st.property('ADBE Vector Stroke Color').setValue(rgb(color));
    st.property('ADBE Vector Stroke Width').setValue(s * 1.3);
    pos(l).setValue([x, y]);
    span(l, o && o['in'], o && o.out);
    return l;
  }

  /** Null that groups layers (children keep their place; animate the null). */
  function group(c, name, x, y, children) {
    var n = c.layers.addNull();
    n.name = name;
    pos(n).setValue([x, y]);
    for (var i = 0; i < children.length; i++) if (children[i]) children[i].parent = n;
    return n;
  }
  function popIn(nullLayer, t, from) {
    keys(scl(nullLayer), [[t, [from || 0, from || 0]], [t + 0.15, [112, 112]], [t + 0.25, [100, 100]]], 60);
  }

  /** Crop a region of a footage item into its own precomp (removes Blender UI). */
  function cropComp(name, item, cx, cy, cw, ch) {
    var c = proj.items.addComp(name, cw, ch, 1, item.duration, FPS);
    c.parentFolder = F.pre;
    var l = c.layers.add(item);
    pos(l).setValue([item.width / 2 - cx, item.height / 2 - cy]);
    l.audioEnabled = false;
    return c;
  }

  /**
   * Footage clip with a Ken Burns move, matching make_promo.py: the source is cover-fit to the
   * frame, then a window of zoom z (1 = whole frame) centred near (cx, cy) fills the screen.
   */
  function clip(c, item, srcStart, tin, dur, z0, z1, cx, cy, o) {
    o = o || {};
    var l = c.layers.add(item);
    l.startTime = tin - srcStart / (o.speed || 1);
    if (o.speed && o.speed !== 1) l.stretch = 100 / o.speed;
    span(l, tin, tin + dur);
    var sw = item.width, sh = item.height;
    var k = Math.max(1280 / sw, 720 / sh);
    function frame(z) {
      var ww = 1280 / z, wh = 720 / z;
      var wcx = Math.min(Math.max(cx * 1280, ww / 2), 1280 - ww / 2);
      var wcy = Math.min(Math.max(cy * 720, wh / 2), 720 - wh / 2);
      var m = 1.5 * z;
      return { s: k * m * 100, p: [960 + (640 - wcx) * m, 540 + (360 - wcy) * m] };
    }
    var a = frame(z0), b = frame(z1);
    keys(scl(l), [[tin, [a.s, a.s]], [tin + dur, [b.s, b.s]]]);
    keys(pos(l), [[tin, a.p], [tin + dur, b.p]]);
    if (o.db !== undefined && l.hasAudio) attempt('audio level', function () {
      l.property('ADBE Audio Group').property('ADBE Audio Levels').setValue([o.db, o.db]);
    });
    if (o.noAudio) l.audioEnabled = false;
    return l;
  }

  /** Scrolling pixel grid background (Grid effect, anchor driven by an expression). */
  function gridBg(c, dur) {
    var s = c.layers.addSolid(rgb(C.darkest), 'Grid BG', W, H, 1, dur);
    var fx = effect(s, 'ADBE Grid', { 'Width': 48, 'Border': 2, 'Color': rgb(C.grid) });
    if (fx) attempt('grid scroll', function () {
      fx.property('Anchor').expression = '[0, (time * 40) % 48]';
    });
    return s;
  }

  function stageCard(c, label, title) {
    var bg = rect(c, 0, 0, W, H, { fill: C.darkest, name: 'Card BG', out: 0.8 });
    var bar = rect(c, 0, H - 16, W, 16, { fill: C.light, name: 'Card bar', out: 0.8 });
    var lab = text(c, label, 'pix', 96, C.lightest, 960, 490, 'mm', { shadow: [C.dark, 8], out: 0.8 });
    keys(scl(lab), [[0, [83, 83]], [0.25, [100, 100]]], 60);
    var ttl = text(c, title, 'pix', 40, C.light, 960, 610, 'mm', { out: 0.8 });
    appearAt(ttl, 0.12);
    var n = group(c, 'STAGE CARD', 0, 0, [bg, bar, lab, ttl]);
    keys(pos(n), [[0.45, [0, 0]], [0.75, [0, -H]]]);
    attempt('card ease-in', function () {
      var p = pos(n);
      p.setTemporalEaseAtKey(1, [new KeyframeEase(0, 75)], [new KeyframeEase(0, 75)]);
      p.setTemporalEaseAtKey(2, [new KeyframeEase(0, 10)], [new KeyframeEase(0, 10)]);
    });
    return n;
  }

  function chip(c, x, y, label, font, size, fg, bg, border, padX, padY, t) {
    var w = textWidth(label, font, size) + padX * 2;
    var h = size * 1.3 + padY * 2;
    var sh = rect(c, x + 6, y + 6, w, h, { fill: C.darkest, name: label + ' chip shadow' });
    var b = rect(c, x, y, w, h, { fill: bg, stroke: border, sw: 4, name: label + ' chip' });
    var tx = text(c, label, font, size, fg, x + padX, y + padY + size * 0.1, 'la');
    if (t) { appearAt(sh, t); appearAt(b, t); appearAt(tx, t); }
    return { right: x + w, layers: [sh, b, tx] };
  }

  // ================================================================== scenes
  var scenes = [];

  // ---- 01 cold open: four beat cuts, recoloured to the 4-colour palette
  (function () {
    var c = newComp('S01_ColdOpen', 2, F.scenes);
    var words = ['CODE', 'PLAY', 'DESIGN', 'MODEL'];
    var shipCrop = M.mship ? cropComp('Crop_ShipModel_open', M.mship, 90, 110, 790, 444) : null;
    var cuts = [[M.ship, 34.4, 1.15, 1.3, 0.5, 0.5], [M.de, 29.5, 1.35, 1.5, 0.53, 0.62], [M.bd, 132.0, 1.7, 1.9, 0.41, 0.33], [shipCrop, 3.0, 1.0, 1.15, 0.5, 0.5]];
    for (var k = 0; k < 4; k++) {
      var t = k * 0.5, cu = cuts[k];
      if (cu[0]) {
        var l = clip(c, cu[0], cu[1], t, 0.5, cu[2], cu[3], cu[4], cu[5], { db: 2.6 });
        if (k === 1) effect(l, 'ADBE Brightness & Contrast 2', { 'Brightness': 30 });
        effect(l, 'ADBE Tritone', { 'Highlights': rgb(C.lightest), 'Midtones': rgb(C.light), 'Shadows': rgb(C.darkest) });
        effect(l, 'ADBE Posterize', { 'Level': 4 });
      }
      var w = text(c, words[k], 'pix', 160, C.lightest, 960, 540, 'mm', { shadow: [C.darkest, 12], 'in': t, out: t + 0.5 });
      keys(scl(w), [[t, [140, 140]], [t + 0.17, [100, 100]]], 60);
      var flash = c.layers.addSolid(rgb(C.lightest), 'Flash ' + (k + 1), W, H, 1, 2);
      span(flash, t, t + 3 / FPS);
      keys(opa(flash), [[t, 75], [t + 2 / FPS, 0]]);
    }
    scenes.push([c, 0]);
  })();

  // ---- 02 boot screen
  (function () {
    var c = newComp('S02_Boot', 2, F.scenes, C.lightest);
    c.layers.addSolid(rgb(C.lightest), 'BG', W, H, 1, 2);
    var logo = text(c, 'FZR', 'pix', 192, C.darkest, 960, 480, 'mm', { shadow: [C.light, 12] });
    var p = pos(logo).value;
    keys(pos(logo), [[0, [p[0], p[1] - 640]], [1.0, p]]);
    text(c, 'PORTFOLIO // 2026', 'pix', 32, C.dark, 960, 630, 'mm', { 'in': 1.0 });
    var ps = text(c, 'PRESS START', 'pix', 40, C.darkest, 960, 760, 'mm', { 'in': 1.0 });
    opa(ps).expression = 'Math.floor((time - inPoint) * 6) % 2 == 0 ? 100 : 0';
    text(c, '(C) FAWWAD ZAHEER RIZVI', 'pix', 20, C.dark, 960, 1010, 'mm');
    scenes.push([c, 2]);
  })();

  // ---- 03 title: portrait card + typed name + skill chips
  (function () {
    var c = newComp('S03_Title', 4, F.scenes);
    gridBg(c, 4);
    var pw = 525, ph = 700, px = 180, py = 190;
    var parts = box(c, px - 12, py - 12, pw + 24, ph + 24, { fill: C.lightest, shadow: C.light, soff: 18, name: 'Portrait card' });
    var img = null;
    if (M.portrait) {
      img = c.layers.add(M.portrait);
      scl(img).setValue([ph / M.portrait.height * 100, ph / M.portrait.height * 100]);
      pos(img).setValue([px + pw / 2, py + ph / 2]);
    }
    var strip = rect(c, px - 12, py + ph - 70, pw + 24, 82, { fill: C.darkest, name: 'Name strip' });
    var tag = text(c, 'PLAYER 1', 'pix', 24, C.light, px + pw / 2, py + ph - 24, 'mm');
    var card = group(c, 'PORTRAIT CARD', 0, 0, [parts[0], parts[1], img, strip, tag]);
    keys(pos(card), [[0, [-(pw + 280), 0]], [0.5, [0, 0]]], 80);

    var x = 860;
    text(c, '> NEW CHALLENGER', 'pix', 24, C.light, x, 190, 'la', { typeAt: 0.1, cps: 30 });
    var names = ['FAWWAD', 'ZAHEER', 'RIZVI'];
    for (var k = 0; k < 3; k++) text(c, names[k], 'pix', 88, C.lightest, x, 260 + k * 110, 'la', { shadow: [C.dark, 8], typeAt: 0.15 + k * 0.12, cps: 36 });
    text(c, 'Game developer  //  3D artist', 'monoB', 44, C.lightest, x, 610, 'la', { typeAt: 1.6, cps: 40 });
    text(c, 'BS CS (Gaming & Animation), NED University', 'mono', 32, C.light, x, 672, 'la', { typeAt: 2.4, cps: 50 });
    var chips = ['UNITY + C#', 'UNREAL ENGINE 5', 'BLENDER'], cx = x;
    for (k = 0; k < 3; k++) {
      var ch = chip(c, cx, 780, chips[k], 'pix', 24, C.darkest, k === 1 ? C.lightest : C.light, C.darkest, 20, 16);
      var w = ch.right - cx;
      var n = group(c, 'CHIP ' + chips[k], cx + w / 2, 812, ch.layers);
      attempt('chip anchor', function () { tr(n, 'ADBE Anchor Point').setValue([50, 50]); });
      popIn(n, 0.5 + k * 0.5);
      cx = ch.right + 24;
    }
    scenes.push([c, 4]);
  })();

  // ---- 04-06 game stages
  var GAMES = [
    { name: 'S04_Stage1_ShipBrawl', label: 'STAGE 01', title: 'Ship Brawl', engine: 'UNREAL ENGINE 5', kind: '3D NAVAL COMBAT', team: true,
      items: ['Ship movement & controls', 'Enemy combat AI & cannon fire', 'Ship + cannon models in Blender'],
      clips: [[M.ship, 12.0, 1.05, 1.2, 0.5, 0.45], [M.ship, 23.0, 1.2, 1.05, 0.5, 0.5], [M.ship, 34.0, 1.05, 1.25, 0.55, 0.45]], at: 8 },
    { name: 'S05_Stage2_BaseDefenders', label: 'STAGE 02', title: 'Base Defenders', engine: 'UNITY + C#', kind: '2D TOWER DEFENSE', team: false,
      items: ['Turret placement system', 'Enemy wave logic', 'UI, menus & balancing'],
      clips: [[M.bd, 104.5, 1.0, 1.12, 0.55, 0.5], [M.bd, 111.0, 1.8, 2.0, 0.58, 0.36], [M.bd, 132.0, 1.9, 1.6, 0.42, 0.32]], at: 14 },
    { name: 'S06_Stage3_DungeonEscape', label: 'STAGE 03', title: 'Dungeon Escape', engine: 'UNITY + C#', kind: '2D STEALTH PLATFORMER', team: true,
      items: ['Player movement & platforming', 'Stealth gameplay', 'UI, menus & game flow'],
      clips: [[M.de, 29.0, 1.3, 1.4, 0.53, 0.6], [M.de, 31.6, 1.4, 1.3, 0.62, 0.55], [M.de, 57.0, 1.25, 1.4, 0.58, 0.62]], at: 20, brighten: true }
  ];
  for (var gi = 0; gi < GAMES.length; gi++) (function (g) {
    var c = newComp(g.name, 6, F.scenes);
    for (var k = 0; k < 3; k++) {
      var cl = g.clips[k];
      if (!cl[0]) continue;
      var l = clip(c, cl[0], cl[1], k * 2, 2, cl[2], cl[3], cl[4], cl[5], { db: 3.5 });
      if (g.brighten) effect(l, 'ADBE Brightness & Contrast 2', { 'Brightness': 25, 'Contrast': 5 });
    }
    // darken the lower-left so the panel reads well
    var shade = c.layers.addSolid(rgb(C.darkest), 'Shade', W, H, 1, 6);
    attempt('shade mask', function () {
      var m = shade.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
      var s = new Shape();
      s.vertices = [[-200, 460], [1500, 460], [1500, 1300], [-200, 1300]];
      s.closed = true;
      m.property('ADBE Mask Shape').setValue(s);
      m.property('ADBE Mask Feather').setValue([420, 420]);
    });
    opa(shade).setValue(70);

    // lower third
    var t0 = 0.55, x = 80, y = 640, w = 900, h = 360;
    var lt = [];
    lt = lt.concat(box(c, x, y, w, h, { fill: C.darkest, fillOpacity: 92, stroke: C.light, sw: 5, soff: 12, name: 'Panel' }));
    lt.push(rect(c, x, y, 14, h, { fill: C.light, name: 'Accent' }));
    lt.push(text(c, g.title.toUpperCase(), 'pix', 48, C.lightest, x + 50, y + 36, 'la', { shadow: [C.dark, 6] }));
    var cx = x + 50;
    var c1 = chip(c, cx, y + 112, g.engine, 'monoB', 26, C.darkest, C.light, C.darkest, 18, 12, t0 + 0.25);
    lt = lt.concat(c1.layers);
    var c2 = chip(c, c1.right + 16, y + 112, g.kind, 'monoB', 26, C.lightest, C.dark, C.light, 18, 12, t0 + 0.4);
    lt = lt.concat(c2.layers);
    if (g.team) lt = lt.concat(chip(c, c2.right + 16, y + 112, 'TEAM PROJECT', 'monoB', 26, C.darkest, C.lightest, C.darkest, 18, 12, t0 + 0.55).layers);
    for (k = 0; k < g.items.length; k++) {
      var ts = t0 + 0.9 + k * 0.7, yy = y + 196 + k * 50;
      var ck = check(c, x + 52, yy + 10, 4, C.light);
      appearAt(ck, ts);
      lt.push(ck);
      lt.push(text(c, g.items[k], 'mono', 32, C.lightest, x + 100, yy, 'la', { typeAt: ts, cps: 40 }));
    }
    var ltn = group(c, 'LOWER THIRD', 0, 0, lt);
    keys(pos(ltn), [[t0, [-980, 0]], [t0 + 0.35, [0, 0]]], 80);

    // HUD + progress bar
    var hud = text(c, g.label + '/03', 'pix', 24, C.lightest, W - 48, 36, 'ra', { shadow: [C.darkest, 4] });
    var hp = pos(hud).value;
    keys(pos(hud), [[0.6, [hp[0], hp[1] - 116]], [0.9, hp]], 70);
    var bar = rect(c, 0, H - 10, W, 10, { fill: C.light, name: 'Progress' });
    attempt('progress anchor', function () {
      tr(bar, 'ADBE Anchor Point').setValue([-W / 2, 0]);
      pos(bar).setValue([0, H - 5]);
    });
    keys(scl(bar), [[0, [0, 100]], [6, [100, 100]]]);

    stageCard(c, g.label, g.title.toUpperCase());
    scenes.push([c, g.at]);
  })(GAMES[gi]);

  // ---- 07 bonus stage: 3D models in retro windows
  (function () {
    var c = newComp('S07_Bonus_3DModels', 6, F.scenes);
    gridBg(c, 6);
    text(c, '3D MODELS // MADE IN BLENDER', 'pix', 40, C.lightest, 960, 70, 'mm', { shadow: [C.dark, 6], out: 2 });

    function windowLayers(x, y, w, h, title, content, srcStart, speed, tin, tout, zoom) {
      var ls = [];
      ls.push(rect(c, x + 12, y + 12, w, h, { fill: C.black, name: title + ' shadow', 'in': tin, out: tout }));
      ls.push(rect(c, x, y, w, h, { fill: C.darkest, stroke: C.light, sw: 5, name: title + ' window', 'in': tin, out: tout }));
      if (content) {
        var l = c.layers.add(content);
        l.startTime = tin - srcStart / speed;
        if (speed !== 1) l.stretch = 100 / speed;
        span(l, tin, tout);
        var iw = w - 10, ih = h - 57;
        var s = Math.max(iw / content.width, ih / content.height) * 100;
        pos(l).setValue([x + 5 + iw / 2, y + 52 + ih / 2]);
        if (zoom) keys(scl(l), [[tin, [s, s]], [tout, [s * zoom, s * zoom]]]);
        else scl(l).setValue([s, s]);
        attempt('window mask', function () {
          var m = l.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
          var sh = new Shape();
          var cw = iw / (s / 100) / 2, chh = ih / (s / 100) / 2, ccx = content.width / 2, ccy = content.height / 2;
          sh.vertices = [[ccx - cw, ccy - chh], [ccx + cw, ccy - chh], [ccx + cw, ccy + chh], [ccx - cw, ccy + chh]];
          sh.closed = true;
          m.property('ADBE Mask Shape').setValue(sh);
        });
        ls.push(l);
      }
      ls.push(rect(c, x, y, w, 52, { fill: C.light, name: title + ' title bar', 'in': tin, out: tout }));
      ls.push(text(c, title, 'pix', 20, C.darkest, x + 20, y + 16, 'la', { 'in': tin, out: tout }));
      for (var q = 0; q < 3; q++) ls.push(rect(c, x + w - 40 - q * 34, y + 14, 22, 22, { fill: C.darkest, name: 'button', 'in': tin, out: tout }));
      var n = group(c, 'WINDOW ' + title, x + w / 2, y + h / 2, ls);
      attempt('window anchor', function () { tr(n, 'ADBE Anchor Point').setValue([50, 50]); });
      popIn(n, tin, 5);
      return n;
    }

    var crops = [
      ['LOW-POLY AXE', M.axe ? cropComp('Crop_Axe', M.axe, 302, 100, 676, 380) : null, 1.0, 1.5],
      ['LOW-POLY PISTOL', M.pistol ? cropComp('Crop_Pistol', M.pistol, 330, 100, 660, 371) : null, 5.0, 1.6],
      ['LOW-POLY SHIP', M.mship ? cropComp('Crop_Ship', M.mship, 90, 110, 790, 444) : null, 1.0, 1.5],
      ['RIGGED CHARACTER', M.mchar ? cropComp('Crop_Character', M.mchar, 390, 92, 551, 310) : null, 2.0, 1.2]
    ];
    var cw = 716, chh = 454;
    for (var k = 0; k < 4; k++) {
      var wx = (W - (cw * 2 + 40)) / 2 + (k % 2) * (cw + 40), wy = 125 + Math.floor(k / 2) * (chh + 26);
      windowLayers(wx, wy, cw, chh, crops[k][0], crops[k][1], crops[k][2], crops[k][3], 0.45 + k * 0.25, 2.0, 0);
    }

    var big = [
      ['LOW-POLY CHARACTER', 'Armature + weight painting', 'Rigged, weight-painted and animated in Blender', crops[3][1], 6.0, 2.0],
      ['LOW-POLY SHIP', 'The ship from Ship Brawl', 'Box modeling + booleans, exported to Unreal Engine', crops[2][1], 16.2, 4.0]
    ];
    for (k = 0; k < 2; k++) {
      var b = big[k], t = b[5];
      windowLayers(90, 150, 1250, 760, b[0], b[3], b[4], 1, t, t + 2, 0);
      text(c, 'BLENDER', 'pix', 32, C.light, 1410, 330, 'la', { 'in': t, out: t + 2 });
      text(c, b[1], 'monoB', 36, C.lightest, 1410, 400, 'la', { 'in': t, out: t + 2, typeAt: t + 0.15, cps: 40 });
      text(c, b[2], 'mono', 30, C.light, 1410, 520, 'la', { 'in': t, out: t + 2, typeAt: t + 0.5, cps: 50 });
    }
    stageCard(c, 'BONUS STAGE', '3D MODELS');
    scenes.push([c, 26]);
  })();

  // ---- 08 character sheet: skills + achievement
  (function () {
    var c = newComp('S08_CharacterSheet', 6, F.scenes);
    gridBg(c, 6);
    var fx = 120, sheet = [];
    sheet = sheet.concat(box(c, fx, 120, 1680, 840, { fill: C.darkest, stroke: C.light, sw: 6, shadow: C.black, soff: 14, name: 'Sheet' }));
    sheet.push(rect(c, fx, 120, 1680, 70, { fill: C.light, name: 'Sheet title bar' }));
    sheet.push(text(c, 'CHARACTER SHEET // PLAYER 1', 'pix', 32, C.darkest, fx + 30, 140, 'la'));
    if (M.portrait) {
      var img = c.layers.add(M.portrait);
      var s = 480 / M.portrait.height * 100;
      scl(img).setValue([s, s]);
      pos(img).setValue([fx + 60 + 180, 240 + 240]);
      sheet.push(img);
    }
    sheet.push(rect(c, fx + 60, 240, 360, 480, { stroke: C.lightest, sw: 6, name: 'Portrait frame' }));
    sheet.push(text(c, 'FAWWAD Z. RIZVI', 'pix', 24, C.lightest, fx + 60, 760, 'la'));
    sheet.push(text(c, 'CLASS: GAME DEVELOPER', 'monoB', 30, C.light, fx + 60, 810, 'la'));
    sheet.push(text(c, 'GUILD: NED UNIVERSITY', 'monoB', 30, C.light, fx + 60, 852, 'la'));
    sheet.push(text(c, 'BS CS (GAMING & ANIMATION) 2023-27', 'mono', 24, C.light, fx + 60, 894, 'la'));
    sheet.push(text(c, 'SKILLS UNLOCKED', 'pix', 40, C.lightest, fx + 520, 240, 'la', { shadow: [C.dark, 6] }));
    var sh = group(c, 'SHEET', 0, 0, sheet);
    keys(pos(sh), [[0, [-200, 0]], [0.35, [0, 0]]], 80);

    var skills = ['Unity + C# gameplay programming', 'Unreal Engine 5 + Blueprints', 'Player movement, AI & combat', 'UI, menus & game flow', 'Blender: modeling, rigging, weights'];
    for (var k = 0; k < skills.length; k++) {
      var ts = 1.0 + k * 0.5, yy = 340 + k * 96, x = fx + 520;
      var row = [rect(c, x, yy, 1060, 74, { fill: C.row, stroke: C.dark, sw: 3, name: 'Skill row ' + (k + 1) }), check(c, x + 24, yy + 22, 5, C.light), text(c, skills[k], 'monoB', 38, C.lightest, x + 90, yy + 14, 'la')];
      var rn = group(c, 'SKILL ' + (k + 1), 0, 0, row);
      keys(pos(rn), [[ts, [60, 0]], [ts + 0.2, [0, 0]]], 80);
      for (var r = 0; r < row.length; r++) appearAt(row[r], ts);
    }

    var tw = 1060, th = 170, tx = W - 90 - tw, ty = H + 20 - (th + 90);
    var toast = box(c, tx, ty, tw, th, { fill: C.lightest, stroke: C.darkest, sw: 6, shadow: C.darkest, soff: 10, name: 'Achievement' });
    var art = ['XXXXXXXXX', 'X.XXXXX.X', 'X.XXXXX.X', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....', '...XXX...', '..XXXXX..'];
    var trophy = c.layers.addShape();
    trophy.name = 'Trophy';
    var root = trophy.property('ADBE Root Vectors Group');
    for (var j = 0; j < art.length; j++) for (var i = 0; i < art[j].length; i++) {
      if (art[j].charAt(i) !== 'X') continue;
      var gp = root.addProperty('ADBE Vector Group').property('ADBE Vectors Group');
      var rc = gp.addProperty('ADBE Vector Shape - Rect');
      rc.property('ADBE Vector Rect Size').setValue([9, 9]);
      rc.property('ADBE Vector Rect Position').setValue([i * 9 + 4.5, j * 9 + 4.5]);
      gp.addProperty('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color').setValue(rgb(C.dark));
    }
    pos(trophy).setValue([tx + 36, ty + 48]);
    var t1 = text(c, 'ACHIEVEMENT UNLOCKED', 'pix', 28, C.darkest, tx + 160, ty + 32, 'la');
    var t2 = text(c, 'Pre-Production, Unreal Certification', 'monoB', 34, C.darkest, tx + 160, ty + 80, 'la');
    var t3 = text(c, 'CEGA, Center of Excellence in Gaming & Animation', 'mono', 24, C.dark, tx + 160, ty + 124, 'la');
    var tn = group(c, 'ACHIEVEMENT TOAST', 0, 0, [toast[0], toast[1], trophy, t1, t2, t3]);
    keys(pos(tn), [[4.0, [0, th + 110]], [4.35, [0, 0]]], 80);
    scenes.push([c, 32]);
  })();

  // ---- 09 outro: contact card
  (function () {
    var c = newComp('S09_Outro', 6, F.scenes, C.lightest);
    c.layers.addSolid(rgb(C.lightest), 'BG', W, H, 1, 6);
    text(c, 'READY FOR PLAYER 2?', 'pix', 56, C.darkest, 960, 170, 'mm', { shadow: [C.light, 8], typeAt: 0.1, cps: 22 });
    var nm = text(c, 'FAWWAD ZAHEER RIZVI', 'pix', 64, C.darkest, 960, 330, 'mm', { 'in': 1.0 });
    var np = pos(nm).value;
    keys(pos(nm), [[1.0, [np[0], np[1] + 30]], [1.3, np]], 80);
    text(c, 'Game developer  ·  Unity  ·  Unreal Engine 5  ·  Blender', 'monoB', 36, C.dark, 960, 420, 'mm', { 'in': 1.0 });
    text(c, 'syedfawwad100@gmail.com', 'monoB', 56, C.darkest, 960, 530, 'mm', { 'in': 1.4, typeAt: 1.4, cps: 40 });
    text(c, 'github.com/FawwadZaheer', 'mono', 40, C.dark, 960, 610, 'mm', { 'in': 1.6, typeAt: 1.6, cps: 40 });
    var btn = box(c, 500, 720, 920, 120, { fill: C.darkest, shadow: C.dark, soff: 12, name: 'Play button', 'in': 2.0 });
    var lbl = text(c, '> PLAY THE PORTFOLIO', 'pix', 40, C.lightest, 960, 780, 'mm', { 'in': 2.0 });
    attempt('blink cursor', function () {
      lbl.property('ADBE Text Properties').property('ADBE Text Document').expression =
        'time < 4.0 && Math.floor((time - 2.0) * 3) % 2 == 1 ? "  PLAY THE PORTFOLIO" : "> PLAY THE PORTFOLIO"';
    });
    var bn = group(c, 'BUTTON', 960, 780, [btn[0], btn[1], lbl]);
    attempt('button anchor', function () { tr(bn, 'ADBE Anchor Point').setValue([50, 50]); });
    popIn(bn, 2.0, 60);
    text(c, 'Explore it as a 3D game on my website', 'mono', 30, C.dark, 960, 900, 'mm', { 'in': 2.0 });
    var black = c.layers.addSolid(rgb(C.black), 'Fade to black', W, H, 1, 6);
    keys(opa(black), [[5.0, 0], [5.95, 100]]);
    scenes.push([c, 38]);
  })();

  // ================================================================== main comp
  var main = newComp('PROMO_MAIN', 44, F.comps);
  // scenes (added in reverse so scene 1 ends up on top of the stack order visually)
  for (var si = scenes.length - 1; si >= 0; si--) {
    var sl = main.layers.add(scenes[si][0]);
    sl.startTime = scenes[si][1];
  }
  // music with ducking under the gameplay sound (game audio comes from the footage layers)
  if (M.music) {
    var mus = main.layers.add(M.music);
    mus.name = 'Soundtrack (120 BPM chiptune)';
    attempt('music ducking', function () {
      var lv = mus.property('ADBE Audio Group').property('ADBE Audio Levels');
      keys(lv, [[0, [-2.5, -2.5]], [1.5, [-2.5, -2.5]], [1.62, [0, 0]], [7.9, [0, 0]], [8.0, [-4.2, -4.2]], [26.0, [-4.2, -4.2]], [26.12, [0, 0]]]);
    });
  }
  // glitch hits on every scene change
  for (si = 1; si < scenes.length; si++) {
    var gl = main.layers.addSolid(rgb(C.black), 'Glitch ' + (si + 1), W, H, 1, 44);
    gl.adjustmentLayer = true;
    span(gl, scenes[si][1], scenes[si][1] + 4 / FPS);
    effect(gl, 'ADBE Wave Warp', { 'Wave Height': 40, 'Wave Width': 300, 'Direction': 0 });
    attempt('glitch wave type', function () { gl.property('ADBE Effect Parade').property(1).property('Wave Type').setValue(2); });
  }
  // CRT look over everything: scanlines + vignette
  var vig = main.layers.addSolid(rgb(C.black), 'Vignette', W, H, 1, 44);
  attempt('vignette mask', function () {
    var m = vig.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
    var s = new Shape();
    var e = 0.5523, rx = 1100, ry = 700;
    s.vertices = [[960, 540 - ry], [960 + rx, 540], [960, 540 + ry], [960 - rx, 540]];
    s.inTangents = [[-rx * e, 0], [0, -ry * e], [rx * e, 0], [0, ry * e]];
    s.outTangents = [[rx * e, 0], [0, ry * e], [-rx * e, 0], [0, -ry * e]];
    s.closed = true;
    m.property('ADBE Mask Shape').setValue(s);
    m.inverted = true;
    m.property('ADBE Mask Feather').setValue([500, 500]);
  });
  opa(vig).setValue(30);
  var crt = main.layers.addSolid(rgb(C.black), 'CRT scanlines', W, H, 1, 44);
  crt.adjustmentLayer = true;
  effect(crt, 'ADBE Venetian Blinds', { 'Transition Completion': 30, 'Direction': 0, 'Width': 3, 'Feather': 0 });
  opa(crt).setValue(30);

  // ================================================================== save + render queue
  var aep = new File(HERE.absoluteURI + '/Fawwad_Promo.aep');
  attempt('save project', function () { proj.save(aep); });
  attempt('render queue', function () {
    var rq = proj.renderQueue.items.add(main);
    var om = rq.outputModule(1);
    var names = ['H.264 - Match Render Settings - 15 Mbps', 'H.264 - Match Render Settings -  15 Mbps', 'H.264'];
    for (var n = 0; n < names.length; n++) { try { om.applyTemplate(names[n]); break; } catch (e) { } }
    om.file = new File(ROOT.absoluteURI + '/public/video/promo_from_ae.mp4');
  });
  attempt('font check', function () {
    for (var f in FONT) if (FONT.hasOwnProperty(f) && app.fonts && app.fonts.getFontsByPostScriptName) {
      var found = app.fonts.getFontsByPostScriptName(FONT[f]);
      if (!found || !found.length) warnings.push('Font not installed: ' + FONT[f] + ' (install it from tools/promo/ and run again)');
    }
  });
  main.openInViewer();
  app.endUndoGroup();

  var msg = 'Promo project built and saved:\n' + aep.fsName + '\n\nPROMO_MAIN (44 s) is open and queued for render.';
  if (warnings.length) msg += '\n\nNotes (' + warnings.length + '):\n- ' + warnings.slice(0, 15).join('\n- ') + (warnings.length > 15 ? '\n...' : '');
  alert(msg);
})();
