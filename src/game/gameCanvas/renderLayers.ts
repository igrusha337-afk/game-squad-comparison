import { GameState } from '../types';
import { MAP_W, MAP_H } from '../engine';
import { MAP_DECOR } from './mapDecor';
import { hex2rgba, drawUnitSkin, drawMiniCastle, drawMiniMine, drawMiniFarm, drawMiniTower } from './unitSkins';

export function renderBackground(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(MAP_W/2, MAP_H/2, 0, MAP_W/2, MAP_H/2, MAP_W*0.75);
  g.addColorStop(0, '#2a4020'); g.addColorStop(0.4, '#223318'); g.addColorStop(0.8, '#1a2812'); g.addColorStop(1, '#121e0e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.globalAlpha = 0.06;
  for (const p of MAP_DECOR.patches) {
    ctx.fillStyle = p.type==='dark'?'#000':p.type==='light'?'#7ab050':'#6b4820';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.w/2, p.h/2, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function renderDecorUnder(ctx: CanvasRenderingContext2D) {
  const rv = MAP_DECOR.river;
  ctx.save(); ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#1e4870'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(rv[0].x, rv[0].y);
  for (let i = 1; i < rv.length; i++) ctx.lineTo(rv[i].x, rv[i].y);
  ctx.stroke();
  ctx.strokeStyle = '#4090d0'; ctx.lineWidth = 5; ctx.globalAlpha = 0.18;
  ctx.stroke(); ctx.restore();

  for (const r of MAP_DECOR.roads) {
    ctx.save();
    ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(r.x1,r.y1); ctx.lineTo(r.x2,r.y2); ctx.stroke();
    ctx.strokeStyle = '#8b6840'; ctx.lineWidth = 8; ctx.globalAlpha = 0.45; ctx.stroke();
    ctx.strokeStyle = '#c0a060'; ctx.lineWidth = 1; ctx.setLineDash([20,15]); ctx.globalAlpha = 0.18; ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.022)'; ctx.lineWidth = 0.5;
  for (let x = 0; x <= MAP_W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,MAP_H); ctx.stroke(); }
  for (let y = 0; y <= MAP_H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(MAP_W,y); ctx.stroke(); }

  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, MAP_W-4, MAP_H-4);
  ctx.strokeStyle = '#c9a84c55'; ctx.lineWidth = 1; ctx.strokeRect(8, 8, MAP_W-16, MAP_H-16);
  for (const [cx, cy] of [[16,16],[MAP_W-16,16],[16,MAP_H-16],[MAP_W-16,MAP_H-16]] as [number,number][]) {
    ctx.strokeStyle = '#c9a84c88'; ctx.lineWidth = 1.5;
    for (const rr of [10, 18]) { ctx.beginPath(); ctx.arc(cx,cy,rr,0,Math.PI*2); ctx.stroke(); }
  }
}

export function renderDecorOver(ctx: CanvasRenderingContext2D) {
  for (const rock of MAP_DECOR.rocks) {
    const rg = ctx.createRadialGradient(rock.x-rock.r*0.3, rock.y-rock.r*0.3, 0, rock.x, rock.y, rock.r);
    rg.addColorStop(0,'#8899aa'); rg.addColorStop(1,'#445566');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.ellipse(rock.x, rock.y, rock.r, rock.r*0.7, 0.4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#00000033';
    ctx.beginPath(); ctx.ellipse(rock.x+2, rock.y+rock.r*0.5, rock.r*0.9, rock.r*0.3, 0, 0, Math.PI*2); ctx.fill();
  }
  for (const tree of MAP_DECOR.trees) {
    ctx.fillStyle = '#00000040';
    ctx.beginPath(); ctx.ellipse(tree.x+4, tree.y+tree.r*0.6, tree.r*0.9, tree.r*0.35, 0, 0, Math.PI*2); ctx.fill();

    if (tree.variant === 0) {
      for (let tier = 0; tier < 3; tier++) {
        const tr = tree.r*(1-tier*0.25), ty = tree.y-tier*tree.r*0.5;
        ctx.fillStyle = tier===0?'#1a5228':tier===1?'#1e6030':'#2a7040';
        ctx.beginPath(); ctx.moveTo(tree.x,ty-tr); ctx.lineTo(tree.x+tr*0.8,ty+tr*0.5); ctx.lineTo(tree.x-tr*0.8,ty+tr*0.5); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#5a3820'; ctx.fillRect(tree.x-2, tree.y+tree.r*0.4, 4, tree.r*0.5);
    } else if (tree.variant === 1) {
      ctx.fillStyle = '#5a3820'; ctx.fillRect(tree.x-3, tree.y, 6, tree.r*0.7);
      const cg = ctx.createRadialGradient(tree.x-tree.r*0.2, tree.y-tree.r*0.3, 0, tree.x, tree.y, tree.r);
      cg.addColorStop(0,'#5a8830'); cg.addColorStop(0.6,'#3a6820'); cg.addColorStop(1,'#2a4a18');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#7ab04044';
      ctx.beginPath(); ctx.arc(tree.x-tree.r*0.25, tree.y-tree.r*0.3, tree.r*0.45, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = '#e8e0d0'; ctx.fillRect(tree.x-2.5, tree.y-tree.r*0.3, 5, tree.r*1.1);
      ctx.fillStyle = '#33333366';
      for (let bi = 0; bi < 4; bi++) ctx.fillRect(tree.x-2, tree.y-tree.r*0.2+bi*tree.r*0.22, 4, 3);
      const bg = ctx.createRadialGradient(tree.x, tree.y-tree.r*0.5, 0, tree.x, tree.y-tree.r*0.5, tree.r*0.9);
      bg.addColorStop(0,'#90c07044'); bg.addColorStop(0.7,'#60a04060'); bg.addColorStop(1,'#408030aa');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(tree.x, tree.y-tree.r*0.4, tree.r*0.8, tree.r*1.0, 0, 0, Math.PI*2); ctx.fill();
    }
  }
}

export function renderCapturePoints(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const cp of Object.values(s.capturePoints)) {
    const ownerColor = cp.ownerId ? s.players[cp.ownerId]?.color || '#888' : '#888';

    const pg = ctx.createRadialGradient(cp.pos.x, cp.pos.y, 0, cp.pos.x, cp.pos.y, cp.radius);
    pg.addColorStop(0, hex2rgba(cp.ownerId ? ownerColor : '#666666', 0.16));
    pg.addColorStop(0.7, hex2rgba(cp.ownerId ? ownerColor : '#444444', 0.07));
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(cp.pos.x, cp.pos.y, cp.radius, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#2a2820';
    ctx.beginPath(); ctx.arc(cp.pos.x, cp.pos.y, 28, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = cp.ownerId ? ownerColor : '#665544'; ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#3a3830'; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i/8)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(cp.pos.x+10*Math.cos(a), cp.pos.y+10*Math.sin(a));
      ctx.lineTo(cp.pos.x+22*Math.cos(a), cp.pos.y+22*Math.sin(a)); ctx.stroke();
    }

    if (cp.captureProgress > 0 && cp.captureProgress < 100) {
      const cc = cp.ownerId ? ownerColor : (cp.capturingPlayerId ? s.players[cp.capturingPlayerId]?.color||'#fff' : '#fff');
      ctx.save();
      ctx.strokeStyle = hex2rgba(cc, 0.27); ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cp.pos.x, cp.pos.y, cp.radius-5, -Math.PI/2, -Math.PI/2+(cp.captureProgress/100)*Math.PI*2); ctx.stroke();
      ctx.strokeStyle = cc; ctx.lineWidth = 4;
      ctx.stroke(); ctx.restore();
    }

    ctx.save(); ctx.translate(cp.pos.x, cp.pos.y);
    if (cp.type==='castle') drawMiniCastle(ctx, ownerColor, cp.ownerId!==null);
    else if (cp.type==='mine') drawMiniMine(ctx, ownerColor, cp.ownerId!==null);
    else if (cp.type==='farm') drawMiniFarm(ctx, ownerColor, cp.ownerId!==null);
    else if (cp.type==='tower') drawMiniTower(ctx, ownerColor, cp.ownerId!==null);
    ctx.restore();

    ctx.font = 'bold 10px Manrope, sans-serif'; ctx.fillStyle = cp.ownerId?'#fff':'#aaa';
    ctx.globalAlpha = 0.9; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(cp.label, cp.pos.x, cp.pos.y+32);
    if (cp.goldPerSec > 0 || cp.foodPerSec > 0) {
      ctx.font = '9px Manrope, sans-serif'; ctx.fillStyle = cp.ownerId?'#f0c060aa':'#66666655';
      ctx.fillText([cp.goldPerSec>0?`+${cp.goldPerSec}💰`:'',cp.foodPerSec>0?`+${cp.foodPerSec}🌾`:''].filter(Boolean).join(' '), cp.pos.x, cp.pos.y+44);
    }
    ctx.globalAlpha = 1;
  }
}

export function renderUnits(ctx: CanvasRenderingContext2D, s: GameState, tick: number) {
  for (const unit of Object.values(s.units)) {
    if (unit.state === 'dead') continue;
    const isHuman = unit.ownerId === s.humanPlayerId;
    const ownerColor = s.players[unit.ownerId]?.color || '#aaa';
    const anim = (tick * 0.05 + unit.id.charCodeAt(1) * 0.1) % 1;

    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(unit.pos.x+3, unit.pos.y+14, 11, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    if (isHuman) {
      ctx.save(); ctx.globalAlpha = 0.28 + Math.sin(tick*0.08)*0.12;
      ctx.strokeStyle = ownerColor; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(unit.pos.x, unit.pos.y, 20, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    let facing = 0;
    if (unit.state==='moving' && unit.targetPos) {
      facing = Math.atan2(unit.targetPos.y-unit.pos.y, unit.targetPos.x-unit.pos.x);
    } else if (unit.targetUnitId && s.units[unit.targetUnitId]) {
      facing = Math.atan2(s.units[unit.targetUnitId].pos.y-unit.pos.y, s.units[unit.targetUnitId].pos.x-unit.pos.x);
    }

    drawUnitSkin(ctx, unit.class, unit.pos.x, unit.pos.y, ownerColor, facing, isHuman, anim);

    if (unit.state === 'attacking') {
      ctx.save(); ctx.globalAlpha = 0.2 + Math.sin(tick*0.3)*0.12;
      ctx.fillStyle = '#ffffffff';
      ctx.beginPath(); ctx.arc(unit.pos.x, unit.pos.y, 22, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    const hp = unit.hp / unit.maxHp;
    const bw = 28, bh = 4, bx = unit.pos.x-bw/2, by = unit.pos.y-26;
    ctx.fillStyle = 'rgba(17,17,17,0.75)'; ctx.fillRect(bx-1, by-1, bw+2, bh+2);
    ctx.fillStyle = hp>0.6?'#4caf50':hp>0.3?'#ff9800':'#f44336';
    ctx.fillRect(bx, by, bw*hp, bh);
  }
}

export function renderCommanders(ctx: CanvasRenderingContext2D, s: GameState, tick: number) {
  for (const cmd of Object.values(s.commanders)) {
    if (!cmd.alive) continue;
    const player = s.players[cmd.ownerId];
    if (!player) continue;
    const isHuman = cmd.ownerId === s.humanPlayerId;
    const color = player.color;

    const bg = ctx.createRadialGradient(cmd.pos.x, cmd.pos.y, 0, cmd.pos.x, cmd.pos.y, 26);
    bg.addColorStop(0, hex2rgba(color, 0.16)); bg.addColorStop(1, hex2rgba(color, 0.0));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cmd.pos.x, cmd.pos.y, 26, 0, Math.PI*2); ctx.fill();

    if (isHuman) {
      ctx.save(); ctx.globalAlpha = 0.14 + Math.sin(tick*0.06)*0.08;
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cmd.pos.x, cmd.pos.y, 28+Math.sin(tick*0.06)*3, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = color; ctx.lineWidth = isHuman?2.5:2;
    ctx.beginPath(); ctx.moveTo(cmd.pos.x, cmd.pos.y+18); ctx.lineTo(cmd.pos.x, cmd.pos.y-28); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cmd.pos.x, cmd.pos.y-28);
    ctx.lineTo(cmd.pos.x+(isHuman?20:15), cmd.pos.y-21);
    ctx.lineTo(cmd.pos.x, cmd.pos.y-14);
    ctx.closePath(); ctx.fill();
    ctx.font = isHuman?'10px serif':'8px serif'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(isHuman?'♛':'⚔', cmd.pos.x+(isHuman?9:7), cmd.pos.y-21);

    const cg = ctx.createRadialGradient(cmd.pos.x-2, cmd.pos.y-2, 0, cmd.pos.x, cmd.pos.y, isHuman?14:11);
    cg.addColorStop(0,'#fff'); cg.addColorStop(1, color);
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cmd.pos.x, cmd.pos.y, isHuman?14:11, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = isHuman ? '#fff' : hex2rgba(color, 0.67); ctx.lineWidth = isHuman?2.5:1.5; ctx.stroke();
    ctx.font = `${isHuman?14:11}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(isHuman?'👑':'⚔️', cmd.pos.x, cmd.pos.y);

    const hp = cmd.hp/cmd.maxHp;
    const bw = isHuman?36:28;
    ctx.fillStyle='rgba(17,17,17,0.75)'; ctx.fillRect(cmd.pos.x-bw/2-1, cmd.pos.y+15, bw+2, 6);
    ctx.fillStyle=hp>0.6?'#4caf50':hp>0.3?'#ff9800':'#f44336';
    ctx.fillRect(cmd.pos.x-bw/2, cmd.pos.y+16, bw*hp, 4);

    const name = player.name.length>14?player.name.slice(0,14)+'…':player.name;
    ctx.font = `bold ${isHuman?11:9}px Manrope, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillText(name, cmd.pos.x+1, cmd.pos.y+23);
    ctx.fillStyle=isHuman?'#f0c060':color; ctx.fillText(name, cmd.pos.x, cmd.pos.y+22);
  }
}

export function renderBuildings(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const bld of Object.values(s.buildings)) {
    const color = s.players[bld.ownerId]?.color || '#aaa';
    ctx.save(); ctx.translate(bld.pos.x, bld.pos.y);
    drawMiniTower(ctx, color, true);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(bld.pos.x, bld.pos.y, bld.range, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}
