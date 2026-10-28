/**
 * Vote Head Balance & Project Commitment Tracker
 * Financial Vote Book & A4 Printable Reporting Engine
 */

// Storage Keys
const STORAGE_KEY = 'VOTE_HEAD_TRACKER_DATA_V1';
const AUTH_CONFIG_KEY = 'VOTE_HEAD_AUTH_CONFIG_V1';
const AUTH_SESSION_KEY = 'VOTE_HEAD_AUTH_SESSION_V1';
const AUTH_SALT = 'votebook_salt_2026';

let authConfig = null;
let inactivityTimer = null;
let lockoutInterval = null;
let currentRole = 'viewer'; // 'viewer' (Read-Only) or 'admin' (Full Edit Permissions)

// Initial Preset Data
const DEFAULT_DATA = {
  config: {
    baseDate: '2026-09-30',
    orgName: 'Department of Public Works & Engineering Services',
    currency: '$'
  },
  voteHeads: [
    {
      id: 'VH-101',
      code: 'VH-101',
      name: 'Capital Infrastructure & Civil Works',
      initialBalance: 4500000.00,
      description: 'Major building construction, roads, civil structures and regional depots'
    },
    {
      id: 'VH-102',
      code: 'VH-102',
      name: 'Plant, Machinery & Heavy Equipment',
      initialBalance: 2800000.00,
      description: 'Industrial generators, construction machinery, and specialized plant'
    },
    {
      id: 'VH-103',
      code: 'VH-103',
      name: 'ICT Systems & Digital Infrastructure',
      initialBalance: 1950000.00,
      description: 'Enterprise data centers, cloud infrastructure, networking and security'
    },
    {
      id: 'VH-104',
      code: 'VH-104',
      name: 'Consultancy, Capacity & Project Supervision',
      initialBalance: 1250000.00,
      description: 'Engineering design consultants, feasibility studies, audit and QA oversight'
    }
  ],
  projects: [
    {
      id: 'proj-1',
      awardDate: '2026-10-02',
      ref: 'PRJ-2026-081',
      title: 'Construction of Multi-Purpose Admin & Lab Complex - Phase II',
      contractor: 'Apex Buildcon Ltd',
      voteHeadId: 'VH-101',
      amount: 1200000.00,
      paid: 350000.00,
      status: 'Partially Paid',
      notes: 'Tender Board Minute TB/14/2026. Mobilization advance paid.'
    },
    {
      id: 'proj-2',
      awardDate: '2026-10-04',
      ref: 'PRJ-2026-085',
      title: 'Procurement & Installation of 500kVA Industrial Standby Generators',
      contractor: 'Voltech Power Systems',
      voteHeadId: 'VH-102',
      amount: 650000.00,
      paid: 0.00,
      status: 'Awarded (Committed)',
      notes: 'Award letter issued. Site inspection pending before initial claim.'
    },
    {
      id: 'proj-3',
      awardDate: '2026-10-07',
      ref: 'PRJ-2026-089',
      title: 'Enterprise Cloud ERP & Network Infrastructure Upgrade',
      contractor: 'CyberNet Solutions Inc',
      voteHeadId: 'VH-103',
      amount: 480000.00,
      paid: 120000.00,
      status: 'Partially Paid',
      notes: 'Software licensing delivered; hardware installation in progress.'
    },
    {
      id: 'proj-4',
      awardDate: '2026-10-09',
      ref: 'PRJ-2026-092',
      title: 'Technical Feasibility & Environmental Impact Assessment',
      contractor: 'EnviroConsult Partners',
      voteHeadId: 'VH-104',
      amount: 210000.00,
      paid: 210000.00,
      status: 'Completed / Fully Paid',
      notes: 'Final EIA report submitted and approved. Full payment released.'
    },
    {
      id: 'proj-5',
      awardDate: '2026-10-12',
      ref: 'PRJ-2026-095',
      title: 'Refurbishment of Water Treatment Plant & Pumping Line',
      contractor: 'AquaTech Engineering',
      voteHeadId: 'VH-101',
      amount: 850000.00,
      paid: 0.00,
      status: 'Awarded (Committed)',
      notes: 'Awarded under emergency maintenance allocation.'
    }
  ]
};

// Global App State
let appData = loadData();

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Setup Settings dropdown toggle
  const settingsBtn = document.getElementById('settingsMenuBtn');
  const settingsDropdown = document.getElementById('settingsDropdown');
  if (settingsBtn && settingsDropdown) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
      settingsDropdown.classList.remove('show');
    });
  }

  // Currency select listener
  const currSelect = document.getElementById('currencySelect');
  if (currSelect) {
    currSelect.value = appData.config.currency || '$';
    currSelect.addEventListener('change', (e) => {
      if (!requireAdmin('change application currency settings')) {
        currSelect.value = appData.config.currency || '$';
        return;
      }
      appData.config.currency = e.target.value;
      saveData();
      renderAll();
      showToast(`Currency changed to ${appData.config.currency}`);
    });
  }

  // Initialize Security & Role System
  await initAuth();

  // Always render all data views so others can view freely
  renderAll();
});

/**
 * Persistence Functions
 */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure vote heads count is at least 4
      if (parsed.voteHeads && parsed.voteHeads.length >= 4) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load from localStorage:', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
    showToast('Failed to save data to local storage', 'danger');
  }
}

/**
 * Currency Formatter
 */
function formatCurrency(amount, includeSymbol = true) {
  const val = Number(amount) || 0;
  const formatted = val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return includeSymbol ? `${appData.config.currency} ${formatted}` : formatted;
}

/**
 * Formats ISO Date (YYYY-MM-DD) into readable (DD.MM.YYYY)
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

/**
 * Main Calculation Engine:
 * Returns detailed financial metrics for each of the 4 vote heads
 */
function calculateVoteHeadTotals() {
  const totals = {};

  // Initialize for each vote head
  appData.voteHeads.forEach(vh => {
    totals[vh.id] = {
      voteHead: vh,
      initialBalance: Number(vh.initialBalance) || 0,
      totalCommitted: 0,
      totalPaid: 0,
      pendingCommitment: 0,
      availableBalance: Number(vh.initialBalance) || 0,
      projectCount: 0,
      activeProjects: []
    };
  });

  // Sort projects by award date ascending for chronological running balances
  const sortedProjects = [...appData.projects].sort((a, b) => new Date(a.awardDate) - new Date(b.awardDate));

  sortedProjects.forEach(proj => {
    const vhTotal = totals[proj.voteHeadId];
    if (!vhTotal) return;

    const amt = Number(proj.amount) || 0;
    const paid = Number(proj.paid) || 0;

    if (proj.status !== 'Decommitted / Cancelled') {
      vhTotal.totalCommitted += amt;
      vhTotal.totalPaid += paid;
      vhTotal.pendingCommitment += Math.max(0, amt - paid);
      vhTotal.projectCount += 1;
      vhTotal.activeProjects.push(proj);
    }
  });

  // Calculate Net Available Balance: Initial Balance - Total Committed (since commitments encumber full award)
  Object.values(totals).forEach(item => {
    item.availableBalance = item.initialBalance - item.totalCommitted;
    item.committedPercent = item.initialBalance > 0 ? (item.totalCommitted / item.initialBalance) * 100 : 0;
    item.paidPercent = item.initialBalance > 0 ? (item.totalPaid / item.initialBalance) * 100 : 0;
    item.availablePercent = item.initialBalance > 0 ? Math.max(0, (item.availableBalance / item.initialBalance) * 100) : 0;
  });

  // Grand Totals across all 4 heads
  const grandTotal = {
    initialBalance: Object.values(totals).reduce((sum, t) => sum + t.initialBalance, 0),
    totalCommitted: Object.values(totals).reduce((sum, t) => sum + t.totalCommitted, 0),
    totalPaid: Object.values(totals).reduce((sum, t) => sum + t.totalPaid, 0),
    pendingCommitment: Object.values(totals).reduce((sum, t) => sum + t.pendingCommitment, 0),
    availableBalance: Object.values(totals).reduce((sum, t) => sum + t.availableBalance, 0),
    projectCount: Object.values(totals).reduce((sum, t) => sum + t.projectCount, 0)
  };

  grandTotal.committedPercent = grandTotal.initialBalance > 0 ? (grandTotal.totalCommitted / grandTotal.initialBalance) * 100 : 0;
  grandTotal.availablePercent = grandTotal.initialBalance > 0 ? Math.max(0, (grandTotal.availableBalance / grandTotal.initialBalance) * 100) : 0;

  return { voteHeads: totals, grandTotal, sortedProjects };
}

/**
 * Calculates Chronological Ledger with Balance After Each Project for a specific Vote Head
 */
function getVoteHeadLedger(voteHeadId) {
  const vh = appData.voteHeads.find(h => h.id === voteHeadId);
  if (!vh) return null;

  const initialBalance = Number(vh.initialBalance) || 0;
  let runningBalance = initialBalance;
  let runningPaid = 0;

  const projects = appData.projects
    .filter(p => p.voteHeadId === voteHeadId)
    .sort((a, b) => new Date(a.awardDate) - new Date(b.awardDate));

  const entries = [];

  // Opening Balance Entry as at Base Date (30.09.2026)
  entries.push({
    isOpening: true,
    date: appData.config.baseDate,
    ref: 'OPENING',
    title: `Certified Starting Balance as at ${formatDate(appData.config.baseDate)}`,
    contractor: 'Vote Book Allocation',
    prevBalance: initialBalance,
    commitment: 0,
    paid: 0,
    balanceAfter: initialBalance,
    status: 'Certified'
  });

  projects.forEach(proj => {
    const amt = Number(proj.amount) || 0;
    const paid = Number(proj.paid) || 0;
    const prevBalance = runningBalance;

    if (proj.status !== 'Decommitted / Cancelled') {
      runningBalance -= amt;
      runningPaid += paid;
    }

    entries.push({
      isOpening: false,
      id: proj.id,
      date: proj.awardDate,
      ref: proj.ref,
      title: proj.title,
      contractor: proj.contractor,
      prevBalance: prevBalance,
      commitment: amt,
      paid: paid,
      balanceAfter: runningBalance,
      status: proj.status,
      notes: proj.notes
    });
  });

  return {
    voteHead: vh,
    initialBalance,
    finalAvailableBalance: runningBalance,
    totalCommitted: initialBalance - runningBalance,
    totalPaid: runningPaid,
    entries
  };
}

// Global active filter for dashboard Vote Heads ('ALL' or vote head id like 'VH-101')
let activeDashboardFilter = 'ALL';

/**
 * Filter Vote Heads on Dashboard
 */
function filterVoteHeadsDashboard(filterId) {
  activeDashboardFilter = filterId;

  // Update button active state
  document.querySelectorAll('.vh-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filterId);
  });

  // Filter / Highlight vote head cards
  document.querySelectorAll('.vote-head-card').forEach(card => {
    const cardVhId = card.dataset.id;
    if (filterId === 'ALL') {
      card.style.display = 'flex';
      card.classList.remove('highlighted');
    } else if (cardVhId === filterId) {
      card.style.display = 'flex';
      card.classList.add('highlighted');
    } else {
      card.style.display = 'none';
      card.classList.remove('highlighted');
    }
  });

  // Re-render recent projects filtered
  renderRecentProjectsTable();
}

/**
 * Quick Add Project for a specific Vote Head
 */
function openAddProjectForVoteHead(voteHeadId) {
  if (!requireAdmin('award new projects')) return;
  openAddProjectModal();
  const vhSelect = document.getElementById('projVoteHead');
  if (vhSelect) {
    vhSelect.value = voteHeadId;
    updateProjectModalBalanceHint();
    calcModalBalances();
  }
}

/**
 * Render All Views
 */
function renderAll() {
  const data = calculateVoteHeadTotals();

  // Update base date in UI
  const baseDateEl = document.getElementById('displayBaseDate');
  if (baseDateEl) baseDateEl.textContent = formatDate(appData.config.baseDate);

  // Update Currency Prefixes in Modals
  document.querySelectorAll('#modalCurrencyPrefix, #modalCurrencyPrefix2').forEach(el => {
    el.textContent = appData.config.currency;
  });

  // Render Top Metric Cards
  document.getElementById('statTotalInitial').textContent = formatCurrency(data.grandTotal.initialBalance);
  document.getElementById('statTotalCommitted').textContent = formatCurrency(data.grandTotal.totalCommitted);
  document.getElementById('statCommittedCount').textContent = `${data.grandTotal.projectCount} Projects Encumbered (${data.grandTotal.committedPercent.toFixed(1)}% of budget)`;
  document.getElementById('statTotalPaid').textContent = formatCurrency(data.grandTotal.totalPaid);
  document.getElementById('statPendingCommitment').textContent = `Pending Commitments: ${formatCurrency(data.grandTotal.pendingCommitment)}`;
  
  const availEl = document.getElementById('statTotalAvailable');
  availEl.textContent = formatCurrency(data.grandTotal.availableBalance);
  if (data.grandTotal.availableBalance < 0) {
    availEl.className = 'metric-value text-danger';
  } else {
    availEl.className = 'metric-value text-success';
  }
  document.getElementById('statAvailablePercent').textContent = `${data.grandTotal.availablePercent.toFixed(1)}% Free Uncommitted`;

  // Update Project Count Badges
  const pCount = document.getElementById('projectCountBadge');
  if (pCount) pCount.textContent = appData.projects.length;

  // Update Auth / Role Pill & Banners
  updateAuthUI();

  // Render Dashboard Enhancements
  renderFinancialHealthBanner(data);
  renderAnalyticsCharts(data);
  renderVoteHeadCards(data);
  renderRecentProjectsTable(data.sortedProjects);
  renderTopContractors(data);
  renderHealthBreakdown(data);

  // Render Sub-Views
  populateVoteHeadDropdowns();
  renderProjectsList();
  renderLedgerView();
  renderPrintableReport(data);
}

/**
 * Render Executive Financial Health & Audit Alert Bar
 */
function renderFinancialHealthBanner(data) {
  const container = document.getElementById('financialHealthBanner');
  if (!container) return;

  const voteHeadsList = Object.values(data.voteHeads);
  const deficits = voteHeadsList.filter(v => v.availableBalance < 0);
  const lowLiquidity = voteHeadsList.filter(v => v.availableBalance >= 0 && v.availableBalance < v.initialBalance * 0.15);

  let bannerClass = 'status-solvent';
  let badgeText = 'Solvent Position';
  let title = 'Financial Position: Healthy & Solvent';
  let iconSvg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  `;
  let desc = `All 4 Vote Heads maintain positive liquidity as at ${formatDate(appData.config.baseDate)}. Net available funds remain unencumbered for further project awards.`;

  if (deficits.length > 0) {
    bannerClass = 'status-critical';
    badgeText = 'Deficit Warning';
    const totalDef = deficits.reduce((sum, d) => sum + Math.abs(d.availableBalance), 0);
    title = `Unauthorized Vote Head Deficit Detected (${deficits.length} Head${deficits.length > 1 ? 's' : ''})`;
    iconSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
    desc = `Overcommitted by ${formatCurrency(totalDef)} on ${deficits.map(d => d.voteHead.code).join(', ')}. Encumbrances exceed certified balance as at ${formatDate(appData.config.baseDate)}.`;
  } else if (lowLiquidity.length > 0) {
    bannerClass = 'status-warning';
    badgeText = 'Low Liquidity';
    title = `Budget Exhaustion Caution (${lowLiquidity.length} Head${lowLiquidity.length > 1 ? 's' : ''} < 15%)`;
    iconSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;
    desc = `${lowLiquidity.map(l => l.voteHead.code).join(', ')} approaching legal commitment limit. Additional tenders will cause budget overcommitment.`;
  }

  const disbPercent = data.grandTotal.initialBalance > 0 
    ? (data.grandTotal.totalPaid / data.grandTotal.initialBalance * 100).toFixed(1) 
    : '0.0';

  container.className = `financial-health-banner ${bannerClass}`;
  container.innerHTML = `
    <div class="health-banner-left">
      <div class="health-banner-icon">${iconSvg}</div>
      <div>
        <div class="health-banner-title">
          <span>${title}</span>
          <span class="health-status-badge">${badgeText}</span>
        </div>
        <p class="health-banner-desc">${desc}</p>
      </div>
    </div>
    <div class="health-banner-metrics">
      <div class="health-mini-stat">
        <span class="health-mini-label">Commitment Rate</span>
        <span class="health-mini-val text-warning">${data.grandTotal.committedPercent.toFixed(1)}%</span>
      </div>
      <div class="health-mini-stat">
        <span class="health-mini-label">Disbursement Rate</span>
        <span class="health-mini-val text-info">${disbPercent}%</span>
      </div>
      <div class="health-mini-stat">
        <span class="health-mini-label">Pending Liability</span>
        <span class="health-mini-val">${formatCurrency(data.grandTotal.pendingCommitment)}</span>
      </div>
      <div class="health-mini-stat">
        <span class="health-mini-label">Base Position</span>
        <span class="health-mini-val text-success">${formatDate(appData.config.baseDate)}</span>
      </div>
    </div>
  `;
}

/**
 * Render Interactive Visual Analytics (Clustered SVG Bar Chart & Donut Gauge)
 */
function renderAnalyticsCharts(data) {
  renderComparisonBarChart(data);
  renderDonutGauge(data);
}

/**
 * Clustered SVG Bar Chart
 */
function renderComparisonBarChart(data) {
  const container = document.getElementById('voteHeadComparisonChartContainer');
  if (!container) return;

  const heads = appData.voteHeads;
  if (!heads || heads.length === 0) return;

  let maxVal = 0;
  heads.forEach(vh => {
    const stats = data.voteHeads[vh.id];
    if (stats) {
      maxVal = Math.max(maxVal, stats.initialBalance, stats.totalCommitted, stats.totalPaid, Math.max(0, stats.availableBalance));
    }
  });
  if (maxVal === 0) maxVal = 1000000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  maxVal = Math.ceil(maxVal / magnitude) * magnitude;

  const width = 640;
  const height = 260;
  const padLeft = 65;
  const padBottom = 35;
  const padTop = 15;
  const padRight = 20;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const gridSteps = 4;
  let gridSvg = '';
  for (let i = 0; i <= gridSteps; i++) {
    const yVal = (maxVal / gridSteps) * i;
    const yPos = padTop + chartH - (yVal / maxVal) * chartH;
    
    let label = '';
    if (yVal >= 1000000) {
      label = `${appData.config.currency}${(yVal / 1000000).toFixed(1)}M`;
    } else if (yVal >= 1000) {
      label = `${appData.config.currency}${(yVal / 1000).toFixed(0)}k`;
    } else {
      label = `${appData.config.currency}${yVal.toFixed(0)}`;
    }

    gridSvg += `
      <line x1="${padLeft}" y1="${yPos}" x2="${padLeft + chartW}" y2="${yPos}" stroke="#334155" stroke-dasharray="3,3" stroke-width="1" />
      <text x="${padLeft - 8}" y="${yPos + 4}" fill="#64748b" font-family="'JetBrains Mono', monospace" font-size="9" text-anchor="end">${label}</text>
    `;
  }

  const groupW = chartW / heads.length;
  const barW = Math.min(22, (groupW - 20) / 4);

  let barsSvg = '';
  heads.forEach((vh, idx) => {
    const stats = data.voteHeads[vh.id] || { initialBalance: 0, totalCommitted: 0, totalPaid: 0, availableBalance: 0 };
    const groupX = padLeft + idx * groupW + (groupW - (barW * 4 + 6)) / 2;

    const hInit = Math.max(2, (stats.initialBalance / maxVal) * chartH);
    const yInit = padTop + chartH - hInit;

    const hComm = Math.max(2, (stats.totalCommitted / maxVal) * chartH);
    const yComm = padTop + chartH - hComm;

    const hPaid = Math.max(2, (stats.totalPaid / maxVal) * chartH);
    const yPaid = padTop + chartH - hPaid;

    const availVal = stats.availableBalance;
    const isDeficit = availVal < 0;
    const hAvail = Math.max(2, (Math.abs(availVal) / maxVal) * chartH);
    const yAvail = padTop + chartH - hAvail;

    barsSvg += `
      <g class="chart-bar-group" data-vhid="${vh.id}">
        <!-- Base Balance Bar -->
        <rect x="${groupX}" y="${yInit}" width="${barW}" height="${hInit}" rx="3" fill="#64748b"
          onmouseover="showChartTooltip(event, '${escapeHTML(vh.code)}: Base Balance', '${formatCurrency(stats.initialBalance)}', 'Certified opening balance')"
          onmouseout="hideChartTooltip()" />

        <!-- Committed Bar -->
        <rect x="${groupX + barW + 2}" y="${yComm}" width="${barW}" height="${hComm}" rx="3" fill="#f59e0b"
          onmouseover="showChartTooltip(event, '${escapeHTML(vh.code)}: Awarded Commitments', '${formatCurrency(stats.totalCommitted)}', '${stats.committedPercent.toFixed(1)}% of budget encumbered')"
          onmouseout="hideChartTooltip()" />

        <!-- Disbursed Bar -->
        <rect x="${groupX + (barW + 2) * 2}" y="${yPaid}" width="${barW}" height="${hPaid}" rx="3" fill="#0ea5e9"
          onmouseover="showChartTooltip(event, '${escapeHTML(vh.code)}: Disbursed Payments', '${formatCurrency(stats.totalPaid)}', '${stats.paidPercent.toFixed(1)}% of budget disbursed')"
          onmouseout="hideChartTooltip()" />

        <!-- Available Bar -->
        <rect x="${groupX + (barW + 2) * 3}" y="${yAvail}" width="${barW}" height="${hAvail}" rx="3" fill="${isDeficit ? '#ef4444' : '#10b981'}"
          onmouseover="showChartTooltip(event, '${escapeHTML(vh.code)}: ${isDeficit ? 'Deficit Overcommitment' : 'Net Available'}', '${formatCurrency(stats.availableBalance)}', '${isDeficit ? 'Procurement freeze required' : stats.availablePercent.toFixed(1) + '% free'}')"
          onmouseout="hideChartTooltip()" />

        <!-- X Axis Label -->
        <text x="${groupX + (barW * 4 + 6) / 2}" y="${padTop + chartH + 18}" fill="#cbd5e1" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" text-anchor="middle">
          ${escapeHTML(vh.code)}
        </text>
      </g>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${gridSvg}
      <line x1="${padLeft}" y1="${padTop + chartH}" x2="${padLeft + chartW}" y2="${padTop + chartH}" stroke="#475569" stroke-width="1.5" />
      ${barsSvg}
    </svg>
    <div id="chartTooltip" class="chart-tooltip" style="display: none; opacity: 0;"></div>
  `;
}

/**
 * Tooltip handlers for interactive SVG charts
 */
function showChartTooltip(event, title, val, sub = '') {
  const tooltip = document.getElementById('chartTooltip');
  if (!tooltip) return;

  const rect = event.target.getBoundingClientRect();
  const parent = tooltip.parentElement.getBoundingClientRect();

  tooltip.innerHTML = `
    <div class="chart-tooltip-title">${title}</div>
    <div class="chart-tooltip-row">
      <span>Amount:</span>
      <span style="font-weight:700; color:#34d399;">${val}</span>
    </div>
    ${sub ? `<div style="font-size:0.72rem; color:#94a3b8; margin-top:2px;">${sub}</div>` : ''}
  `;

  const left = rect.left - parent.left + rect.width / 2;
  const top = rect.top - parent.top;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.display = 'block';
  setTimeout(() => { tooltip.style.opacity = '1'; }, 10);
}

function hideChartTooltip() {
  const tooltip = document.getElementById('chartTooltip');
  if (tooltip) {
    tooltip.style.opacity = '0';
    setTimeout(() => { tooltip.style.display = 'none'; }, 150);
  }
}

/**
 * Capital Utilization Donut Gauge
 */
function renderDonutGauge(data) {
  const donutContainer = document.getElementById('donutChartContainer');
  const breakdownContainer = document.getElementById('donutBreakdown');
  if (!donutContainer || !breakdownContainer) return;

  const initial = data.grandTotal.initialBalance || 1;
  const paid = data.grandTotal.totalPaid;
  const pending = data.grandTotal.pendingCommitment;
  const avail = Math.max(0, data.grandTotal.availableBalance);

  const pctPaid = Math.min(100, (paid / initial) * 100);
  const pctPending = Math.min(100 - pctPaid, (pending / initial) * 100);
  const pctAvail = Math.max(0, 100 - pctPaid - pctPending);

  const r = 70;
  const circumference = 2 * Math.PI * r;

  const lenPaid = (pctPaid / 100) * circumference;
  const lenPending = (pctPending / 100) * circumference;
  const lenAvail = (pctAvail / 100) * circumference;

  const offsetPaid = 0;
  const offsetPending = -lenPaid;
  const offsetAvail = -(lenPaid + lenPending);

  const totalCommittedPct = data.grandTotal.committedPercent.toFixed(1);

  donutContainer.innerHTML = `
    <svg viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="${r}" fill="none" stroke="#1e293b" stroke-width="20" />
      <circle cx="100" cy="100" r="${r}" fill="none" stroke="#0ea5e9" stroke-width="20"
        stroke-dasharray="${lenPaid} ${circumference - lenPaid}"
        stroke-dashoffset="${offsetPaid}"
        transform="rotate(-90 100 100)" stroke-linecap="round" />
      <circle cx="100" cy="100" r="${r}" fill="none" stroke="#f59e0b" stroke-width="20"
        stroke-dasharray="${lenPending} ${circumference - lenPending}"
        stroke-dashoffset="${offsetPending}"
        transform="rotate(-90 100 100)" />
      <circle cx="100" cy="100" r="${r}" fill="none" stroke="#10b981" stroke-width="20"
        stroke-dasharray="${lenAvail} ${circumference - lenAvail}"
        stroke-dashoffset="${offsetAvail}"
        transform="rotate(-90 100 100)" />
      <text x="100" y="93" class="donut-center-pct">${totalCommittedPct}%</text>
      <text x="100" y="116" class="donut-center-sub">Encumbered</text>
    </svg>
  `;

  breakdownContainer.innerHTML = `
    <div class="donut-row">
      <div class="donut-row-label">
        <span class="donut-row-dot" style="background:#0ea5e9;"></span>
        <span>Actual Disbursed (Paid)</span>
      </div>
      <div class="donut-row-val text-info">${formatCurrency(paid)} (${pctPaid.toFixed(1)}%)</div>
    </div>
    <div class="donut-row">
      <div class="donut-row-label">
        <span class="donut-row-dot" style="background:#f59e0b;"></span>
        <span>Pending Commitments</span>
      </div>
      <div class="donut-row-val text-warning">${formatCurrency(pending)} (${pctPending.toFixed(1)}%)</div>
    </div>
    <div class="donut-row">
      <div class="donut-row-label">
        <span class="donut-row-dot" style="background:#10b981;"></span>
        <span>Net Free Available</span>
      </div>
      <div class="donut-row-val text-success">${formatCurrency(data.grandTotal.availableBalance)} (${pctAvail.toFixed(1)}%)</div>
    </div>
  `;
}

/**
 * Render the 4 Vote Heads Overview Cards
 */
function renderVoteHeadCards(data) {
  const container = document.getElementById('voteHeadsContainer');
  if (!container) return;

  container.innerHTML = '';

  appData.voteHeads.forEach(vh => {
    const stats = data.voteHeads[vh.id] || {
      initialBalance: vh.initialBalance,
      totalCommitted: 0,
      totalPaid: 0,
      availableBalance: vh.initialBalance,
      committedPercent: 0,
      projectCount: 0
    };

    const isDeficit = stats.availableBalance < 0;
    const isLow = stats.availableBalance >= 0 && stats.availableBalance < stats.initialBalance * 0.15;
    const availClass = isDeficit ? 'text-danger' : (isLow ? 'text-warning' : 'text-success');

    let statusBadgeText = `${stats.projectCount} Project${stats.projectCount === 1 ? '' : 's'}`;
    let statusBadgeClass = 'status-paid';
    if (isDeficit) {
      statusBadgeText = 'Overcommitted!';
      statusBadgeClass = 'status-cancelled';
    } else if (isLow) {
      statusBadgeText = 'Low Balance';
      statusBadgeClass = 'status-partial';
    }

    const isFiltered = activeDashboardFilter === vh.id;
    const isHidden = activeDashboardFilter !== 'ALL' && activeDashboardFilter !== vh.id;

    const card = document.createElement('div');
    card.className = `vote-head-card ${isFiltered ? 'highlighted' : ''}`;
    card.dataset.id = vh.id;
    if (isHidden) card.style.display = 'none';

    card.innerHTML = `
      <div>
        <div class="vote-head-card-top">
          <span class="vote-head-code-pill">${escapeHTML(vh.code)}</span>
          <span class="badge-status ${statusBadgeClass}">
            ${statusBadgeText}
          </span>
        </div>
        <h3 class="vote-head-name">${escapeHTML(vh.name)}</h3>
        <p class="text-muted" style="font-size: 0.78rem; margin: 4px 0 12px; line-height: 1.3;">${escapeHTML(vh.description || '')}</p>
        
        <div class="vote-head-fin-row">
          <span class="label">Balance as at ${formatDate(appData.config.baseDate)}:</span>
          <span class="val">${formatCurrency(stats.initialBalance)}</span>
        </div>
        <div class="vote-head-fin-row">
          <span class="label">Awarded Commitments:</span>
          <span class="val text-warning">-${formatCurrency(stats.totalCommitted)}</span>
        </div>
        <div class="vote-head-fin-row">
          <span class="label">Actual Payments Made:</span>
          <span class="val text-info">${formatCurrency(stats.totalPaid)}</span>
        </div>
        <div class="vote-head-fin-row" style="border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px;">
          <span class="label"><strong>Net Available Balance:</strong></span>
          <span class="val ${availClass}" style="font-size: 1.05rem;"><strong>${formatCurrency(stats.availableBalance)}</strong></span>
        </div>
      </div>

      <div class="vote-progress-wrap">
        <div class="vote-progress-labels">
          <span>Committed: ${stats.committedPercent.toFixed(1)}%</span>
          <span>Avail: ${(stats.initialBalance > 0 ? (stats.availableBalance / stats.initialBalance * 100) : 0).toFixed(1)}%</span>
        </div>
        <div class="vote-progress-bar-bg" title="Spent: ${stats.paidPercent.toFixed(1)}%, Pending: ${(stats.committedPercent - stats.paidPercent).toFixed(1)}%, Free: ${stats.availablePercent.toFixed(1)}%">
          <div class="progress-segment-spent" style="width: ${Math.min(100, stats.paidPercent)}%"></div>
          <div class="progress-segment-committed" style="width: ${Math.min(100 - stats.paidPercent, Math.max(0, stats.committedPercent - stats.paidPercent))}%"></div>
          <div class="progress-segment-avail" style="width: ${Math.max(0, stats.availablePercent)}%"></div>
        </div>
        
        <div class="vote-head-card-footer">
          <button class="btn-card-award" onclick="openAddProjectForVoteHead('${vh.id}')" title="Award new commitment against this vote head">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>+ Award</span>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="viewVoteHeadLedger('${vh.id}')">View Ledger &rarr;</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Render Recent Projects on Dashboard (with filter support)
 */
function renderRecentProjectsTable(sortedProjects) {
  const tbody = document.getElementById('recentProjectsTableBody');
  if (!tbody) return;

  const projectsToUse = sortedProjects || calculateVoteHeadTotals().sortedProjects;
  let recent = [...projectsToUse].reverse();

  // Filter by active dashboard vote head filter
  if (activeDashboardFilter !== 'ALL') {
    recent = recent.filter(p => p.voteHeadId === activeDashboardFilter);
  }

  // Filter by status dropdown
  const statusFilter = document.getElementById('recentStatusFilter')?.value || 'ALL';
  if (statusFilter !== 'ALL') {
    recent = recent.filter(p => p.status === statusFilter);
  }

  recent = recent.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">No matching awarded projects recorded. Click "Award New Project" to add.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(p => {
    const vh = appData.voteHeads.find(h => h.id === p.voteHeadId) || { code: p.voteHeadId };
    return `
      <tr>
        <td class="font-mono text-muted">${formatDate(p.awardDate)}</td>
        <td>
          <div style="font-weight: 600;">${escapeHTML(p.title)}</div>
          <small class="text-muted font-mono">${escapeHTML(p.ref)} &bull; ${escapeHTML(p.contractor)}</small>
        </td>
        <td><span class="vote-head-code-pill" style="font-size: 0.7rem;">${escapeHTML(vh.code)}</span></td>
        <td class="font-mono font-bold text-warning">${formatCurrency(p.amount)}</td>
        <td><span class="badge-status ${getStatusBadgeClass(p.status)}">${escapeHTML(p.status)}</span></td>
        <td>
          ${isAdminLoggedIn() ? `
            <button class="btn btn-secondary btn-sm" onclick="openEditProjectModal('${p.id}')">Edit</button>
          ` : `
            <button class="btn btn-action-view btn-sm" onclick="openProjectDetailModal('${p.id}')">View</button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Top Contractors & Payee Liability Concentration
 */
function renderTopContractors(data) {
  const container = document.getElementById('topContractorsContainer');
  if (!container) return;

  const contractorMap = {};

  appData.projects.forEach(p => {
    if (p.status === 'Decommitted / Cancelled') return;
    const name = (p.contractor || 'Unassigned').trim();
    if (!contractorMap[name]) {
      contractorMap[name] = {
        name,
        totalCommitted: 0,
        totalPaid: 0,
        projectCount: 0
      };
    }
    contractorMap[name].totalCommitted += Number(p.amount) || 0;
    contractorMap[name].totalPaid += Number(p.paid) || 0;
    contractorMap[name].projectCount += 1;
  });

  const sortedContractors = Object.values(contractorMap).sort((a, b) => b.totalCommitted - a.totalCommitted).slice(0, 4);

  if (sortedContractors.length === 0) {
    container.innerHTML = `<div class="text-center text-muted" style="padding: 1.5rem 0;">No active contractors registered yet.</div>`;
    return;
  }

  container.innerHTML = sortedContractors.map(c => {
    const paidPct = c.totalCommitted > 0 ? Math.min(100, (c.totalPaid / c.totalCommitted) * 100) : 0;
    const out = Math.max(0, c.totalCommitted - c.totalPaid);

    return `
      <div class="contractor-item">
        <div class="contractor-row-top">
          <span class="contractor-name" title="${escapeHTML(c.name)}">${escapeHTML(c.name)}</span>
          <span class="contractor-val">${formatCurrency(c.totalCommitted)}</span>
        </div>
        <div class="contractor-progress-track">
          <div style="background-color: #0ea5e9; width: ${paidPct}%; height: 100%;" title="Paid: ${formatCurrency(c.totalPaid)}"></div>
          <div style="background-color: #f59e0b; width: ${100 - paidPct}%; height: 100%;" title="Pending: ${formatCurrency(out)}"></div>
        </div>
        <div class="contractor-sub">
          <span>${c.projectCount} Contract${c.projectCount > 1 ? 's' : ''} &bull; Paid: ${paidPct.toFixed(0)}%</span>
          <span>Pending: ${formatCurrency(out)}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Allocation Health Bars
 */
function renderHealthBreakdown(data) {
  const container = document.getElementById('healthBreakdownContainer');
  if (!container) return;

  container.innerHTML = appData.voteHeads.map(vh => {
    const stats = data.voteHeads[vh.id];
    const isDeficit = stats.availableBalance < 0;
    return `
      <div style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
          <span style="font-weight: 600;">${escapeHTML(vh.code)}: ${escapeHTML(vh.name)}</span>
          <span class="font-mono ${isDeficit ? 'text-danger' : 'text-success'}">
            ${isDeficit ? 'DEFICIT ' : ''}${formatCurrency(stats.availableBalance)}
          </span>
        </div>
        <div class="vote-progress-bar-bg" style="height: 6px;">
          <div class="progress-segment-spent" style="width: ${Math.min(100, stats.paidPercent)}%"></div>
          <div class="progress-segment-committed" style="width: ${Math.min(100 - stats.paidPercent, Math.max(0, stats.committedPercent - stats.paidPercent))}%"></div>
          <div class="progress-segment-avail" style="width: ${Math.max(0, stats.availablePercent)}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Projects Register Tab
 */
function renderProjectsList() {
  const tbody = document.getElementById('projectsTableBody');
  if (!tbody) return;

  const searchTerm = (document.getElementById('projectSearchInput')?.value || '').toLowerCase();
  const filterHead = document.getElementById('voteHeadFilter')?.value || 'ALL';

  let filtered = [...appData.projects];

  if (filterHead !== 'ALL') {
    filtered = filtered.filter(p => p.voteHeadId === filterHead);
  }

  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(searchTerm) ||
      p.ref.toLowerCase().includes(searchTerm) ||
      p.contractor.toLowerCase().includes(searchTerm) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm))
    );
  }

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.awardDate) - new Date(a.awardDate));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding: 2rem;">No matching project commitments found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p, idx) => {
    const vh = appData.voteHeads.find(h => h.id === p.voteHeadId) || { code: p.voteHeadId, name: 'Unknown' };
    const outstanding = Math.max(0, (Number(p.amount) || 0) - (Number(p.paid) || 0));

    return `
      <tr>
        <td class="text-muted font-mono">${idx + 1}</td>
        <td class="font-mono text-muted">${formatDate(p.awardDate)}</td>
        <td class="font-mono font-bold">${escapeHTML(p.ref)}</td>
        <td>
          <div style="font-weight: 600;">${escapeHTML(p.title)}</div>
          ${p.notes ? `<small class="text-muted">${escapeHTML(p.notes)}</small>` : ''}
        </td>
        <td>
          <span class="vote-head-code-pill" title="${escapeHTML(vh.name)}">${escapeHTML(vh.code)}</span>
        </td>
        <td>${escapeHTML(p.contractor)}</td>
        <td class="font-mono font-bold text-right text-warning">${formatCurrency(p.amount)}</td>
        <td class="font-mono text-right text-info">${formatCurrency(p.paid)}</td>
        <td class="font-mono text-right">${formatCurrency(outstanding)}</td>
        <td><span class="badge-status ${getStatusBadgeClass(p.status)}">${escapeHTML(p.status)}</span></td>
        <td>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button class="btn btn-action-view" onclick="openProjectDetailModal('${p.id}')" title="View Detailed Record">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>View</span>
            </button>
            ${isAdminLoggedIn() ? `
              <button class="btn btn-secondary btn-sm" onclick="openEditProjectModal('${p.id}')" title="Edit Commitment">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button class="btn btn-secondary btn-sm text-danger" onclick="deleteProject('${p.id}')" title="Delete Commitment">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm btn-action-locked" onclick="openAdminLoginModal('Administrator sign-in is required to edit commitments')" title="Admin Only - Click to sign in">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Open Project Details Modal (Available to all users in View-Only or Admin mode)
 */
function openProjectDetailModal(id) {
  const proj = appData.projects.find(p => p.id === id);
  if (!proj) return;

  const vh = appData.voteHeads.find(h => h.id === proj.voteHeadId) || { code: proj.voteHeadId, name: 'Unknown Vote Head' };
  const outstanding = Math.max(0, (Number(proj.amount) || 0) - (Number(proj.paid) || 0));

  const body = document.getElementById('projectDetailBody');
  const footer = document.getElementById('projectDetailFooter');
  if (!body || !footer) return;

  body.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item full-width">
        <div class="detail-label">Project Title & Scope Description</div>
        <div class="detail-val" style="font-size: 1.05rem;">${escapeHTML(proj.title)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Contract / Project Ref</div>
        <div class="detail-val font-mono" style="color: #60a5fa;">${escapeHTML(proj.ref)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Award Date</div>
        <div class="detail-val font-mono">${formatDate(proj.awardDate)}</div>
      </div>
      <div class="detail-item full-width">
        <div class="detail-label">Contractor / Payee Awardee</div>
        <div class="detail-val">${escapeHTML(proj.contractor)}</div>
      </div>
      <div class="detail-item full-width">
        <div class="detail-label">Charged Vote Head</div>
        <div class="detail-val">
          <span class="vote-head-code-pill">${escapeHTML(vh.code)}</span> ${escapeHTML(vh.name)}
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Awarded Value (Commitment)</div>
        <div class="detail-val large font-mono text-warning">${formatCurrency(proj.amount)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Actual Paid to Date</div>
        <div class="detail-val large font-mono text-info">${formatCurrency(proj.paid)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Outstanding Commitment</div>
        <div class="detail-val large font-mono">${formatCurrency(outstanding)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Commitment Status</div>
        <div class="detail-val">
          <span class="badge-status ${getStatusBadgeClass(proj.status)}">${escapeHTML(proj.status)}</span>
        </div>
      </div>
      <div class="detail-item full-width">
        <div class="detail-label">Procurement Remarks / Tender Board Minute</div>
        <div class="detail-notes-box">${escapeHTML(proj.notes || 'No remarks recorded for this contract.')}</div>
      </div>
    </div>
  `;

  if (isAdminLoggedIn()) {
    footer.innerHTML = `
      <button type="button" class="btn btn-secondary" onclick="closeModal('projectDetailModal')">Close</button>
      <button type="button" class="btn btn-primary" onclick="closeModal('projectDetailModal'); openEditProjectModal('${proj.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        Edit Project Commitment
      </button>
    `;
  } else {
    footer.innerHTML = `
      <button type="button" class="btn btn-secondary" onclick="closeModal('projectDetailModal')">Close</button>
      <button type="button" class="btn btn-primary" onclick="closeModal('projectDetailModal'); openAdminLoginModal('Sign in as Admin to edit this project commitment')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        Sign In as Admin to Edit
      </button>
    `;
  }

  openModal('projectDetailModal');
}

/**
 * Render Running Balance Ledger Tab
 */
function renderLedgerView() {
  const select = document.getElementById('ledgerVoteHeadSelect');
  if (!select) return;

  const currentVhId = select.value || appData.voteHeads[0].id;
  const ledgerData = getVoteHeadLedger(currentVhId);
  if (!ledgerData) return;

  // Render Header summary card
  const headerCard = document.getElementById('ledgerHeaderCard');
  if (headerCard) {
    const isDeficit = ledgerData.finalAvailableBalance < 0;
    headerCard.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="vote-head-code-pill" style="font-size: 0.85rem;">${escapeHTML(ledgerData.voteHead.code)}</span>
          <h3 style="font-size: 1.25rem;">${escapeHTML(ledgerData.voteHead.name)}</h3>
        </div>
        <p class="text-muted" style="margin-top: 4px; font-size: 0.85rem;">${escapeHTML(ledgerData.voteHead.description || '')}</p>
      </div>
      <div>
        <span class="metric-label">Opening Balance (30.09.2026)</span>
        <div class="metric-value" style="font-size: 1.25rem;">${formatCurrency(ledgerData.initialBalance)}</div>
      </div>
      <div>
        <span class="metric-label">Total Commitments Awarded</span>
        <div class="metric-value text-warning" style="font-size: 1.25rem;">${formatCurrency(ledgerData.totalCommitted)}</div>
      </div>
      <div>
        <span class="metric-label">Progressive Available Balance</span>
        <div class="metric-value ${isDeficit ? 'text-danger' : 'text-success'}" style="font-size: 1.25rem;">
          ${formatCurrency(ledgerData.finalAvailableBalance)}
        </div>
      </div>
    `;
  }

  // Render Table entries
  const tbody = document.getElementById('ledgerTableBody');
  if (!tbody) return;

  tbody.innerHTML = ledgerData.entries.map((entry) => {
    const isDeficit = entry.balanceAfter < 0;
    return `
      <tr style="${entry.isOpening ? 'background-color: rgba(59, 130, 246, 0.05); font-weight: 600;' : ''}">
        <td class="font-mono text-muted">${formatDate(entry.date)}</td>
        <td class="font-mono font-bold">${escapeHTML(entry.ref)}</td>
        <td>
          <div>${escapeHTML(entry.title)}</div>
          ${entry.notes ? `<small class="text-muted">${escapeHTML(entry.notes)}</small>` : ''}
        </td>
        <td>${escapeHTML(entry.contractor)}</td>
        <td class="font-mono text-right text-muted">${formatCurrency(entry.prevBalance)}</td>
        <td class="font-mono text-right text-warning">${entry.commitment > 0 ? `-${formatCurrency(entry.commitment)}` : '-'}</td>
        <td class="font-mono text-right text-info">${entry.paid > 0 ? formatCurrency(entry.paid) : '-'}</td>
        <td class="font-mono text-right ${isDeficit ? 'text-danger' : 'text-success'}" style="font-weight: 700;">
          ${formatCurrency(entry.balanceAfter)}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Official A4 Printable Report (Both for print preview and print output)
 */
function renderPrintableReport(data) {
  // Update Report Meta
  const genDate = document.getElementById('printGeneratedDate');
  if (genDate) genDate.textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const orgEl = document.getElementById('printOrgName');
  if (orgEl) orgEl.textContent = appData.config.orgName;

  const currEl = document.getElementById('printCurrencyUnit');
  if (currEl) currEl.textContent = `${appData.config.currency} (${getCurrencyName(appData.config.currency)})`;

  // 1. Table 1: 4 Vote Heads Summary Body
  const sumTbody = document.getElementById('printVoteSummaryTableBody');
  const sumTfoot = document.getElementById('printVoteSummaryTableFoot');

  if (sumTbody && sumTfoot) {
    sumTbody.innerHTML = appData.voteHeads.map(vh => {
      const stats = data.voteHeads[vh.id];
      const isDeficit = stats.availableBalance < 0;
      return `
        <tr>
          <td class="font-mono"><strong>${escapeHTML(vh.code)}</strong></td>
          <td>
            <strong>${escapeHTML(vh.name)}</strong>
            <div style="font-size: 7.5pt; color: #64748b;">${escapeHTML(vh.description || '')}</div>
          </td>
          <td class="font-mono text-right">${formatCurrency(stats.initialBalance)}</td>
          <td class="font-mono text-right" style="color: #b45309;">${formatCurrency(stats.totalCommitted)}</td>
          <td class="font-mono text-right" style="color: #0369a1;">${formatCurrency(stats.totalPaid)}</td>
          <td class="font-mono text-right" style="font-weight: 700; ${isDeficit ? 'color: #dc2626;' : 'color: #047857;'}">
            ${formatCurrency(stats.availableBalance)}
          </td>
        </tr>
      `;
    }).join('');

    sumTfoot.innerHTML = `
      <tr>
        <td colspan="2"><strong>CONSOLIDATED GRAND TOTALS:</strong></td>
        <td class="font-mono text-right"><strong>${formatCurrency(data.grandTotal.initialBalance)}</strong></td>
        <td class="font-mono text-right" style="color: #b45309;"><strong>${formatCurrency(data.grandTotal.totalCommitted)}</strong></td>
        <td class="font-mono text-right" style="color: #0369a1;"><strong>${formatCurrency(data.grandTotal.totalPaid)}</strong></td>
        <td class="font-mono text-right" style="font-weight: 800; ${data.grandTotal.availableBalance < 0 ? 'color: #dc2626;' : 'color: #047857;'}">
          <strong>${formatCurrency(data.grandTotal.availableBalance)}</strong>
        </td>
      </tr>
    `;
  }

  // 2. Table 2: Awarded Projects Register Table
  const projTbody = document.getElementById('printProjectsTableBody');
  const projTfoot = document.getElementById('printProjectsTableFoot');

  if (projTbody && projTfoot) {
    const activeProjects = data.sortedProjects.filter(p => p.status !== 'Decommitted / Cancelled');
    
    if (activeProjects.length === 0) {
      projTbody.innerHTML = `<tr><td colspan="7" class="text-center">No project commitments registered.</td></tr>`;
    } else {
      projTbody.innerHTML = activeProjects.map((p, idx) => {
        const vh = appData.voteHeads.find(h => h.id === p.voteHeadId) || { code: p.voteHeadId };
        const outstanding = Math.max(0, (Number(p.amount) || 0) - (Number(p.paid) || 0));
        return `
          <tr>
            <td class="text-center font-mono">${idx + 1}</td>
            <td class="font-mono">${formatDate(p.awardDate)}</td>
            <td class="font-mono"><strong>${escapeHTML(p.ref)}</strong></td>
            <td>
              <div><strong>${escapeHTML(p.title)}</strong></div>
              <div style="font-size: 7.5pt; color: #475569;">Contractor: ${escapeHTML(p.contractor)} &bull; Status: ${escapeHTML(p.status)}</div>
            </td>
            <td class="font-mono"><strong>${escapeHTML(vh.code)}</strong></td>
            <td class="font-mono text-right" style="font-weight: 600;">${formatCurrency(p.amount)}</td>
            <td class="font-mono text-right">${formatCurrency(outstanding)}</td>
          </tr>
        `;
      }).join('');

      const totalAwarded = activeProjects.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const totalOut = activeProjects.reduce((s, p) => s + Math.max(0, (Number(p.amount) || 0) - (Number(p.paid) || 0)), 0);

      projTfoot.innerHTML = `
        <tr>
          <td colspan="5"><strong>TOTAL ACTIVE PROJECT COMMITMENTS:</strong></td>
          <td class="font-mono text-right"><strong>${formatCurrency(totalAwarded)}</strong></td>
          <td class="font-mono text-right"><strong>${formatCurrency(totalOut)}</strong></td>
        </tr>
      `;
    }
  }

  // 3. Section 3: Detailed Ledger per Vote Head
  const ledgersContainer = document.getElementById('printLedgersContainer');
  if (ledgersContainer) {
    ledgersContainer.innerHTML = appData.voteHeads.map(vh => {
      const ledger = getVoteHeadLedger(vh.id);
      return `
        <div style="margin-bottom: 14px; page-break-inside: avoid;">
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-bottom: none; padding: 4px 8px; font-size: 8pt; display: flex; justify-content: space-between;">
            <span><strong>${escapeHTML(vh.code)} - ${escapeHTML(vh.name)}</strong></span>
            <span>Opening: <strong>${formatCurrency(ledger.initialBalance)}</strong> | Available Balance: <strong style="${ledger.finalAvailableBalance < 0 ? 'color: #dc2626;' : 'color: #047857;'}">${formatCurrency(ledger.finalAvailableBalance)}</strong></span>
          </div>
          <table class="a4-table" style="font-size: 7.5pt; margin-bottom: 0;">
            <thead>
              <tr>
                <th style="width: 12%;">Date</th>
                <th style="width: 14%;">Ref / Contract</th>
                <th style="width: 34%;">Transaction / Project Title</th>
                <th class="text-right" style="width: 13%;">Prev Balance</th>
                <th class="text-right" style="width: 13%;">Commitment</th>
                <th class="text-right" style="width: 14%;">Balance After</th>
              </tr>
            </thead>
            <tbody>
              ${ledger.entries.map(e => `
                <tr style="${e.isOpening ? 'background-color: #f8fafc;' : ''}">
                  <td class="font-mono">${formatDate(e.date)}</td>
                  <td class="font-mono">${escapeHTML(e.ref)}</td>
                  <td>${escapeHTML(e.title)} ${e.contractor && !e.isOpening ? `<span style="color: #64748b;">(${escapeHTML(e.contractor)})</span>` : ''}</td>
                  <td class="font-mono text-right">${formatCurrency(e.prevBalance)}</td>
                  <td class="font-mono text-right" style="${e.commitment > 0 ? 'color: #b45309; font-weight: 600;' : ''}">${e.commitment > 0 ? `-${formatCurrency(e.commitment)}` : '-'}</td>
                  <td class="font-mono text-right" style="font-weight: 700; ${e.balanceAfter < 0 ? 'color: #dc2626;' : 'color: #047857;'}">${formatCurrency(e.balanceAfter)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
  }
}

/**
 * Updates print preview toggles (Signatures, Ledgers)
 */
function updatePrintPreview() {
  const incSig = document.getElementById('repIncSignatures')?.checked;
  const incLedg = document.getElementById('repIncLedgers')?.checked;

  const sigSection = document.getElementById('printSignaturesSection');
  const ledgSection = document.getElementById('printLedgersSection');

  if (sigSection) sigSection.style.display = incSig ? 'grid' : 'none';
  if (ledgSection) ledgSection.style.display = incLedg ? 'block' : 'none';
}

/**
 * Triggers native A4 printing (Accessible to all users in View-Only and Admin mode)
 */
function triggerA4Print() {
  // Sync the report before printing
  switchTab('reportTab');
  updatePrintPreview();
  setTimeout(() => {
    window.print();
  }, 250);
}

// Automatically sync report before any print action (including Ctrl+P or browser Print menu)
window.addEventListener('beforeprint', () => {
  renderPrintableReport(calculateVoteHeadTotals());
  updatePrintPreview();
});

/**
 * Populate Dropdowns
 */
function populateVoteHeadDropdowns() {
  const projSelect = document.getElementById('projVoteHead');
  const filterSelect = document.getElementById('voteHeadFilter');
  const ledgerSelect = document.getElementById('ledgerVoteHeadSelect');

  if (projSelect) {
    const curVal = projSelect.value;
    projSelect.innerHTML = appData.voteHeads.map(vh => `
      <option value="${vh.id}">${escapeHTML(vh.code)} - ${escapeHTML(vh.name)}</option>
    `).join('');
    if (curVal) projSelect.value = curVal;
  }

  if (filterSelect) {
    const curVal = filterSelect.value;
    filterSelect.innerHTML = `<option value="ALL">All Vote Heads</option>` + appData.voteHeads.map(vh => `
      <option value="${vh.id}">${escapeHTML(vh.code)} - ${escapeHTML(vh.name)}</option>
    `).join('');
    if (curVal) filterSelect.value = curVal;
  }

  if (ledgerSelect) {
    const curVal = ledgerSelect.value;
    ledgerSelect.innerHTML = appData.voteHeads.map(vh => `
      <option value="${vh.id}">${escapeHTML(vh.code)} - ${escapeHTML(vh.name)}</option>
    `).join('');
    if (curVal) ledgerSelect.value = curVal;
  }
}

/**
 * Quick switch to Ledger view for specific vote head
 */
function viewVoteHeadLedger(voteHeadId) {
  switchTab('ledgerTab');
  const select = document.getElementById('ledgerVoteHeadSelect');
  if (select) {
    select.value = voteHeadId;
    renderLedgerView();
  }
}

/**
 * Modal Management
 */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

function openAddProjectModal() {
  if (!requireAdmin('award new projects')) return;
  document.getElementById('editProjectId').value = '';
  document.getElementById('modalTitle').textContent = 'Award New Project (Register Commitment)';
  document.getElementById('saveProjectSubmitBtn').textContent = 'Save & Deduct from Vote Head';
  document.getElementById('projectForm').reset();
  document.getElementById('projAwardDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('projPaid').value = '0';
  updateProjectModalBalanceHint();
  calcModalBalances();
  openModal('projectModal');
}

function openEditProjectModal(id) {
  if (!requireAdmin('edit project commitments')) return;
  const proj = appData.projects.find(p => p.id === id);
  if (!proj) return;

  document.getElementById('editProjectId').value = proj.id;
  document.getElementById('modalTitle').textContent = 'Edit Project Commitment';
  document.getElementById('saveProjectSubmitBtn').textContent = 'Update Commitment';
  document.getElementById('projVoteHead').value = proj.voteHeadId;
  document.getElementById('projAwardDate').value = proj.awardDate;
  document.getElementById('projRef').value = proj.ref;
  document.getElementById('projContractor').value = proj.contractor;
  document.getElementById('projTitle').value = proj.title;
  document.getElementById('projAmount').value = proj.amount;
  document.getElementById('projPaid').value = proj.paid;
  document.getElementById('projStatus').value = proj.status;
  document.getElementById('projNotes').value = proj.notes || '';

  updateProjectModalBalanceHint();
  calcModalBalances();
  openModal('projectModal');
}

function updateProjectModalBalanceHint() {
  const vhId = document.getElementById('projVoteHead').value;
  const hintEl = document.getElementById('projVoteBalanceHint');
  if (!vhId || !hintEl) return;

  const data = calculateVoteHeadTotals();
  const vhStats = data.voteHeads[vhId];
  if (vhStats) {
    hintEl.textContent = `Current available balance on ${vhStats.voteHead.code}: ${formatCurrency(vhStats.availableBalance)}`;
  }
}

function calcModalBalances() {
  const vhId = document.getElementById('projVoteHead').value;
  const amtInput = document.getElementById('projAmount');
  const paidInput = document.getElementById('projPaid');
  const previewBox = document.getElementById('modalResultingBalance');
  const editId = document.getElementById('editProjectId').value;

  if (!vhId || !previewBox) return;

  const newAmt = parseFloat(amtInput.value) || 0;
  const newPaid = parseFloat(paidInput.value) || 0;

  // Auto adjust status if fully paid
  const statusSelect = document.getElementById('projStatus');
  if (newPaid >= newAmt && newAmt > 0 && statusSelect.value === 'Awarded (Committed)') {
    statusSelect.value = 'Completed / Fully Paid';
  } else if (newPaid > 0 && newPaid < newAmt && statusSelect.value === 'Awarded (Committed)') {
    statusSelect.value = 'Partially Paid';
  }

  const data = calculateVoteHeadTotals();
  const vhStats = data.voteHeads[vhId];
  if (!vhStats) return;

  // If editing, exclude old project amount from calculation
  let currentAvail = vhStats.availableBalance;
  if (editId) {
    const existing = appData.projects.find(p => p.id === editId);
    if (existing && existing.voteHeadId === vhId && existing.status !== 'Decommitted / Cancelled') {
      currentAvail += Number(existing.amount) || 0;
    }
  }

  const resulting = currentAvail - newAmt;
  previewBox.textContent = formatCurrency(resulting);

  if (resulting < 0) {
    previewBox.style.color = '#ef4444';
    previewBox.innerHTML = `${formatCurrency(resulting)} <span style="font-size:0.75rem; color:#ef4444;">(Warning: Overcommitted by ${formatCurrency(Math.abs(resulting))})</span>`;
  } else {
    previewBox.style.color = '#34d399';
  }
}

/**
 * Handle Add/Edit Project Form Submit
 */
function handleProjectSubmit(event) {
  event.preventDefault();
  if (!requireAdmin('save project commitment records')) return;

  const editId = document.getElementById('editProjectId').value;
  const voteHeadId = document.getElementById('projVoteHead').value;
  const awardDate = document.getElementById('projAwardDate').value;
  const ref = document.getElementById('projRef').value.trim();
  const contractor = document.getElementById('projContractor').value.trim();
  const title = document.getElementById('projTitle').value.trim();
  const amount = parseFloat(document.getElementById('projAmount').value) || 0;
  const paid = parseFloat(document.getElementById('projPaid').value) || 0;
  const status = document.getElementById('projStatus').value;
  const notes = document.getElementById('projNotes').value.trim();

  if (amount <= 0) {
    showToast('Awarded Contract Amount must be greater than 0', 'danger');
    return;
  }

  if (paid > amount) {
    showToast('Amount paid cannot exceed total awarded contract value', 'danger');
    return;
  }

  if (editId) {
    // Update existing
    const idx = appData.projects.findIndex(p => p.id === editId);
    if (idx !== -1) {
      appData.projects[idx] = {
        ...appData.projects[idx],
        voteHeadId,
        awardDate,
        ref,
        contractor,
        title,
        amount,
        paid,
        status,
        notes
      };
      showToast(`Updated project commitment "${ref}"`);
    }
  } else {
    // Add new project
    const newProj = {
      id: 'proj-' + Date.now(),
      voteHeadId,
      awardDate,
      ref,
      contractor,
      title,
      amount,
      paid,
      status,
      notes
    };
    appData.projects.push(newProj);
    showToast(`Awarded project "${ref}" - Balance deducted from vote head!`);
  }

  saveData();
  closeModal('projectModal');
  renderAll();
}

/**
 * Delete Project
 */
function deleteProject(id) {
  if (!requireAdmin('delete project commitments')) return;
  const proj = appData.projects.find(p => p.id === id);
  if (!proj) return;

  if (confirm(`Are you sure you want to delete project "${proj.ref} - ${proj.title}"? This commitment will be removed and funds restored to the Vote Head.`)) {
    appData.projects = appData.projects.filter(p => p.id !== id);
    saveData();
    renderAll();
    showToast(`Project commitment deleted. Funds returned to Vote Head.`);
  }
}

/**
 * Modal: Configure 4 Vote Heads & Balances
 */
function openConfigModal() {
  if (!requireAdmin('configure Vote Heads and starting balances')) return;
  document.getElementById('cfgBaseDate').value = appData.config.baseDate;
  document.getElementById('cfgOrgName').value = appData.config.orgName;

  const container = document.getElementById('configVoteHeadsList');
  container.innerHTML = appData.voteHeads.slice(0, 4).map((vh, i) => `
    <div style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem;">
      <div style="font-weight: 700; font-size: 0.85rem; color: #60a5fa; margin-bottom: 8px;">
        VOTE HEAD ${i + 1}
      </div>
      <div class="form-row">
        <div class="form-group col-6" style="margin-bottom: 0.5rem;">
          <label>Vote Head Code</label>
          <input type="text" class="form-input cfg-vh-code" data-id="${vh.id}" value="${escapeHTML(vh.code)}" required>
        </div>
        <div class="form-group col-6" style="margin-bottom: 0.5rem;">
          <label>Certified Balance as at ${formatDate(appData.config.baseDate)}</label>
          <input type="number" step="0.01" min="0" class="form-input font-mono cfg-vh-bal" data-id="${vh.id}" value="${vh.initialBalance}" required>
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 0.5rem;">
        <label>Vote Head Title / Account Name</label>
        <input type="text" class="form-input cfg-vh-name" data-id="${vh.id}" value="${escapeHTML(vh.name)}" required>
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Account Scope / Description</label>
        <input type="text" class="form-input cfg-vh-desc" data-id="${vh.id}" value="${escapeHTML(vh.description || '')}">
      </div>
    </div>
  `).join('');

  openModal('configModal');
}

function handleConfigSubmit(event) {
  event.preventDefault();
  if (!requireAdmin('save Vote Head setup')) return;

  appData.config.baseDate = document.getElementById('cfgBaseDate').value;
  appData.config.orgName = document.getElementById('cfgOrgName').value.trim();

  // Read the 4 vote heads
  const codeInputs = document.querySelectorAll('.cfg-vh-code');
  const balInputs = document.querySelectorAll('.cfg-vh-bal');
  const nameInputs = document.querySelectorAll('.cfg-vh-name');
  const descInputs = document.querySelectorAll('.cfg-vh-desc');

  codeInputs.forEach((el, idx) => {
    const id = el.dataset.id;
    const vh = appData.voteHeads.find(h => h.id === id);
    if (vh) {
      vh.code = el.value.trim();
      vh.initialBalance = parseFloat(balInputs[idx].value) || 0;
      vh.name = nameInputs[idx].value.trim();
      vh.description = descInputs[idx].value.trim();
    }
  });

  saveData();
  closeModal('configModal');
  renderAll();
  showToast('Vote Heads configuration and starting balances updated successfully!');
}

/**
 * Tab Navigation
 */
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'ledgerTab') {
    renderLedgerView();
  } else if (tabId === 'reportTab') {
    renderPrintableReport(calculateVoteHeadTotals());
  }
}

/**
 * Export / Import Data (Export is open to all, Import & Reset requires Admin)
 */
function exportDataJSON() {
  const jsonStr = JSON.stringify(appData, null, 2);
  downloadFile(jsonStr, `VoteBook_Backup_${appData.config.baseDate}.json`, 'application/json');
  showToast('Backup JSON exported successfully');
}

function importDataJSON(event) {
  if (!requireAdmin('restore database backups')) {
    if (event.target) event.target.value = '';
    return;
  }
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.voteHeads && parsed.projects) {
        appData = parsed;
        saveData();
        renderAll();
        showToast('Vote Book data imported successfully!');
      } else {
        showToast('Invalid JSON backup file format', 'danger');
      }
    } catch (err) {
      showToast('Error reading JSON backup file', 'danger');
    }
  };
  reader.readAsText(file);
}

function resetToSampleData() {
  if (!requireAdmin('reset data to default samples')) return;
  if (confirm('Are you sure you want to reset all records to the original default sample data? Current changes will be overwritten.')) {
    appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    saveData();
    renderAll();
    showToast('Reset to default sample data.');
  }
}

/**
 * Export Current Ledger as CSV (Available to all users)
 */
function exportCurrentLedgerCSV() {
  const currentVhId = document.getElementById('ledgerVoteHeadSelect').value;
  const ledger = getVoteHeadLedger(currentVhId);
  if (!ledger) return;

  let csv = `Date,Reference,Description,Contractor,Previous Balance,Commitment Award,Amount Paid,Balance After Project,Status\n`;

  ledger.entries.forEach(e => {
    csv += `"${e.date}","${e.ref.replace(/"/g, '""')}","${e.title.replace(/"/g, '""')}","${e.contractor.replace(/"/g, '""')}",${e.prevBalance},${e.commitment},${e.paid},${e.balanceAfter},"${e.status}"\n`;
  });

  downloadFile(csv, `Ledger_${ledger.voteHead.code}_${appData.config.baseDate}.csv`, 'text/csv');
  showToast(`Exported CSV for ${ledger.voteHead.code}`);
}

function exportDataCSV() {
  let csv = `Vote Head,Award Date,Reference,Project Title,Contractor,Award Amount,Amount Paid,Outstanding Commitment,Status,Notes\n`;

  appData.projects.forEach(p => {
    const vh = appData.voteHeads.find(h => h.id === p.voteHeadId) || { code: p.voteHeadId };
    const out = Math.max(0, (Number(p.amount) || 0) - (Number(p.paid) || 0));
    csv += `"${vh.code}","${p.awardDate}","${p.ref.replace(/"/g, '""')}","${p.title.replace(/"/g, '""')}","${p.contractor.replace(/"/g, '""')}",${p.amount},${p.paid},${out},"${p.status}","${(p.notes || '').replace(/"/g, '""')}"\n`;
  });

  downloadFile(csv, `Vote_Book_Commitments_${appData.config.baseDate}.csv`, 'text/csv');
  showToast('Exported commitments register to CSV');
}

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'danger') toast.style.borderColor = 'rgba(239, 68, 68, 0.4)';

  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${type === 'danger' ? '#f87171' : '#34d399'}" stroke-width="2">
      ${type === 'danger' ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' : '<polyline points="20 6 9 17 4 12"></polyline>'}
    </svg>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Helper Utilities
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Awarded (Committed)': return 'status-committed';
    case 'Partially Paid': return 'status-partial';
    case 'Completed / Fully Paid': return 'status-paid';
    case 'Decommitted / Cancelled': return 'status-cancelled';
    default: return 'status-committed';
  }
}

function getCurrencyName(symbol) {
  switch (symbol) {
    case 'Rs.': return 'Rupees';
    case '$': return 'USD';
    case '£': return 'GBP';
    case '€': return 'EUR';
    case 'KSh': return 'KES';
    case 'R': return 'ZAR';
    case '₦': return 'NGN';
    default: return symbol;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   AUTHENTICATION & PASSWORD PROTECTION MODULE
   ========================================================================== */

/**
 * Modern Cryptographic Hashing using Web Crypto API (SHA-256)
 */
async function hashPassword(password, salt = AUTH_SALT) {
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + ':' + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('SubtleCrypto error, falling back:', e);
    }
  }
  // Safe Fallback for legacy environments
  let h = 0;
  const str = password + ':' + salt;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return 'fallback_' + Math.abs(h).toString(16);
}

/**
 * Initialize Authentication Configuration
 */
async function initAuth() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG_KEY);
    if (raw) {
      authConfig = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse auth config:', e);
  }

  if (!authConfig || !authConfig.passwordHash) {
    // Default credentials: username 'admin', password 'admin123'
    const defaultHash = await hashPassword('admin123', AUTH_SALT);
    authConfig = {
      enabled: true,
      username: 'admin',
      displayName: 'Administrator',
      passwordHash: defaultHash,
      salt: AUTH_SALT,
      autoLockMinutes: 30,
      failedAttempts: 0,
      lockoutUntil: 0
    };
    saveAuthConfig();
  }

  setupInactivityListeners();

  // If lockout is still active from previous session, restore countdown
  if (authConfig.lockoutUntil && authConfig.lockoutUntil > Date.now()) {
    const remainingSec = Math.ceil((authConfig.lockoutUntil - Date.now()) / 1000);
    startLockoutCountdown(remainingSec);
  }

  // Check if disabled or already authenticated
  if (!authConfig.enabled) {
    unlockAppUI({ username: authConfig.username, role: 'Administrator' });
    return;
  }

  const session = getActiveSession();
  if (session && session.username) {
    unlockAppUI(session);
  } else {
    currentRole = 'viewer';
    document.body.classList.remove('app-locked');
    updateAuthUI();
  }
}

function saveAuthConfig() {
  try {
    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(authConfig));
  } catch (e) {
    console.error('Failed to save auth config:', e);
  }
}

function getActiveSession() {
  try {
    // Check sessionStorage first
    let raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.expiry && parsed.expiry > Date.now()) {
        return parsed;
      }
    }
    // Check localStorage (Remember Me)
    raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.expiry && parsed.expiry > Date.now()) {
        // Refresh session storage
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    console.error('Session retrieval error:', e);
  }
  return null;
}

function isAppLocked() {
  if (!authConfig || !authConfig.enabled) return false;
  return document.body.classList.contains('app-locked');
}

function lockApp(reason = '') {
  document.body.classList.add('app-locked');
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.classList.add('active');

  // Clear session from sessionStorage and persistent storage
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);

  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');
  if (alertBox && alertText) {
    if (reason) {
      alertText.textContent = reason;
      alertBox.style.display = 'flex';
    } else {
      alertBox.style.display = 'none';
    }
  }

  // Pre-fill username if known
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput && authConfig) {
    uInput.value = authConfig.username || 'admin';
  }
  if (pInput) {
    pInput.value = '';
    setTimeout(() => pInput.focus(), 120);
  }

  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function unlockAppUI(session) {
  document.body.classList.remove('app-locked');
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.classList.remove('active');

  const alertBox = document.getElementById('loginAlert');
  if (alertBox) alertBox.style.display = 'none';

  currentRole = 'admin';
  updateAuthUI();
  resetInactivityTimer();
}

/**
 * Role & Authentication Helpers
 */
function isAdminLoggedIn() {
  const session = getActiveSession();
  return !!(session && session.username);
}

function requireAdmin(actionDescription = 'perform this action') {
  if (isAdminLoggedIn()) return true;
  openAdminLoginModal(`Administrator sign-in is required to ${actionDescription}.`);
  return false;
}

function openAdminLoginModal(reason = '') {
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.classList.add('active');
  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');
  if (alertBox && alertText) {
    if (reason) {
      alertText.textContent = reason;
      alertBox.style.display = 'flex';
    } else {
      alertBox.style.display = 'none';
    }
  }
  const pInput = document.getElementById('loginPassword');
  if (pInput) {
    pInput.value = '';
    setTimeout(() => pInput.focus(), 150);
  }
}

function closeAdminLoginModal() {
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.classList.remove('active');
  document.body.classList.remove('app-locked');
  updateAuthUI();
}

function adminLogout() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
  currentRole = 'viewer';
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  updateAuthUI();
  renderAll();
  showToast('Logged out to View-Only mode');
}

function updateAuthUI() {
  const loggedIn = isAdminLoggedIn();
  const session = getActiveSession();
  currentRole = loggedIn ? 'admin' : 'viewer';

  // 1. Update Header User / Role Pill
  const pill = document.getElementById('authHeaderPill');
  if (pill) {
    if (loggedIn) {
      const username = session?.username || authConfig?.username || 'admin';
      pill.innerHTML = `
        <div class="user-avatar-badge admin-badge" title="Administrator Session Active">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span class="user-status-dot"></span>
        </div>
        <div class="user-role-info">
          <span class="user-name-label font-mono" id="headerUserLabel">${escapeHTML(username)}</span>
          <span class="badge-role-tag admin">Admin</span>
        </div>
        <button class="btn-lock-header" onclick="adminLogout()" title="Lock / Sign Out to View-Only">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Lock</span>
        </button>
      `;
    } else {
      pill.innerHTML = `
        <div class="user-avatar-badge viewer-badge" title="Read-Only Mode">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>
        <div class="user-role-info">
          <span class="user-name-label">View-Only</span>
          <span class="badge-role-tag viewer">Public</span>
        </div>
        <button class="btn-login-header" onclick="openAdminLoginModal()" title="Sign in as Administrator">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Sign In</span>
        </button>
      `;
    }
  }

  // 2. Update View-Only Banner
  const banner = document.getElementById('viewOnlyBanner');
  if (banner) {
    banner.style.display = loggedIn ? 'none' : 'flex';
  }

  // 3. Update Settings Dropdown items
  const menuRoleHeader = document.getElementById('menuRoleHeader');
  if (menuRoleHeader) {
    menuRoleHeader.textContent = loggedIn 
      ? `Role: Administrator (${session?.username || 'admin'})` 
      : 'Role: View-Only (Public)';
  }

  const menuLoginBtn = document.getElementById('menuLoginActionBtn');
  if (menuLoginBtn) {
    menuLoginBtn.style.display = loggedIn ? 'none' : 'flex';
  }

  const menuLogoutDivider = document.getElementById('menuLogoutDivider');
  if (menuLogoutDivider) {
    menuLogoutDivider.style.display = loggedIn ? 'block' : 'none';
  }

  const menuLogoutBtn = document.getElementById('menuLogoutBtn');
  if (menuLogoutBtn) {
    menuLogoutBtn.style.display = loggedIn ? 'flex' : 'none';
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  if (!authConfig) return;

  const now = Date.now();
  if (authConfig.lockoutUntil && authConfig.lockoutUntil > now) {
    const remainSec = Math.ceil((authConfig.lockoutUntil - now) / 1000);
    showLoginAlert(`Workstation temporarily locked. Please wait ${remainSec}s.`);
    return;
  }

  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  const rememberCheckbox = document.getElementById('rememberMeCheckbox');
  const submitBtn = document.getElementById('loginSubmitBtn');

  const enteredUser = uInput ? uInput.value.trim() : '';
  const enteredPass = pInput ? pInput.value : '';

  if (!enteredUser || !enteredPass) {
    showLoginAlert('Please enter both username and password.');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    const enteredHash = await hashPassword(enteredPass, authConfig.salt || AUTH_SALT);
    const userMatch = enteredUser.toLowerCase() === (authConfig.username || 'admin').toLowerCase();
    const passMatch = enteredHash === authConfig.passwordHash;

    if (userMatch && passMatch) {
      // Success
      authConfig.failedAttempts = 0;
      authConfig.lockoutUntil = 0;
      saveAuthConfig();

      const remember = rememberCheckbox ? rememberCheckbox.checked : false;
      const durationHours = remember ? 24 * 7 : 8; // 7 days or 8 hours
      const sessionData = {
        username: authConfig.username,
        role: authConfig.displayName || 'Administrator',
        loginTime: Date.now(),
        expiry: Date.now() + (durationHours * 60 * 60 * 1000)
      };

      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
      if (remember) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
      }

      unlockAppUI(sessionData);
      renderAll();
      showToast(`Welcome back, ${authConfig.displayName || authConfig.username}! Access granted.`, 'info');
      if (pInput) pInput.value = '';
    } else {
      // Failure
      authConfig.failedAttempts = (authConfig.failedAttempts || 0) + 1;
      if (authConfig.failedAttempts >= 5) {
        authConfig.lockoutUntil = Date.now() + (30 * 1000); // 30 sec lockout
        saveAuthConfig();
        startLockoutCountdown(30);
      } else {
        saveAuthConfig();
        const left = 5 - authConfig.failedAttempts;
        showLoginAlert(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
        if (pInput) {
          pInput.value = '';
          pInput.focus();
        }
      }
    }
  } catch (err) {
    console.error('Login verification error:', err);
    showLoginAlert('An error occurred during authentication.');
  } finally {
    if (submitBtn && (!authConfig.lockoutUntil || authConfig.lockoutUntil <= Date.now())) {
      submitBtn.disabled = false;
    }
  }
}

function showLoginAlert(msg) {
  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');
  if (alertBox && alertText) {
    alertText.textContent = msg;
    alertBox.style.display = 'flex';
    alertBox.classList.remove('shake');
    // Force DOM reflow to restart CSS shake animation
    void alertBox.offsetWidth;
    alertBox.classList.add('shake');
  }
}

function startLockoutCountdown(seconds) {
  const submitBtn = document.getElementById('loginSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;

  let remaining = seconds;
  showLoginAlert(`Too many failed attempts. Locked out for ${remaining}s...`);

  if (lockoutInterval) clearInterval(lockoutInterval);
  lockoutInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(lockoutInterval);
      lockoutInterval = null;
      if (authConfig) {
        authConfig.lockoutUntil = 0;
        authConfig.failedAttempts = 0;
        saveAuthConfig();
      }
      if (submitBtn) submitBtn.disabled = false;
      showLoginAlert('Lockout expired. You may now attempt to sign in.');
    } else {
      showLoginAlert(`Too many failed attempts. Locked out for ${remaining}s...`);
    }
  }, 1000);
}

function fillDemoCredentials() {
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput) uInput.value = 'admin';
  if (pInput) pInput.value = 'admin123';
  const alertBox = document.getElementById('loginAlert');
  if (alertBox) alertBox.style.display = 'none';
  showToast('Default credentials loaded (admin / admin123)');
  const submitBtn = document.getElementById('loginSubmitBtn');
  if (submitBtn) submitBtn.focus();
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';

  if (btnEl) {
    btnEl.innerHTML = isPass ? `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    ` : `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
    btnEl.title = isPass ? "Hide Password" : "Show Password";
  }
}

/**
 * Inactivity Monitoring & Auto-Lock
 */
function setupInactivityListeners() {
  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
  let throttleTimer = null;

  events.forEach(ev => {
    window.addEventListener(ev, () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          if (!isAppLocked()) {
            resetInactivityTimer();
          }
        }, 1000);
      }
    }, { passive: true });
  });
}

function resetInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  if (!authConfig || !authConfig.enabled) return;
  const mins = Number(authConfig.autoLockMinutes) || 0;
  if (mins <= 0) return; // 0 = never

  inactivityTimer = setTimeout(() => {
    if (!isAppLocked()) {
      lockApp('Session locked automatically due to inactivity.');
      showToast('Session locked due to inactivity', 'info');
    }
  }, mins * 60 * 1000);
}

/**
 * Security & Password Settings Modal
 */
function openSecurityModal() {
  if (isAppLocked()) return;

  if (authConfig) {
    const uInput = document.getElementById('cfgUsername');
    if (uInput) uInput.value = authConfig.username || 'admin';

    const autoLockSelect = document.getElementById('cfgAutoLock');
    if (autoLockSelect) autoLockSelect.value = String(authConfig.autoLockMinutes || 30);

    const enabledSelect = document.getElementById('cfgAuthEnabled');
    if (enabledSelect) enabledSelect.value = String(authConfig.enabled !== false);
  }

  // Clear fields
  ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const strengthBox = document.getElementById('passwordStrengthBox');
  if (strengthBox) strengthBox.style.display = 'none';

  openModal('securityModal');
}

function evaluatePasswordStrength(pass) {
  const strengthBox = document.getElementById('passwordStrengthBox');
  const strengthFill = document.getElementById('strengthFill');
  const strengthLabel = document.getElementById('strengthLabel');
  if (!strengthBox || !strengthFill || !strengthLabel) return;

  if (!pass) {
    strengthBox.style.display = 'none';
    return;
  }

  strengthBox.style.display = 'flex';

  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;

  if (score <= 1) {
    strengthFill.style.width = '25%';
    strengthFill.style.backgroundColor = '#ef4444';
    strengthLabel.textContent = 'Weak';
    strengthLabel.style.color = '#ef4444';
  } else if (score <= 3) {
    strengthFill.style.width = '60%';
    strengthFill.style.backgroundColor = '#f59e0b';
    strengthLabel.textContent = 'Good';
    strengthLabel.style.color = '#f59e0b';
  } else {
    strengthFill.style.width = '100%';
    strengthFill.style.backgroundColor = '#10b981';
    strengthLabel.textContent = 'Strong';
    strengthLabel.style.color = '#10b981';
  }
}

async function handleChangePasswordSubmit(event) {
  event.preventDefault();

  const newUsername = document.getElementById('cfgUsername').value.trim();
  const currentPass = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;
  const autoLock = parseInt(document.getElementById('cfgAutoLock').value, 10);
  const isEnabled = document.getElementById('cfgAuthEnabled').value === 'true';

  if (!newUsername) {
    showToast('Username cannot be empty', 'danger');
    return;
  }

  // Verify Current Password
  const currHash = await hashPassword(currentPass, authConfig.salt || AUTH_SALT);
  if (currHash !== authConfig.passwordHash) {
    showToast('Current password does not match records', 'danger');
    return;
  }

  if (newPass !== confirmPass) {
    showToast('New password and confirmation do not match', 'danger');
    return;
  }

  if (newPass.length < 4) {
    showToast('New password must be at least 4 characters', 'danger');
    return;
  }

  // Save new hash and settings
  const newHash = await hashPassword(newPass, authConfig.salt || AUTH_SALT);
  authConfig.username = newUsername;
  authConfig.passwordHash = newHash;
  authConfig.autoLockMinutes = isNaN(autoLock) ? 30 : autoLock;
  authConfig.enabled = isEnabled;
  saveAuthConfig();

  const userLabel = document.getElementById('headerUserLabel');
  if (userLabel) userLabel.textContent = newUsername;

  closeModal('securityModal');
  showToast('Security settings & password successfully updated!');
  resetInactivityTimer();
}
