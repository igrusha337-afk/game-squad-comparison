import { UnitClass } from '../types';

export function hex2rgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  if (h.length === 6) {
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(128,128,128,${alpha})`;
}

export function drawUnitSkin(
  ctx: CanvasRenderingContext2D,
  unitClass: UnitClass,
  x: number, y: number,
  teamColor: string,
  facing: number,
  isHuman: boolean,
  anim: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  const sc = isHuman ? 1.15 : 1.0;
  ctx.scale(sc, sc);
  switch (unitClass) {
    case 'infantry': drawInfantry(ctx, teamColor, anim); break;
    case 'archer':   drawArcher(ctx, teamColor, anim);   break;
    case 'cavalry':  drawCavalry(ctx, teamColor, anim);  break;
    case 'knight':   drawKnight(ctx, teamColor, anim);   break;
    case 'engineer': drawEngineer(ctx, teamColor, anim); break;
  }
  ctx.restore();
}

function drawInfantry(ctx: CanvasRenderingContext2D, color: string, anim: number) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 2, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8d0d8';
  ctx.beginPath(); ctx.ellipse(0, 1, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5d5a0';
  ctx.beginPath(); ctx.arc(0, -9, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8899aa';
  ctx.beginPath(); ctx.arc(0, -10, 5.5, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#667788'; ctx.fillRect(-3, -11, 6, 2.5);
  ctx.save(); ctx.rotate(Math.sin(anim * Math.PI * 2) * 0.3);
  ctx.fillStyle = '#d4d0c8'; ctx.fillRect(7, -12, 2.5, 14);
  ctx.fillStyle = '#8b5e3c'; ctx.fillRect(6, 1, 5, 3);
  ctx.restore();
  ctx.fillStyle = color; ctx.strokeStyle = '#c8d0d8'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, -8); ctx.lineTo(-13, -3); ctx.lineTo(-13, 5); ctx.lineTo(-9, 9); ctx.lineTo(-6, 5); ctx.lineTo(-6, -3);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawArcher(ctx: CanvasRenderingContext2D, color: string, anim: number) {
  ctx.fillStyle = hex2rgba(color, 0.8);
  ctx.beginPath(); ctx.ellipse(0, 3, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8b6040';
  ctx.beginPath(); ctx.ellipse(0, 1, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5d5a0';
  ctx.beginPath(); ctx.arc(0, -8, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, -9, 5, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(5, -9); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.rotate(Math.sin(anim * Math.PI * 2) * 0.15);
  ctx.strokeStyle = '#6b4020'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(9, 0, 10, -Math.PI / 2.5, Math.PI / 2.5); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#8b6040'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(18, -4); ctx.stroke();
  ctx.fillStyle = '#c0c0c0';
  ctx.beginPath(); ctx.moveTo(18,-4); ctx.lineTo(22,-4); ctx.lineTo(19,-2); ctx.lineTo(19,-6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6b4020'; ctx.fillRect(-8, -3, 4, 10);
}

function drawCavalry(ctx: CanvasRenderingContext2D, color: string, anim: number) {
  const g = Math.sin(anim * Math.PI * 2);
  ctx.fillStyle = '#7a5030';
  ctx.beginPath(); ctx.ellipse(0, 5, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hex2rgba(color, 0.73);
  ctx.beginPath(); ctx.ellipse(0, 4, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a4020';
  ctx.beginPath(); ctx.ellipse(14, 1, 6, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6040';
  ctx.beginPath(); ctx.moveTo(18,-3); ctx.lineTo(20,-7); ctx.lineTo(22,-3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a2010';
  ctx.beginPath(); ctx.ellipse(10, -2, 4, 2.5, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const l of [{bx:8,by:10,lg:g*6},{bx:2,by:12,lg:-g*5},{bx:-4,by:12,lg:g*5},{bx:-10,by:10,lg:-g*6}]) {
    ctx.beginPath(); ctx.moveTo(l.bx, l.by); ctx.lineTo(l.bx + l.lg * 0.3, l.by + 8 + Math.abs(l.lg)*0.2); ctx.stroke();
  }
  ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-13,3); ctx.bezierCurveTo(-18,0,-20,5+g*3,-17,12); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(2, -8, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a0aab4';
  ctx.beginPath(); ctx.ellipse(2, -9, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5d5a0';
  ctx.beginPath(); ctx.arc(2, -16, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7788aa';
  ctx.beginPath(); ctx.arc(2, -17, 4.5, Math.PI, 0); ctx.fill(); ctx.fillRect(0.5, -22, 3, 6);
  ctx.fillStyle = color; ctx.fillRect(0.5,-22,3,6);
  ctx.strokeStyle = '#6b4020'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(8,-14); ctx.lineTo(26,-22+g*2); ctx.stroke();
  ctx.fillStyle = '#c0c0c0';
  ctx.beginPath(); ctx.moveTo(26,-22+g*2); ctx.lineTo(30,-20+g*2); ctx.lineTo(27,-17+g*2); ctx.closePath(); ctx.fill();
}

function drawKnight(ctx: CanvasRenderingContext2D, color: string, anim: number) {
  const sw = Math.sin(anim * Math.PI * 2) * 0.4;
  ctx.fillStyle = '#7a8898';
  ctx.beginPath(); ctx.ellipse(0, 2, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
  const ng = ctx.createLinearGradient(-7,-8,7,8);
  ng.addColorStop(0,'#d8e8f0'); ng.addColorStop(1,'#8899aa');
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(0,6); ctx.moveTo(-5,0); ctx.lineTo(5,0); ctx.stroke();
  ctx.fillStyle = '#8899aa';
  ctx.beginPath(); ctx.ellipse(-9,-4,4,3,-0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9,-4,4,3,0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f5d5a0';
  ctx.beginPath(); ctx.arc(0,-13,5.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#889ab0';
  ctx.beginPath(); ctx.arc(0,-14,6.5,Math.PI,0); ctx.fill();
  ctx.fillRect(-6.5,-17,13,5);
  ctx.fillStyle = '#222'; ctx.fillRect(-5,-15,10,2);
  ctx.fillStyle = '#aa0000'; ctx.fillRect(-4,-15,8,2);
  ctx.save(); ctx.rotate(sw);
  const sg = ctx.createLinearGradient(-1,-20,3,12);
  sg.addColorStop(0,'#e8eef4'); sg.addColorStop(0.5,'#c0ccd8'); sg.addColorStop(1,'#8899aa');
  ctx.fillStyle = sg; ctx.fillRect(10,-24,3,22);
  ctx.fillStyle = color; ctx.fillRect(7,-3,9,3);
  ctx.fillStyle = '#4a3020'; ctx.fillRect(10.5,0,2,8);
  ctx.fillStyle = '#c8a840';
  ctx.beginPath(); ctx.arc(11.5,9,3,0,Math.PI*2); ctx.fill();
  ctx.restore();
  const shg = ctx.createLinearGradient(-18,-8,-8,10);
  shg.addColorStop(0,'#c8d8e8'); shg.addColorStop(1,'#7a8898');
  ctx.fillStyle = shg;
  ctx.beginPath();
  ctx.moveTo(-10,-12); ctx.lineTo(-17,-5); ctx.lineTo(-17,6); ctx.lineTo(-10,14); ctx.lineTo(-6,6); ctx.lineTo(-6,-5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = hex2rgba(color, 0.8); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(-11.5,1,3.5,0,Math.PI*2); ctx.stroke();
}

function drawEngineer(ctx: CanvasRenderingContext2D, color: string, anim: number) {
  ctx.fillStyle = '#6b4020';
  ctx.beginPath(); ctx.ellipse(0,4,7,10,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = hex2rgba(color, 0.8);
  ctx.beginPath(); ctx.ellipse(0,0,5.5,7,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#4a2810'; ctx.fillRect(-5,2,3.5,4); ctx.fillRect(1.5,2,3.5,4);
  ctx.fillStyle = '#f5d5a0';
  ctx.beginPath(); ctx.arc(0,-9,4.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8b6030';
  ctx.beginPath(); ctx.ellipse(0,-7,3,2.5,0,0,Math.PI); ctx.fill();
  ctx.fillStyle = '#c8a030';
  ctx.beginPath(); ctx.arc(0,-10,5,Math.PI,0); ctx.fill();
  ctx.fillRect(-6,-10,12,2);
  ctx.save(); ctx.rotate(Math.sin(anim*Math.PI*2)*0.5);
  ctx.strokeStyle = '#6b4020'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(6,2); ctx.lineTo(16,-12); ctx.stroke();
  ctx.save(); ctx.translate(16,-12); ctx.rotate(0.7);
  ctx.fillStyle = '#9aa0a8'; ctx.fillRect(-4,-5,8,4);
  ctx.fillStyle = '#c0c8d0'; ctx.fillRect(-3,-5,6,2);
  ctx.restore(); ctx.restore();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-8,6); ctx.lineTo(-6,10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6,6); ctx.lineTo(-4,11); ctx.stroke();
}

export function drawMiniCastle(ctx: CanvasRenderingContext2D, color: string, owned: boolean) {
  const c = owned ? color : '#667788';
  ctx.fillStyle = '#3a3830'; ctx.fillRect(-8,-20,16,22);
  ctx.fillStyle = hex2rgba(c, 0.67); ctx.fillRect(-7,-19,14,20);
  ctx.fillStyle = '#3a3830';
  for (let i = -7; i <= 5; i += 4) ctx.fillRect(i,-22,3,4);
  ctx.fillStyle = '#1a1612';
  ctx.beginPath(); ctx.arc(0,1,4,Math.PI,0); ctx.fillRect(-4,1,8,5); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(0,-28); ctx.stroke();
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(0,-28); ctx.lineTo(7,-25); ctx.lineTo(0,-22); ctx.closePath(); ctx.fill();
  for (const bx of [-12, 12]) {
    ctx.fillStyle = '#2a2820'; ctx.fillRect(bx-4,-14,8,16);
    for (let zi = bx-4; zi<=bx+2; zi+=3) { ctx.fillStyle='#1a1612'; ctx.fillRect(zi,-15,2,3); }
  }
}

export function drawMiniMine(ctx: CanvasRenderingContext2D, color: string, owned: boolean) {
  const c = owned ? color : '#776644';
  ctx.fillStyle = '#2a2418';
  ctx.beginPath(); ctx.arc(0,0,14,Math.PI,0); ctx.fillRect(-14,0,28,12); ctx.fill();
  ctx.strokeStyle = '#5a4830'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0,0,10,Math.PI,0); ctx.stroke();
  ctx.fillStyle = '#0a0806';
  ctx.beginPath(); ctx.arc(0,0,8,Math.PI,0); ctx.fillRect(-8,0,16,8); ctx.fill();
  ctx.fillStyle = '#4a3820';
  ctx.beginPath(); ctx.moveTo(-16,0); ctx.lineTo(0,-16); ctx.lineTo(16,0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = hex2rgba(c, 0.53);
  ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(0,-14); ctx.lineTo(14,0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8,8); ctx.lineTo(8,8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,5); ctx.lineTo(-6,11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,5); ctx.lineTo(6,11); ctx.stroke();
}

export function drawMiniFarm(ctx: CanvasRenderingContext2D, color: string, owned: boolean) {
  const c = owned ? color : '#888866';
  for (let r = 0; r < 4; r++) { ctx.fillStyle = r%2===0?'#3a5a18':'#304e14'; ctx.fillRect(-18,-18+r*9,36,9); }
  ctx.strokeStyle = c; ctx.lineWidth = 1.5;
  for (let col = -14; col <= 14; col += 6) {
    for (let row = 0; row < 4; row++) {
      const wx = col + Math.sin(col*0.5)*2, wy = -14 + row*9;
      ctx.beginPath(); ctx.moveTo(wx,wy+5); ctx.lineTo(wx,wy); ctx.stroke();
      ctx.fillStyle = owned?'#d4a830':'#b09020';
      ctx.beginPath(); ctx.ellipse(wx,wy-2,1.5,3,0,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.fillStyle = '#5a2818'; ctx.fillRect(-6,-20,12,16);
  ctx.fillStyle = '#8b4020';
  ctx.beginPath(); ctx.moveTo(-8,-20); ctx.lineTo(0,-28); ctx.lineTo(8,-20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0,-28); ctx.lineTo(0,-33); ctx.stroke();
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(0,-33); ctx.lineTo(6,-31); ctx.lineTo(0,-29); ctx.closePath(); ctx.fill();
}

export function drawMiniTower(ctx: CanvasRenderingContext2D, color: string, owned: boolean) {
  const c = owned ? color : '#667788';
  ctx.fillStyle = '#2a2820';
  ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#3a3830'; ctx.fillRect(-9,-18,18,20);
  ctx.fillStyle = hex2rgba(c, 0.33); ctx.fillRect(-8,-17,16,18);
  ctx.fillStyle = '#2a2820';
  for (let i = -8; i <= 6; i += 4) ctx.fillRect(i,-19,3,3.5);
  ctx.fillStyle = '#1a1612'; ctx.fillRect(-4,-10,3,5); ctx.fillRect(2,-10,3,5);
  ctx.strokeStyle = c; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0,-19); ctx.lineTo(0,-26); ctx.stroke();
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(6,-23); ctx.lineTo(0,-20); ctx.closePath(); ctx.fill();
}
