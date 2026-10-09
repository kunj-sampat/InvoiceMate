// js/chart.js

function drawBarChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const width = canvas.parentElement.clientWidth || 600;
  const height = options.height || 300;
  canvas.width = width;
  canvas.height = height;
  
  ctx.clearRect(0, 0, width, height);
  
  const barWidth = options.barWidth || 40;
  const gap = options.gap || 20;
  const padding = 40;
  
  const maxVal = options.maxValue || Math.max(...data.map(d => d.value), 10);
  const scale = (height - padding * 2) / maxVal;
  
  // Draw axes
  ctx.beginPath();
  ctx.moveTo(padding, padding / 2);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding / 2, height - padding);
  ctx.strokeStyle = '#ccc';
  ctx.stroke();
  
  let x = padding + gap;
  
  for (const item of data) {
    const barHeight = item.value * scale;
    const y = height - padding - barHeight;
    
    // Draw bar
    ctx.fillStyle = item.color || '#4f46e5';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Draw label
    if (options.showLabels !== false) {
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.font = '12px Arial';
      ctx.fillText(item.label, x + barWidth / 2, height - padding + 15);
    }
    
    // Draw value
    if (options.showValues !== false) {
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(item.value, x + barWidth / 2, y - 5);
    }
    
    x += barWidth + gap;
  }
}

function drawGroupedBarChart(canvasId, labels, datasets) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const width = canvas.parentElement.clientWidth || 600;
  const height = 300;
  canvas.width = width;
  canvas.height = height;
  
  ctx.clearRect(0, 0, width, height);
  
  const padding = 50;
  const legendHeight = 30;
  const graphHeight = height - padding * 2 - legendHeight;
  
  let maxVal = 0;
  datasets.forEach(ds => {
    ds.data.forEach(val => {
      if (val > maxVal) maxVal = val;
    });
  });
  if (maxVal === 0) maxVal = 100;
  
  const scale = graphHeight / maxVal;
  const numGroups = labels.length;
  const groupWidth = (width - padding * 2) / numGroups;
  const numBars = datasets.length;
  const barWidth = (groupWidth * 0.8) / numBars;
  
  // Draw axes
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding - legendHeight);
  ctx.lineTo(width - padding, height - padding - legendHeight);
  ctx.strokeStyle = '#e5e7eb'; // light gray
  ctx.stroke();
  
  // Draw bars
  for (let i = 0; i < numGroups; i++) {
    const groupX = padding + i * groupWidth + (groupWidth * 0.1);
    
    // X Axis Label
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillText(labels[i], padding + i * groupWidth + groupWidth / 2, height - padding - legendHeight + 15);
    
    for (let j = 0; j < numBars; j++) {
      const val = datasets[j].data[i] || 0;
      const barHeight = val * scale;
      const x = groupX + j * barWidth;
      const y = height - padding - legendHeight - barHeight;
      
      ctx.fillStyle = datasets[j].color;
      ctx.fillRect(x, y, barWidth * 0.9, barHeight);
    }
  }
  
  // Draw legend
  let legendX = padding;
  const legendY = height - 15;
  for (let j = 0; j < numBars; j++) {
    ctx.fillStyle = datasets[j].color;
    ctx.fillRect(legendX, legendY - 10, 15, 15);
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'left';
    ctx.fillText(datasets[j].name, legendX + 20, legendY + 2);
    legendX += 100;
  }
}

// ==========================================================================
// INVOZA DUAL-SPLINE CHART & SVG VISUALS
// ==========================================================================

// ==========================================================================
// INVOZA MONTHLY CASH FLOW GROUPED BAR CHART
// Clean, logical comparison of Billed Invoices vs Actual Cash Received
// ==========================================================================

function drawInvozaCashFlowBarChart(canvasId, monthlyData = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.parentElement.clientWidth || 560;
  const height = 185;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  
  ctx.clearRect(0, 0, width, height);

  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 28;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  if (!monthlyData || monthlyData.length === 0) {
    // Empty state
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No invoice activity recorded in this period', width / 2, height / 2);
    return;
  }

  // Find max value across all months for scale
  let maxVal = 0;
  monthlyData.forEach(m => {
    if (m.billed > maxVal) maxVal = m.billed;
    if (m.collected > maxVal) maxVal = m.collected;
  });

  if (maxVal === 0) maxVal = 10000;
  // Round maxVal up to clean interval
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  maxVal = Math.ceil((maxVal * 1.15) / magnitude) * magnitude;

  // Draw 4 dashed horizontal guide lines
  const steps = 4;
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);

  for (let i = 0; i <= steps; i++) {
    const val = (maxVal / steps) * i;
    const y = padTop + plotHeight - (val / maxVal) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    // Axis label
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    let label = '₹0';
    if (val >= 100000) label = `₹${(val / 100000).toFixed(1)}L`;
    else if (val >= 1000) label = `₹${Math.round(val / 1000)}k`;
    else if (val > 0) label = `₹${Math.round(val)}`;
    ctx.fillText(label, padLeft - 6, y + 3);
    ctx.setLineDash([3, 4]);
  }
  ctx.setLineDash([]);

  // Calculate grouped bars
  const numGroups = monthlyData.length;
  const groupSlot = plotWidth / numGroups;
  const barWidth = Math.min(Math.max(groupSlot * 0.28, 12), 24);
  const barGap = 3;

  const barPositions = [];

  monthlyData.forEach((m, idx) => {
    const groupCenterX = padLeft + idx * groupSlot + groupSlot / 2;
    const xBilled = groupCenterX - barWidth - (barGap / 2);
    const xCollected = groupCenterX + (barGap / 2);

    const hBilled = Math.max((m.billed / maxVal) * plotHeight, m.billed > 0 ? 3 : 0);
    const yBilled = padTop + plotHeight - hBilled;

    const hCollected = Math.max((m.collected / maxVal) * plotHeight, m.collected > 0 ? 3 : 0);
    const yCollected = padTop + plotHeight - hCollected;

    // Draw Billed bar (Forest Green #205646)
    ctx.fillStyle = '#205646';
    if (hBilled > 0) {
      drawRoundedBar(ctx, xBilled, yBilled, barWidth, hBilled, 4);
    } else {
      ctx.fillStyle = '#f1f5f9';
      drawRoundedBar(ctx, xBilled, padTop + plotHeight - 2, barWidth, 2, 1);
    }

    // Draw Collected bar (Mint Green #10b981)
    ctx.fillStyle = '#10b981';
    if (hCollected > 0) {
      drawRoundedBar(ctx, xCollected, yCollected, barWidth, hCollected, 4);
    } else {
      ctx.fillStyle = '#f1f5f9';
      drawRoundedBar(ctx, xCollected, padTop + plotHeight - 2, barWidth, 2, 1);
    }

    // Month label
    ctx.fillStyle = '#64748b';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, groupCenterX, height - 8);

    barPositions.push({
      x: groupCenterX,
      month: m.label,
      fullDate: m.fullDate || m.label,
      billed: m.billed,
      collected: m.collected
    });
  });

  // Rounded bar drawing helper
  function drawRoundedBar(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h);
    c.lineTo(x, y + h);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
    c.fill();
  }

  // Interactive Hover Tooltip
  canvas.onmousemove = function(e) {
    const mouseX = e.offsetX;
    let closest = null;
    let minDist = Infinity;
    barPositions.forEach(b => {
      const dist = Math.abs(b.x - mouseX);
      if (dist < minDist && dist < groupSlot * 0.7) {
        minDist = dist;
        closest = b;
      }
    });

    const tip = document.getElementById('chart-tooltip-floating');
    if (tip && closest) {
      tip.style.left = `${Math.min(Math.max(closest.x - 70, 10), width - 160)}px`;
      tip.style.top = `10px`;
      tip.style.display = 'block';
      tip.innerHTML = `
        <div class="chart-tooltip-title">${closest.fullDate}</div>
        <div class="chart-tooltip-row">
          <span style="color:#205646; font-weight:600;">■ Billed:</span>
          <strong>₹${closest.billed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
        <div class="chart-tooltip-row">
          <span style="color:#10b981; font-weight:600;">■ Collected:</span>
          <strong>₹${closest.collected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
      `;
    } else if (tip) {
      tip.style.display = 'none';
    }
  };

  canvas.onmouseleave = function() {
    const tip = document.getElementById('chart-tooltip-floating');
    if (tip) tip.style.display = 'none';
  };
}

// ==========================================================================
// RENDER STAT GRAPHICS (Arc, Donut, Equalizer, 3D Stair Bars)
// ==========================================================================

function renderInvozaStatGraphics(stats = {}) {
  // 1. Total Revenue Arc Gauge
  const elRev = document.getElementById('graphic-total-revenue');
  if (elRev) {
    elRev.innerHTML = `
      <svg width="72" height="42" viewBox="0 0 72 42" fill="none">
        <path d="M6 38 A 30 30 0 0 1 66 38" stroke="#e2e8f0" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="3 3"/>
        <path d="M6 38 A 30 30 0 0 1 54 13" stroke="url(#arcGrad)" stroke-width="5" stroke-linecap="round"/>
        <defs>
          <linearGradient id="arcGrad" x1="6" y1="38" x2="66" y2="38" gradientUnits="userSpaceOnUse">
            <stop stop-color="#10b981"/>
            <stop offset="1" stop-color="#205646"/>
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  // 2. Paid Invoices 72% Donut Ring
  const elPaid = document.getElementById('graphic-paid-invoices');
  if (elPaid) {
    const rate = stats.paidRate || 72;
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (rate / 100) * circumference;
    elPaid.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="18" fill="none" stroke="#f1f5f9" stroke-width="4.5"/>
        <circle cx="25" cy="25" r="18" fill="none" stroke="#10b981" stroke-width="4.5"
          stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          transform="rotate(-90 25 25)"/>
        <text x="25" y="29" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a" font-family="-apple-system, sans-serif">${rate}%</text>
      </svg>
    `;
  }

  // 3. Due Invoices Equalizer Bars
  const elDue = document.getElementById('graphic-due-invoices');
  if (elDue) {
    elDue.innerHTML = `
      <svg width="68" height="42" viewBox="0 0 68 42" fill="none">
        <rect x="4"  y="20" width="5" height="18" rx="2.5" fill="#a7f3d0"/>
        <rect x="14" y="10" width="5" height="28" rx="2.5" fill="#34d399"/>
        <rect x="24" y="16" width="5" height="22" rx="2.5" fill="#10b981"/>
        <rect x="34" y="6"  width="5" height="32" rx="2.5" fill="#205646"/>
        <rect x="44" y="14" width="5" height="24" rx="2.5" fill="#10b981"/>
        <rect x="54" y="8"  width="5" height="30" rx="2.5" fill="#34d399"/>
      </svg>
    `;
  }

  // 4. Overdue 3D Stepped Stair Bars
  const elOver = document.getElementById('graphic-overdue');
  if (elOver) {
    elOver.innerHTML = `
      <svg width="68" height="42" viewBox="0 0 68 42" fill="none">
        <g opacity="0.4">
          <path d="M12 28 L24 22 L24 38 L12 38 Z" fill="#6ee7b7"/>
          <path d="M12 28 L20 25 L32 25 L24 22 Z" fill="#a7f3d0"/>
        </g>
        <g opacity="0.7">
          <path d="M26 20 L40 13 L40 38 L26 38 Z" fill="#34d399"/>
          <path d="M26 20 L35 17 L49 17 L40 13 Z" fill="#6ee7b7"/>
        </g>
        <g opacity="1">
          <path d="M42 12 L56 5 L56 38 L42 38 Z" fill="#205646"/>
          <path d="M42 12 L51 8 L65 8 L56 5 Z" fill="#10b981"/>
        </g>
      </svg>
    `;
  }
}

// ==========================================================================
// RENDER HONEYCOMB CLUSTER (Invoice Lifecycle)
// ==========================================================================

function renderInvozaHoneycomb(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const hexSize = 13.5;
  const centerX = 125;
  const centerY = 125;
  const sqrt3 = Math.sqrt(3);

  // Hexagon point string generator
  function hexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  // Generate hexagonal cluster with axial ring coordinates
  const rings = 3;
  const hexes = [];

  for (let q = -rings; q <= rings; q++) {
    const r1 = Math.max(-rings, -q - rings);
    const r2 = Math.min(rings, -q + rings);
    for (let r = r1; r <= r2; r++) {
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      const cx = centerX + hexSize * (sqrt3 * q + (sqrt3 / 2) * r);
      const cy = centerY + hexSize * (1.5 * r);

      let color = '#10b981'; // Outer emerald
      let opacity = 0.9;

      if (dist === 0) {
        color = '#e07a5f'; // Core Amber
      } else if (dist === 1) {
        color = Math.random() > 0.3 ? '#f4a261' : '#e07a5f'; // Inner Amber / Coral
      } else if (dist === 2) {
        color = Math.random() > 0.4 ? '#264653' : '#2a9d8f'; // Mid Dark Teal
      } else {
        color = Math.random() > 0.5 ? '#10b981' : '#a7f3d0'; // Outer Green / Mint
        opacity = 0.85;
      }

      hexes.push(`<polygon points="${hexPoints(cx, cy, hexSize - 1.2)}" fill="${color}" opacity="${opacity}" stroke="#ffffff" stroke-width="1.2"/>`);
    }
  }

  container.innerHTML = `
    <svg class="invoza-honeycomb-svg" viewBox="0 0 250 250">
      ${hexes.join('')}
    </svg>
  `;
}
