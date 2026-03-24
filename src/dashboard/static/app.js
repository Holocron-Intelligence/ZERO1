/**
 * MM Bot Dashboard — real-time client
 * Connects via WebSocket for live updates with volume tracking
 */

const WS_URL = `ws://${location.host}/ws`;
let ws = null;
let reconnectTimer = null;
let equityData = [];
const VOLUME_TARGET = 100000;

// ── WebSocket Connection ──────────────────────────

function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        addLog('WebSocket connected');
        clearTimeout(reconnectTimer);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateDashboard(data);
        } catch (e) {
            console.error('Parse error:', e);
        }
    };

    ws.onclose = () => {
        addLog('WebSocket disconnected — reconnecting...');
        reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = () => { ws.close(); };
}

// ── Update Dashboard ──────────────────────────────

function updateDashboard(data) {
    if (data.bot)         updateStatus(data.bot);
    if (data.signal)      updateSignal(data.signal);
    if (data.performance) updatePerformance(data.performance);
    if (data.positions)   updatePositions(data.positions);
    if (data.volumes)     updateVolumes(data.volumes);
}

// ── DOM Helpers ───────────────────────────────────

function setText(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
}

function setClass(id, className) {
    const el = document.getElementById(id);
    if (el) el.className = className;
}

function setWidth(id, width) {
    const el = document.getElementById(id);
    if (el) el.style.width = width;
}

function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// ── Status ────────────────────────────────────────

function updateStatus(bot) {
    setClass('status-badge', `status-badge ${bot.status}`);
    setText('status-text', bot.status.toUpperCase());
    setText('stat-mode', bot.paper_mode ? 'PAPER' : 'LIVE');
    setClass('stat-mode', `stat-value ${bot.paper_mode ? 'neutral' : 'positive'}`);

    if (bot.start_time) {
        const elapsed = Math.floor(Date.now() / 1000 - bot.start_time);
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = elapsed % 60;
        setText('stat-uptime', `Uptime: ${h}h ${m}m ${s}s`);
    }
}

// ── Signal ────────────────────────────────────────

function updateSignal(signal) {
    const regime = (signal.regime || 'market_making').toUpperCase().replace('_', ' ');
    setText('regime-tag', regime);
    setClass('regime-tag', `regime-tag ${signal.regime || 'market_making'}`);
    setText('bias-direction', signal.bias_direction || 'NEUTRAL');
    setText('bias-score', (signal.bias_score || 0).toFixed(2));

    const score = signal.bias_score || 0;
    if (score > 0) {
        setWidth('bias-long', `${Math.min(score * 50, 50)}%`);
        setWidth('bias-short', '0%');
    } else if (score < 0) {
        setWidth('bias-short', `${Math.min(Math.abs(score) * 50, 50)}%`);
        setWidth('bias-long', '0%');
    } else {
        setWidth('bias-long', '0%');
        setWidth('bias-short', '0%');
    }
}

// ── Performance ───────────────────────────────────
// FIX: use realized balance for P&L (stable), equity (balance+unrealized) for chart only

function updatePerformance(perf) {
    const capital  = perf.capital  || 50;       // equity = balance + unrealized (for chart)
    const balance  = perf.balance  || capital;  // realized balance only (stable P&L)
    const initial  = perf.initial_capital || 50;
    const pnl      = perf.pnl_today || 0;       // realized P&L only — does NOT fluctuate
    const ret      = perf.total_return_pct || 0;
    const unrl     = perf.unrealized_pnl || 0;

    setText('stat-capital', balance.toFixed(2));
    setClass('stat-capital', `stat-value ${balance >= initial ? 'positive' : 'negative'}`);
    setText('stat-initial', `Initial: ${initial.toFixed(2)}`);

    const pnlSign = pnl >= 0 ? '+' : '-';
    setText('stat-pnl', `${pnlSign}${Math.abs(pnl).toFixed(2)}`);
    setClass('stat-pnl', `stat-value ${pnl >= 0 ? 'positive' : 'negative'}`);

    const unrlSign = unrl >= 0 ? '+' : '';
    setText('stat-return', `Return: ${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%  uPNL: ${unrlSign}${unrl.toFixed(2)}`);

    const trades = perf.trades_today || 0;
    const fillRate = perf.fill_rate_pct || 0;
    setText('stat-trades',   trades);
    setText('stat-fillrate', `${fillRate.toFixed(1)}/h`);

    // Equity chart tracks total equity (including unrealized)
    equityData.push(capital);
    if (equityData.length > 500) equityData.shift();
    drawEquityChart();
}

// ── Positions ─────────────────────────────────────

function updatePositions(positions) {
    if (!positions || positions.length === 0) {
        setHTML('positions-body',
            '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No open positions</td></tr>');
        return;
    }

    const posHTML = positions.map(p => {
        const pnl      = p.pnl || 0;
        const pnlClass = pnl >= 0 ? 'positive' : 'negative';
        const sideClass = p.side === 'LONG' ? 'side-long' : 'side-short';
        const pnlSign  = pnl >= 0 ? '+$' : '-$';
        return `<tr>
            <td>${p.symbol || '--'}</td>
            <td class="${sideClass}">${p.side || '--'}</td>
            <td>${(p.size  || 0).toFixed(4)}</td>
            <td>${(p.entry || 0).toFixed(4)}</td>
            <td>${(p.mark  || 0).toFixed(4)}</td>
            <td class="stat-value ${pnlClass}" style="font-size:12px;">${pnlSign}${Math.abs(pnl).toFixed(2)}</td>
        </tr>`;
    }).join('');
    setHTML('positions-body', posHTML);
}

// ── Volume Tracking ───────────────────────────────

function updateVolumes(volumes) {
    const totalVol    = volumes.total        || 0;
    const markets     = volumes.per_market   || {};
    const uptimeHours = volumes.uptime_hours || 0;

    setText('vol-total', formatUSD(totalVol));

    const progress = Math.min((totalVol / VOLUME_TARGET) * 100, 100);
    setText('vol-progress', `${progress.toFixed(1)}%`);
    setWidth('vol-bar', `${progress}%`);

    const rate = uptimeHours > 0 ? totalVol / uptimeHours : 0;
    setText('vol-rate', formatUSD(rate));

    const marketEntries = Object.entries(markets);
    if (marketEntries.length === 0) {
        setHTML('volume-markets', '<div class="volume-market-empty">Waiting for trades...</div>');
        return;
    }

    marketEntries.sort((a, b) => b[1].volume - a[1].volume);
    const maxVol = marketEntries[0][1].volume || 1;

    const volHTML = marketEntries.map(([symbol, data]) => {
        const vol      = data.volume || 0;
        const trades   = data.trades || 0;
        const pnl      = data.pnl   || 0;
        const barWidth = (vol / maxVol) * 100;
        const pnlClass = pnl >= 0 ? 'positive' : 'negative';
        const pnlSign  = pnl >= 0 ? '+$' : '-$';

        return `<div class="volume-market-row">
            <div class="volume-market-info">
                <span class="volume-market-symbol">${symbol}</span>
                <span class="volume-market-trades">${trades} trades</span>
            </div>
            <div class="volume-market-bar-container">
                <div class="volume-market-bar-fill" style="width:${barWidth}%"></div>
            </div>
            <div class="volume-market-values">
                <span class="volume-market-vol">${formatUSD(vol)}</span>
                <span class="volume-market-pnl ${pnlClass}">${pnlSign}${Math.abs(pnl).toFixed(2)}</span>
            </div>
        </div>`;
    }).join('');
    setHTML('volume-markets', volHTML);
}

function formatUSD(val) {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000)    return `${(val / 1000).toFixed(1)}K`;
    return `${(val || 0).toFixed(2)}`;
}

// ── Equity Chart ──────────────────────────────────

function drawEquityChart() {
    const canvas = document.getElementById('equity-canvas');
    if (!canvas || equityData.length < 2) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    canvas.width  = container.offsetWidth;
    canvas.height = container.offsetHeight;

    const W = canvas.width, H = canvas.height, pad = 40;
    ctx.clearRect(0, 0, W, H);

    const minVal = Math.min(...equityData) * 0.998;
    const maxVal = Math.max(...equityData) * 1.002;
    const range  = maxVal - minVal || 1;
    const xStep  = (W - pad * 2) / (equityData.length - 1);
    const lastVal = equityData[equityData.length - 1];
    const initVal = equityData[0];
    const up = lastVal >= initVal;

    const gradient = ctx.createLinearGradient(0, pad, 0, H - pad);
    gradient.addColorStop(0, up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    const xOf = i => pad + i * xStep;
    const yOf = v => H - pad - ((v - minVal) / range) * (H - pad * 2);

    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(equityData[0]));
    for (let i = 1; i < equityData.length; i++) ctx.lineTo(xOf(i), yOf(equityData[i]));
    ctx.strokeStyle = up ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.lineTo(xOf(equityData.length - 1), H - pad);
    ctx.lineTo(xOf(0), H - pad);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = up ? '#10b981' : '#ef4444';
    ctx.font = '600 13px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(lastVal.toFixed(2), W - 10, 25);

    ctx.fillStyle = '#555570';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(maxVal.toFixed(2), 4, pad + 10);
    ctx.fillText(minVal.toFixed(2), 4, H - pad - 4);
}

// ── Bot Control ───────────────────────────────────

async function controlBot(command, btn) {
    if (btn) {
        btn.disabled = true;
        const btnText = btn.querySelector('.btn-text');
        if (btnText) btnText.textContent = '';
        btn.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>');
    }
    try {
        const resp = await fetch('/api/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command }),
        });
        const data = await resp.json();
        addLog(`Bot ${command}: ${data.status}`);
    } catch (e) {
        addLog(`Control error: ${e.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            const spinner = btn.querySelector('.spinner');
            if (spinner) spinner.remove();
            const btnText = btn.querySelector('.btn-text');
            if (btnText) btnText.textContent = command.toUpperCase();
        }
    }
}

// ── Activity Log ──────────────────────────────────

function addLog(msg) {
    const list = document.getElementById('log-list');
    if (!list) return;
    const now = new Date().toTimeString().slice(0, 8);
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">${now}</span><span class="log-msg">${msg}</span>`;
    list.prepend(entry);
    while (list.children.length > 200) list.removeChild(list.lastChild);
}

// ── Clock ─────────────────────────────────────────

function updateClock() {
    setText('clock', new Date().toTimeString().slice(0, 8));
}

// ── TradingView Chart ─────────────────────────────

function loadChart(symbol) {
    const container = document.getElementById('tv-chart-container');
    if (!container) return;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: symbol,
        interval: '5',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        backgroundColor: '#0a0a0a',
        gridColor: 'rgba(0,255,102,0.04)',
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        calendar: false,
        hide_volume: false,
        support_host: 'https://www.tradingview.com'
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.cssText = 'height:100%;width:100%';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.cssText = 'height:calc(100% - 32px);width:100%';
    wrapper.appendChild(inner);
    wrapper.appendChild(script);
    container.appendChild(wrapper);
}

function switchChart(symbol, btn) {
    const tvMap = {
        'SOLUSDT': 'BINANCE:SOLUSDT',
        'HYPEUSD': 'BINANCE:HYPEUSDT',
        'XRPUSDT': 'BINANCE:XRPUSDT',
        'SUIUSDT': 'BINANCE:SUIUSDT',
        'ARBUSDT': 'BINANCE:ARBUSDT',
    };
    const tvSym = tvMap[symbol] || ('BINANCE:' + symbol);
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadChart(tvSym);
}

// ── Init ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    connect();
    setInterval(updateClock, 1000);
    updateClock();
    addLog('Dashboard initialized');
    loadChart('BINANCE:SOLUSDT');
});
