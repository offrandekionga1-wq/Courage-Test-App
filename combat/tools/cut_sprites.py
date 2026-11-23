#!/usr/bin/env python3
"""Découpe les sprites des fiches de personnage et les détoure.

Chaque fiche est une planche : on déclare des bandes (idle, déplacement, saut,
attaques...), le script y repère les silhouettes, retire le fond par
remplissage depuis les bords, puis écrit un atlas PNG + un JSON de métadonnées.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


# --------------------------------------------------------------- détourage --
def box_sum(x: np.ndarray, r: int) -> np.ndarray:
    """Somme glissante (2r+1)² par images intégrales."""
    p = np.pad(x.astype(np.float32), r, mode='constant')
    c = p.cumsum(0).cumsum(1)
    c = np.pad(c, ((1, 0), (1, 0)))
    k = 2 * r + 1
    return c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    return box_sum(mask, r) > 0.5


def erode(mask: np.ndarray, r: int) -> np.ndarray:
    k = (2 * r + 1) ** 2
    return box_sum(mask, r) >= k - 0.5


def ink_mask(rgb: np.ndarray, dark_bg: bool, tol: int) -> np.ndarray:
    """Pixels qui s'écartent franchement de la couleur de fond."""
    if dark_bg:
        return rgb.max(axis=2).astype(np.int16) > tol
    return rgb.min(axis=2).astype(np.int16) < 255 - tol


def without_rules(ink: np.ndarray, ratio: float = 0.78, max_thick: int = 6) -> np.ndarray:
    """Retire les traits fins pleine largeur (sols, séparateurs, bandeaux).

    Sur les planches, les sprites d'une rangée sont souvent reliés par un filet
    horizontal : sans ce nettoyage ils ne forment qu'une seule tache. On ne
    supprime qu'une suite de lignes FINE et presque pleine, pour ne pas entamer
    le corps des personnages.
    """
    out = ink.copy()
    h, w = ink.shape

    def strip(profile, length, limit, axis):
        runs, st = [], None
        for i, v in enumerate(profile):
            if v > limit:
                if st is None:
                    st = i
            elif st is not None:
                runs.append((st, i)); st = None
        if st is not None:
            runs.append((st, len(profile)))
        for a, b in runs:
            if b - a <= max_thick:
                if axis == 0:
                    out[a:b, :] = False
                else:
                    out[:, a:b] = False

    strip(ink.sum(axis=1), h, w * ratio, 0)
    strip(ink.sum(axis=0), w, h * ratio, 1)
    return out


def flood_from_border(free: np.ndarray) -> np.ndarray:
    """Propage depuis les bords dans `free` ; le reste est intérieur (trous)."""
    h, w = free.shape
    reached = np.zeros((h, w), bool)
    q = deque()
    def seed(y, x):
        if free[y, x] and not reached[y, x]:
            reached[y, x] = True
            q.append((y, x))
    for x in range(w):
        seed(0, x); seed(h - 1, x)
    for y in range(h):
        seed(y, 0); seed(y, w - 1)
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and free[ny, nx] and not reached[ny, nx]:
                reached[ny, nx] = True
                q.append((ny, nx))
    return reached


def components(mask: np.ndarray):
    """Composantes connexes 4-voisins -> liste (taille, masque booléen)."""
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    out = []
    for sy in range(h):
        row = mask[sy]
        for sx in range(w):
            if not row[sx] or seen[sy, sx]:
                continue
            comp = np.zeros((h, w), bool)
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            comp[sy, sx] = True
            n = 0
            while q:
                y, x = q.popleft()
                n += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        comp[ny, nx] = True
                        q.append((ny, nx))
            out.append((n, comp))
    out.sort(key=lambda t: -t[0])
    return out


def silhouette(rgb: np.ndarray, dark_bg: bool, tol: int, grow: int, shrink: int,
               hole_max: int = 260) -> np.ndarray:
    """Silhouette pleine d'UN sprite.

    Fond et vêtements sombres ont la même luminance : impossible de les séparer
    au seuil. On part donc des pixels clairs ou colorés, on les épaissit pour
    refermer le contour, on ne garde que la plus grosse composante (les figures
    voisines et les étiquettes de la planche disparaissent), puis on rebouche
    les petits creux sans réintroduire les grandes zones de fond prises au
    piège entre deux membres.
    """
    ink = without_rules(ink_mask(rgb, dark_bg, tol))
    if not dark_bg:
        # Fond clair : le personnage est entièrement « encre », on garde sa
        # plus grosse composante telle quelle et on ne rebouche que les trous
        # minuscules (anticrénelage). Fermer la silhouette emprisonnerait de
        # grandes plaques de fond blanc entre les membres.
        comps_ink = components(ink)
        if not comps_ink:
            return ink
        body_i = comps_ink[0][1]
        for n, c in comps_ink[1:]:
            if n > 400:
                body_i |= c          # cheveux, pans d'étoffe détachés
        filled_i = ~flood_from_border(~body_i)
        holes_i = filled_i & ~body_i
        keep_i = np.zeros_like(holes_i)
        for n, c in components(holes_i):
            if n <= hole_max:
                keep_i |= c
        return body_i | keep_i
    closed = dilate(ink, grow)
    comps = components(closed)
    if not comps:
        return ink
    body = comps[0][1]
    filled = ~flood_from_border(~body)
    holes = filled & ~body
    keep_holes = np.zeros_like(holes)
    for n, c in components(holes):
        if n <= hole_max:
            keep_holes |= c
    solid = erode(body, shrink) | (ink & body) | keep_holes
    return solid


def cutout_glow(im: Image.Image, dark_bg: bool, tol: int) -> Image.Image:
    """Découpe d'un effet lumineux, destiné au dessin additif.

    Pas de silhouette binaire ici : l'opacité suit l'intensité, pour garder le
    dégradé du halo. Sur fond clair, le blanc du cœur de l'effet doit rester
    opaque : seul le blanc atteint depuis le bord est du fond.
    """
    rgb = np.asarray(im.convert('RGB')).astype(np.int16)
    if dark_bg:
        lum = rgb.max(axis=2)
        a = np.clip((lum - tol * 0.35) * 1.9, 0, 255).astype(np.uint8)
    else:
        # Fond clair : l'opacité suit l'écart au blanc. Un remplissage depuis
        # les bords ne suffit pas, car le blanc pris entre deux flammes reste
        # enfermé et formerait un bloc opaque en dessin additif.
        mn = rgb.min(axis=2)
        a = np.clip((255 - mn - tol * 0.3) * 1.7, 0, 255).astype(np.uint8)
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray(a, 'L').filter(ImageFilter.GaussianBlur(0.5)))
    return out


def cutout(im: Image.Image, dark_bg: bool, tol: int, feather: float = 0.8,
           grow: int = 6, shrink: int = 6, hole_max: int = 260) -> Image.Image:
    rgb = np.asarray(im.convert('RGB'))
    solid = silhouette(rgb, dark_bg, tol, grow, shrink, hole_max)
    a = Image.fromarray(np.where(solid, 255, 0).astype(np.uint8), 'L')
    if feather:
        a = a.filter(ImageFilter.GaussianBlur(feather))
    out = im.convert('RGBA')
    out.putalpha(a)
    return out


# ------------------------------------------------------------ segmentation --
def sprite_boxes(im: Image.Image, dark_bg: bool, tol: int, min_w: int, gap: int):
    """Colonnes contenant de la matière -> boîtes englobantes des sprites."""
    rgb = np.asarray(im.convert('RGB'))
    fg = ink_mask(rgb, dark_bg, tol)
    cols = fg.sum(axis=0)
    thr = max(2, int(im.height * 0.012))
    on = cols > thr
    boxes, start, hole = [], None, 0
    for x in range(len(on)):
        if on[x]:
            if start is None:
                start = x
            hole = 0
        elif start is not None:
            hole += 1
            if hole > gap:
                boxes.append((start, x - hole))
                start, hole = None, 0
    if start is not None:
        boxes.append((start, len(on) - 1))
    out = []
    for x0, x1 in boxes:
        if x1 - x0 < min_w:
            continue
        rows = fg[:, x0:x1 + 1].sum(axis=1)
        ys = np.where(rows > max(1, int((x1 - x0) * 0.02)))[0]
        if len(ys) == 0:
            continue
        out.append((x0, int(ys[0]), x1 + 1, int(ys[-1]) + 1))
    return out


def split_cells(prof: np.ndarray, n: int, min_gap: int):
    """Découpe une bande en n cellules aux colonnes les moins denses.

    Les sprites des planches se touchent souvent (traînées de vitesse, arcs
    d'énergie) : on coupe donc dans les creux du profil plutôt que de chercher
    des composantes séparées.
    """
    w = len(prof)
    cuts = []
    smooth = prof.astype(np.float64)
    if w > 6:
        k = np.ones(5) / 5
        smooth = np.convolve(smooth, k, mode='same')
    for _ in range(n - 1):
        best, bestv = -1, None
        for x in range(min_gap, w - min_gap):
            if any(abs(x - c) < min_gap for c in cuts):
                continue
            v = smooth[x]
            if bestv is None or v < bestv:
                best, bestv = x, v
        if best < 0:
            break
        cuts.append(best)
    cuts.sort()
    bounds = [0] + cuts + [w]
    return [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1)]


def cell_boxes(im: Image.Image, dark_bg: bool, tol: int, count: int, min_gap: int):
    rgb = np.asarray(im.convert('RGB'))
    fg = without_rules(ink_mask(rgb, dark_bg, tol))
    prof = fg.sum(axis=0)
    out = []
    for x0, x1 in split_cells(prof, count, min_gap):
        cell = fg[:, x0:x1]
        cols = cell.sum(axis=0)
        xs = np.where(cols > max(1, int(im.height * 0.012)))[0]
        if len(xs) == 0:
            continue
        cx0, cx1 = x0 + int(xs[0]), x0 + int(xs[-1]) + 1
        rows = fg[:, cx0:cx1].sum(axis=1)
        ys = np.where(rows > max(1, int((cx1 - cx0) * 0.02)))[0]
        if len(ys) == 0:
            continue
        out.append((cx0, int(ys[0]), cx1, int(ys[-1]) + 1))
    return out


# -------------------------------------------------------------------- main --
def is_junk(img: Image.Image, band: str) -> bool:
    """Écarte les rognures : filets, étiquettes, et cellules à deux figures."""
    a = np.asarray(img.getchannel('A')) > 90
    if band.startswith('fx'):
        return a.sum() < 700 or img.width < 24 or img.height < 24
    if a.sum() < 900:
        return True
    if img.width < 24 or img.height < 40:
        return True
    # deux personnages collés dans la même cellule : silhouette anormalement large
    if band in ('idle', 'jump', 'fall') and img.width > img.height * 1.25:
        return True
    if band == 'move' and img.width > img.height * 2.4:
        return True
    return False


def anchor_y(img: Image.Image) -> int:
    """Ordonnée des pieds.

    Les vignettes des fiches ajoutent souvent une ombre ou une traînée sous le
    personnage : prendre le bas de la boîte ferait flotter le combattant
    au-dessus du sol. On remonte donc tant que la ligne est nettement plus
    large que le reste de la silhouette.
    """
    a = np.asarray(img.getchannel('A')) > 90
    if not a.any():
        return img.height
    widths = []
    for row in a:
        xs = np.where(row)[0]
        widths.append(0 if len(xs) == 0 else int(xs[-1] - xs[0] + 1))
    mx = max(widths) or 1
    y = len(widths) - 1
    while y > 0 and widths[y] > 0.52 * mx:
        y -= 1
    # garde-fou : ne jamais remonter de plus d'un sixième de la hauteur
    return max(y + 1, int(img.height * 0.84))


def anchor_x(img: Image.Image) -> float:
    """Abscisse du point d'appui : centre des pixels opaques du bas du sprite.

    Prendre le centre de la boîte englobante décalerait les poses dont l'effet
    (arc de lame, traînée) déborde d'un seul côté.
    """
    a = np.asarray(img.getchannel('A'))
    h = a.shape[0]
    band = a[int(h * 0.82):, :] > 80
    if band.sum() < 6:
        band = a > 80
    xs = np.where(band.any(axis=0))[0]
    if len(xs) == 0:
        return img.width / 2
    return float((xs[0] + xs[-1] + 1) / 2)


def widen(src: Image.Image, rect, dark_bg: bool, tol: int, limit: int = 60,
          sides: str = 'both'):
    """Élargit la bande tant que ses bords coupent une silhouette.

    Les rectangles sont relevés à la main sur la planche : ce recalage évite
    qu'un personnage soit tranché par le bord de la bande.
    """
    x0, y0, x1, y1 = rect
    full = np.asarray(src.convert('RGB'))
    ink = without_rules(ink_mask(full, dark_bg, tol))
    h = y1 - y0
    thr = max(2, int(h * 0.04))

    def empty(x):
        return 0 <= x < ink.shape[1] and ink[y0:y1, x].sum() <= thr

    if sides in ('both', 'left'):
        moved = 0
        while moved < limit and not all(empty(x0 - 1 - k) for k in range(3)):
            x0 -= 1; moved += 1
    if sides in ('both', 'right'):
        moved = 0
        while moved < limit and not all(empty(x1 + k) for k in range(3)):
            x1 += 1; moved += 1
    return (x0, y0, x1, y1)


def pack(images, max_w=2048, pad=2):
    """Rangement en étagères : renvoie (largeur, hauteur, positions)."""
    order = sorted(range(len(images)), key=lambda i: -images[i].height)
    pos = [None] * len(images)
    x = y = rowh = 0
    w_used = 0
    for i in order:
        im = images[i]
        if x + im.width + pad > max_w:
            x = 0
            y += rowh + pad
            rowh = 0
        pos[i] = (x, y)
        x += im.width + pad
        rowh = max(rowh, im.height)
        w_used = max(w_used, x)
    return w_used, y + rowh + pad, pos


def main(cfg_path: str, out_dir: str, atlas_dir: str | None = None) -> None:
    cfg = json.load(open(cfg_path, encoding='utf-8'))
    os.makedirs(out_dir, exist_ok=True)
    if atlas_dir:
        os.makedirs(atlas_dir, exist_ok=True)
    for char in cfg['characters']:
        src = Image.open(cfg['dir'] + char['file'])
        dark = char.get('darkBg', True)
        tol = char.get('tol', 46)
        frames, images = [], []
        for band in char['bands']:
            rect = widen(src, band['rect'], dark, tol,
                         sides=band.get('widen', 'left' if band['name'] == 'idle' else 'both'))
            crop = src.crop(rect)
            if band.get('count'):
                boxes = cell_boxes(crop, dark, tol, band['count'], band.get('minGap', 22))
            else:
                boxes = sprite_boxes(crop, dark, tol, band.get('minW', 34), band.get('gap', 7))
            for i, (bx0, by0, bx1, by1) in enumerate(boxes):
                pad = 3
                sub = crop.crop((max(0, bx0 - pad), max(0, by0 - pad),
                                 min(crop.width, bx1 + pad), min(crop.height, by1 + pad)))
                if band.get('mode') == 'glow':
                    cut = cutout_glow(sub, dark, band.get('tol', tol))
                else:
                    cut = cutout(sub, dark, tol, band.get('feather', 0.8),
                                 band.get('grow', char.get('grow', 6)),
                                 band.get('shrink', char.get('shrink', 6)),
                                 char.get('holeMax', 260 if dark else 45))
                bb = cut.getbbox()
                if bb:
                    cut = cut.crop(bb)       # resserre sur ce qui reste opaque
                if is_junk(cut, band['name']):
                    continue
                images.append(cut)
                frames.append({'name': band['name'], 'w': cut.width, 'h': cut.height,
                               'ax': round(cut.width / 2, 1) if band['name'].startswith('fx')
                                     else round(anchor_x(cut), 1),
                               'ay': cut.height if band['name'].startswith('fx')
                                     else anchor_y(cut)})
        # Second tri : maintenant qu'on connaît la taille de référence, on
        # écarte les bandeaux de la planche (« JUMP », « FALL / LAND »…) et les
        # rognures trop petites pour être un personnage.
        idle_hs = [f['h'] for f in frames if f['name'] == 'idle']
        ref0 = float(np.median(idle_hs)) if idle_hs else 200.0
        floor = {'idle': 0.80, 'move': 0.46, 'jump': 0.38, 'fall': 0.34, 'atk': 0.46}
        floor.update({'fx': 0.10, 'fxb': 0.10})
        kept = [(f, im) for f, im in zip(frames, images)
                if f['h'] >= ref0 * floor.get(f['name'], 0.4)
                and (f['name'].startswith('fx') or f['w'] <= f['h'] * 3.2)]
        frames = [f for f, _ in kept]
        images = [im for _, im in kept]

        def renumber(fs):
            seq: dict[str, int] = {}
            for f in fs:
                base = f['name'].rstrip('0123456789')
                n = seq.get(base, 0)
                seq[base] = n + 1
                f['name'] = f'{base}{n}'

        renumber(frames)
        # rebuts relevés à l'œil sur la planche de contrôle
        drop = set(char.get('drop', []))
        if drop:
            keep2 = [(f, im) for f, im in zip(frames, images) if f['name'] not in drop]
            frames = [f for f, _ in keep2]
            images = [im for _, im in keep2]
            renumber(frames)
        print(char['id'], len(frames), 'sprites :',
              ' '.join(f['name'] for f in frames))

        # planche de contrôle, indexée
        cw = max(f['w'] for f in frames) + 14
        rowh = max(f['h'] for f in frames) + 22
        per = 8
        rows = (len(frames) + per - 1) // per
        sheet = Image.new('RGBA', (cw * per, rowh * rows), (24, 22, 32, 255))
        d = ImageDraw.Draw(sheet)
        for i, img in enumerate(images):
            ox, oy = (i % per) * cw, (i // per) * rowh
            sheet.alpha_composite(img, (ox + 7, oy + 4))
            d.text((ox + 7, oy + rowh - 15), f"{i} {frames[i]['name']}", fill=(120, 255, 160, 255))
        sheet.convert('RGB').save(f'{out_dir}/{char["id"]}-controle.png')

        if not atlas_dir:
            continue
        aw, ah, pos = pack(images)
        atlas = Image.new('RGBA', (aw, ah), (0, 0, 0, 0))
        for im, (px, py), fr in zip(images, pos, frames):
            atlas.alpha_composite(im, (px, py))
            fr['x'], fr['y'] = px, py
        atlas.save(f'{atlas_dir}/{char["id"]}-sprites.webp', 'WEBP',
                   quality=92, method=6, exact=True)
        # Chaque rangée de la fiche est dessinée à une échelle différente : on
        # ramène les groupes à la taille de la pose debout.
        ratio = {'idle': 1.0, 'move': 0.88, 'atk': 0.93, 'jump': 0.78, 'fall': 0.86}
        by_group: dict[str, list[int]] = {}
        for f in frames:
            by_group.setdefault(f['name'].rstrip('0123456789'), []).append(f['h'])
        idle_h = by_group.get('idle', [200])
        ref = int(np.median(idle_h))
        gs = {}
        for g, hs in by_group.items():
            med = float(np.median(hs)) or 1.0
            gs[g] = round(float(np.clip(ref * ratio.get(g, 0.9) / med, 0.9, 1.8)), 3)
        meta = {'ref': ref, 'gs': gs, 'w': aw, 'h': ah, 'frames': frames}
        json.dump(meta, open(f'{atlas_dir}/{char["id"]}-sprites.json', 'w'),
                  separators=(',', ':'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
