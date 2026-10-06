/*
    Q-Safe Frontend
    ----------------
    Live data mode: uploads an NSL-KDD CSV/TXT to FastAPI.
    Demo mode: runs the backend's controlled attack scenarios.
    All dashboard values and research charts are driven by backend responses.
*/

const API_CONFIG = {
    UPLOAD_ENDPOINT: "/api/upload/analyze",
    DEMO_ENDPOINT: "/api/demo",
    HEALTH_ENDPOINT: "/api/health"
};

function getApiBaseUrl() {
    const configured = window.QSAFE_API_BASE;
    if (configured && typeof configured === "string") {
        return configured.replace(/\/$/, "");
    }

    if (window.location.protocol === "file:") {
        return "http://127.0.0.1:8000";
    }

    const host = window.location.hostname;
    const port = window.location.port;
    const isLocal = host === "localhost" || host === "127.0.0.1";

    if (isLocal && port && port !== "8000") {
        return "http://127.0.0.1:8000";
    }

    return window.location.origin;
}

const THEME_CONFIG = {
    defaultTheme: "quantum-core",
    storageKey: "qsafe-theme"
};

const state = {
    currentResponse: null,
    selectedFile: null,
    history: [],
    datasetRows: [],
    analysisMode: "hybrid"
};

const MODEL_CONFIG = {
    classical: {
        name: "Classical ML",
        type: "LightGBM Threat Classifier",
        description: "41-feature network intrusion classifier for normal-vs-attack detection."
    },
    qber: {
        name: "QBER Model",
        type: "Bayesian QBER Evidence Model",
        description: "Qiskit BB84 simulation plus experimentally calibrated Bayesian eavesdropping evidence."
    },
    hybrid: {
        name: "Hybrid Model",
        type: "Q-Safe Fusion Engine",
        description: "Fuses classical network-threat probability with quantum-channel evidence for adaptive security decisions."
    }
};

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value;
}

function applyTheme(themeName) {
    const validThemes = [
        "quantum-core",
        "cyber-neon",
        "clinical-secure",
        "threat-command",
        "neo-brutalism",
        "midnight-violet",
        "arctic-lab",
        "carbon-matrix",
        "dragon"
    ];

    if (!validThemes.includes(themeName)) {
        themeName = THEME_CONFIG.defaultTheme;
    }

    document.body.dataset.theme = themeName;

    const select = getElement("themeSelect");
    if (select) select.value = themeName;

    localStorage.setItem(THEME_CONFIG.storageKey, themeName);

    const left = getElement("leftNodeLabel");
    const right = getElement("rightNodeLabel");

    if (left && right) {
        if (themeName === "dragon") {
            left.textContent = "PERSON A";
            right.textContent = "PERSON B";
        } else {
            left.textContent = "Hospital A";
            right.textContent = "Cloud";
        }
    }

    if (typeof window.updateDragonTheme === "function") {
        window.updateDragonTheme(themeName);
    }
}

function initializeTheme() {
    const saved = localStorage.getItem(THEME_CONFIG.storageKey);
    applyTheme(saved || THEME_CONFIG.defaultTheme);

    const select = getElement("themeSelect");
    if (select) {
        select.addEventListener("change", event => {
            applyTheme(event.target.value);
        });
    }
}

function normalizeResult(result, source = "backend") {
    const quantum = result.quantum || {};
    const decision = result.decision || {};
    const threat = result.threat || {};
    const model = result.model || {};

    return {
        source,
        mode: result.analysis_mode || result.mode || "hybrid",
        model,
        threat_probability: Number(
            threat.threat_probability ?? result.threat_probability ?? result.summary?.max_threat_probability ?? 0
        ),
        qber: Number(
            quantum.qber ?? result.qber ?? 0
        ),
        channel_noise: Number(
            quantum.noise_rate ?? result.noise_rate ?? 0
        ),
        expected_qber: Number(
            quantum.expected_qber ?? result.expected_qber ?? 0
        ),
        quantum_attack_probability: Number(
            quantum.quantum_attack_probability ?? result.quantum_attack_probability ?? 0
        ),
        eavesdropper_detected: Number(
            quantum.quantum_attack_probability ?? result.quantum_attack_probability ?? 0
        ) >= 0.80,
        decision: String(
            decision.decision ?? result.decision?.decision ?? result.decision ?? "MONITOR"
        ).toUpperCase(),
        reason: decision.reason ?? result.reason ?? "Security assessment completed.",
        qkd: {
            protocol: "BB84",
            qubits_sent: Number(
                quantum.trials && quantum.bits_per_trial
                    ? quantum.trials * quantum.bits_per_trial
                    : result.qkd?.qubits_sent ?? 0
            ),
            sifted_key_length: Number(
                quantum.mean_sifted_key_length ?? result.qkd?.sifted_key_length ?? 0
            )
        },
        raw: result
    };
}

async function postDemo(mode) {
    const response = await fetch(
        getApiBaseUrl() + API_CONFIG.DEMO_ENDPOINT,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode,
                n_bits: 100,
                trials: 10
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    return normalizeResult(payload.result || payload, "demo");
}

async function uploadAndAnalyze() {
    const mode = state.analysisMode;
    const file = state.selectedFile;

    if ((mode === "classical" || mode === "hybrid") && !file) {
        throw new Error("Choose an NSL-KDD CSV/TXT file first.");
    }

    const form = new FormData();

    if (file && (mode === "classical" || mode === "hybrid")) {
        form.append("file", file);
    }

    form.append("analysis_mode", mode);
    form.append("n_bits", getElement("uploadBits").value);
    form.append("trials", getElement("uploadTrials").value);
    form.append("noise_rate", Number(getElement("uploadNoise").value) / 100);
    form.append("eve_probability", Number(getElement("uploadEve").value) / 100);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    try {
        const response = await fetch(
            getApiBaseUrl() + API_CONFIG.UPLOAD_ENDPOINT,
            {
                method: "POST",
                body: form,
                signal: controller.signal
            }
        );

        if (!response.ok) {
            let message = `Backend returned HTTP ${response.status}`;
            try {
                const body = await response.json();
                if (body.detail) message = body.detail;
            } catch (_) {}
            throw new Error(message);
        }

        return await response.json();
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("Analysis timed out. Try fewer bits/trials or a smaller dataset.");
        }
        if (error instanceof TypeError) {
            throw new Error(
                `Cannot reach Q-Safe API at ${getApiBaseUrl()}. Start FastAPI or open the deployed Q-Safe URL.`
            );
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
function setBusy(isBusy, label = "ANALYZING") {
    const button = getElement("uploadAnalyzeButton");
    if (button) {
        button.disabled = isBusy || (state.analysisMode !== "qber" && !state.selectedFile);
        button.textContent = isBusy ? label : getAnalyzeButtonLabel();
    }

    const decision = getElement("decision");
    if (isBusy && decision) {
        decision.textContent = "ANALYZING";
        decision.style.color = "var(--accent)";
    }

    const status = getElement("uploadStatus");
    if (status && isBusy) status.textContent = "Running the real ML + Qiskit pipeline…";
}

function showError(error) {
    console.error(error);
    setBusy(false);
    setText("decision", "ERROR");
    setText("decisionReason", error.message || "Analysis failed.");
    setText("analysisBadge", "API ERROR");
    setText("analysisChannel", "UNAVAILABLE");
    setText("networkEvidence", "UNAVAILABLE");
    setText("quantumEvidence", "UNAVAILABLE");
    setText("uploadStatus", error.message || "Analysis failed.");

    if (typeof window.updateDragonThemeState === "function") {
        window.updateDragonThemeState("REJECT");
    }
}

function recordResearch(result) {
    state.history.push({
        timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }),
        threat: result.threat_probability * 100,
        qber: result.qber * 100,
        noise: result.channel_noise * 100,
        quantumThreat: result.quantum_attack_probability * 100,
        decision: result.decision
    });

    if (state.history.length > 50) state.history.shift();
}

function updateDashboard(result) {
    const data = result.data || result;

    const threat = Number(data.threat_probability || 0);
    const qber = Number(data.qber || 0);
    const noise = Number(data.channel_noise || 0);
    const expected = Number(data.expected_qber || 0);
    const quantumThreat = Number(data.quantum_attack_probability || 0);
    const decision = String(data.decision || "MONITOR").toUpperCase();

    setText("threatProbability", `${(threat * 100).toFixed(1)}%`);
    setText("qber", `${(qber * 100).toFixed(1)}%`);
    setText("noise", `${(noise * 100).toFixed(1)}%`);
    setText("quantumAttackProbability", `${(quantumThreat * 100).toFixed(1)}%`);
    setText("expectedQber", `${(expected * 100).toFixed(1)}%`);
    setText("eve", quantumThreat >= 0.80 ? "DETECTED" : "NOT DETECTED");

    let threatStatus = "LOW RISK";
    if (threat >= 0.75) threatStatus = "HIGH RISK";
    else if (threat >= 0.30) threatStatus = "MEDIUM RISK";
    setText("threatStatus", threatStatus);

    setText("decision", decision);
    setText("decisionReason", data.reason || "Security assessment completed.");

    if (data.qkd) {
        setText("qubitsSent", data.qkd.qubits_sent ?? 0);
        setText("siftedKey", `${Math.round(data.qkd.sifted_key_length ?? 0)} bits`);
        setText("quantumQber", `${(qber * 100).toFixed(1)}%`);
    }

    const channelStatus = getElement("channelStatus");
    const line = getElement("quantumConnection")?.querySelector(".connection-line");
    const decisionCard = getElement("decisionCard");

    let channelText = "SECURE";
    let channelState = "secure";
    let channelColor = "#4ee39a";

    if (decision === "MONITOR") {
        channelText = "MONITOR";
        channelState = "monitor";
        channelColor = "#e8c75c";
    } else if (decision === "REJECT") {
        channelText = "COMPROMISED";
        channelState = "reject";
        channelColor = "#e86b6b";
    }

    if (channelStatus) {
        channelStatus.textContent = channelText;
        channelStatus.style.color = channelColor;
    }
    if (line) {
        line.style.background = channelColor;
        line.style.boxShadow = `0 0 12px ${channelColor}`;
    }
    if (decisionCard) decisionCard.dataset.decision = decision;

    let networkEvidence = "LOW THREAT";
    if (threat >= 0.75) networkEvidence = "HIGH THREAT";
    else if (threat >= 0.30) networkEvidence = "MEDIUM THREAT";

    let quantumEvidence = "NORMAL";
    if (quantumThreat >= 0.80) quantumEvidence = "HIGH EAVESDROPPING EVIDENCE";
    else if (quantumThreat >= 0.40) quantumEvidence = "ELEVATED QUANTUM RISK";
    else if (qber > expected + 0.01) quantumEvidence = "ELEVATED ERROR";

    setText("networkEvidence", networkEvidence);
    setText("quantumEvidence", quantumEvidence);
    setText("analysisChannel", channelText);
    setText("analysisBadge", decision === "REJECT" ? "CRITICAL" : decision);

    const sourceBadge = getElement("sourceBadge");
    if (sourceBadge) {
        sourceBadge.textContent = data.source === "uploaded_dataset" ? "UPLOADED DATA" : "LIVE DEMO";
    }

    if (typeof window.updateDragonThemeState === "function") {
        window.updateDragonThemeState(decision);
    }

    state.currentResponse = data;
    state.history.push({
        timestamp: Date.now(),
        threat,
        qber,
        noise,
        quantumThreat,
        decision
    });
    if (state.history.length > 40) state.history.shift();

    drawResearchCharts();
}

function applyUploadResponse(payload) {
    const normalized = normalizeResult(payload, "upload");
    normalized.raw = payload;
    updateDashboard(normalized);
    renderDataset(payload);

    setText(
        "uploadStatus",
        `Analyzed ${payload.summary.rows_analyzed.toLocaleString()} rows from ${payload.file.name}.`
    );

    const selected = getElement("selectedFileName");
    if (selected) selected.textContent = payload.file.name;
}

function renderDataset(payload) {
    const summary = payload.summary || {};
    const metrics = payload.metrics;
    const cm = payload.confusion_matrix;

    getElement("datasetPanel")?.classList.remove("hidden");

    setText("rowsAnalyzed", Number(summary.rows_analyzed || 0).toLocaleString());
    setText("datasetObservedAttack", summary.observed_attack == null ? "—" : Number(summary.observed_attack).toLocaleString());
    setText("datasetPredictedAttack", Number(summary.predicted_attack || 0).toLocaleString());
    setText("datasetAverageThreat", `${(Number(summary.average_threat_probability || 0) * 100).toFixed(1)}%`);
    setText("datasetPeakThreat", `${(Number(summary.max_threat_probability || 0) * 100).toFixed(1)}%`);

    setText(
        "datasetAccuracy",
        metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : "N/A"
    );
    setText(
        "datasetPrecision",
        metrics ? `${(metrics.precision * 100).toFixed(1)}%` : "N/A"
    );
    setText(
        "datasetRecall",
        metrics ? `${(metrics.recall * 100).toFixed(1)}%` : "N/A"
    );
    setText(
        "datasetF1",
        metrics ? `${(metrics.f1 * 100).toFixed(1)}%` : "N/A"
    );

    if (cm) {
        setText("cmTN", Number(cm.tn).toLocaleString());
        setText("cmFP", Number(cm.fp).toLocaleString());
        setText("cmFN", Number(cm.fn).toLocaleString());
        setText("cmTP", Number(cm.tp).toLocaleString());
    }

    renderAttackDistribution(payload.attack_distribution || []);
    renderThreatHistogram(payload.probability_histogram || []);
    renderPredictionBreakdown(summary, metrics);
    renderDatasetTable(payload.rows || []);
}

function renderAttackDistribution(points) {
    const canvas = getElement("datasetAttackChart");
    if (!canvas) return;

    const top = points.slice(0, 10);
    const labels = top.map(item => item.label);
    const values = top.map(item => item.count);
    drawBarChart(canvas, labels, values, "ATTACK TYPE DISTRIBUTION");
}

function renderThreatHistogram(points) {
    const canvas = getElement("threatHistogramChart");
    if (!canvas) return;

    drawBarChart(
        canvas,
        points.map(item => item.range),
        points.map(item => item.count),
        "THREAT PROBABILITY DISTRIBUTION"
    );
}

function renderPredictionBreakdown(summary, metrics) {
    const canvas = getElement("predictionBreakdownChart");
    if (!canvas) return;

    if (!summary.has_ground_truth) {
        drawBarChart(
            canvas,
            ["PREDICTED NORMAL", "PREDICTED ATTACK"],
            [summary.predicted_normal || 0, summary.predicted_attack || 0],
            "MODEL OUTPUT"
        );
        return;
    }

    drawGroupedBarChart(
        canvas,
        ["NORMAL", "ATTACK"],
        [
            [summary.observed_normal || 0, summary.observed_attack || 0],
            [summary.predicted_normal || 0, summary.predicted_attack || 0]
        ],
        ["ACTUAL", "PREDICTED"]
    );
}

function renderDatasetTable(rows) {
    const body = getElement("datasetTableBody");
    if (!body) return;

    body.innerHTML = "";

    rows.slice(0, 100).forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.row}</td>
            <td>${escapeHtml(row.protocol_type)}</td>
            <td>${escapeHtml(row.service)}</td>
            <td>${escapeHtml(row.flag)}</td>
            <td>${escapeHtml(row.actual_label ?? "—")}</td>
            <td>${escapeHtml(row.predicted_label)}</td>
            <td>${(Number(row.threat_probability) * 100).toFixed(2)}%</td>
        `;
        body.appendChild(tr);
    });

    setText("tableRowCount", `${Math.min(rows.length, 100)} shown`);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function drawResearchCharts() {
    const history = state.history.slice(-20);
    if (!history.length) return;

    drawLineChart(
        getElement("qberNoiseChart"),
        history.map((item, index) => index + 1),
        history.map(item => item.noise * 100),
        history.map(item => item.qber * 100),
        "NOISE %",
        "QBER %"
    );

    drawLineChart(
        getElement("qberEveChart"),
        history.map((item, index) => index + 1),
        history.map(item => item.quantumThreat),
        history.map(item => item.qber * 100),
        "P(EVE) %",
        "QBER %"
    );

    drawScatterChart(
        getElement("threatQberChart"),
        history.map(item => item.threat * 100),
        history.map(item => item.qber * 100),
        "THREAT %",
        "QBER %"
    );

    drawGroupedBarChart(
        getElement("evidenceComparisonChart"),
        ["CLASSICAL", "QUANTUM"],
        [[
            history[history.length - 1].threat * 100,
            history[history.length - 1].quantumThreat * 100
        ]],
        ["CURRENT EVIDENCE"]
    );

    const counts = {
        ACCEPT: 0,
        MONITOR: 0,
        REJECT: 0
    };
    history.forEach(item => {
        if (counts[item.decision] !== undefined) counts[item.decision] += 1;
    });

    drawBarChart(
        getElement("decisionDistributionChart"),
        Object.keys(counts),
        Object.values(counts),
        "DECISIONS IN THIS SESSION"
    );
}

function prepareCanvas(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || 640));
    const height = Math.max(240, Math.floor(rect.height || 300));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
}

function chartTheme() {
    const styles = getComputedStyle(document.body);
    return {
        text: styles.getPropertyValue("--text-soft").trim() || "#9aacc1",
        faint: styles.getPropertyValue("--text-faint").trim() || "#6d829d",
        accent: styles.getPropertyValue("--accent").trim() || "#62a9ff",
        panel: styles.getPropertyValue("--panel-border").trim() || "rgba(255,255,255,.16)"
    };
}

function drawBarChart(canvas, labels, values, title) {
    const prepared = prepareCanvas(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;
    const theme = chartTheme();
    const max = Math.max(1, ...values);
    const left = 48;
    const bottom = 50;
    const top = 22;
    const chartHeight = height - top - bottom;
    const chartWidth = width - left - 18;
    const slot = chartWidth / Math.max(1, values.length);
    const barWidth = Math.max(8, slot * 0.62);

    ctx.font = "11px Segoe UI";
    ctx.fillStyle = theme.faint;
    ctx.textAlign = "left";
    ctx.fillText(title, left, 14);

    ctx.strokeStyle = theme.panel;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, height - bottom);
    ctx.lineTo(width - 18, height - bottom);
    ctx.stroke();

    values.forEach((value, index) => {
        const x = left + slot * index + (slot - barWidth) / 2;
        const barHeight = (Number(value) / max) * chartHeight;
        const y = height - bottom - barHeight;

        ctx.fillStyle = theme.accent;
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = theme.text;
        ctx.font = "10px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText(String(value), x + barWidth / 2, y - 5);

        const label = String(labels[index]);
        ctx.save();
        ctx.translate(x + barWidth / 2, height - bottom + 12);
        ctx.rotate(-Math.PI / 5);
        ctx.fillText(label.slice(0, 14), 0, 0);
        ctx.restore();
    });
}

function drawGroupedBarChart(canvas, labels, datasets, datasetLabels) {
    const prepared = prepareCanvas(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;
    const theme = chartTheme();
    const left = 48;
    const bottom = 44;
    const top = 28;
    const chartHeight = height - top - bottom;
    const chartWidth = width - left - 18;
    const groups = labels.length;
    const series = datasets.length;
    const allValues = datasets.flat();
    const max = Math.max(1, ...allValues);
    const groupWidth = chartWidth / groups;
    const barWidth = Math.max(10, (groupWidth * 0.64) / series);

    ctx.font = "11px Segoe UI";
    ctx.fillStyle = theme.text;
    ctx.fillText("EVIDENCE COMPARISON", left, 16);

    ctx.strokeStyle = theme.panel;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, height - bottom);
    ctx.lineTo(width - 18, height - bottom);
    ctx.stroke();

    datasets.forEach((seriesValues, seriesIndex) => {
        seriesValues.forEach((value, groupIndex) => {
            const x = left + groupWidth * groupIndex + groupWidth * 0.18 + barWidth * seriesIndex;
            const barHeight = (Number(value) / max) * chartHeight;
            const y = height - bottom - barHeight;

            ctx.fillStyle = seriesIndex === 0 ? theme.accent : theme.text;
            ctx.fillRect(x, y, barWidth - 3, barHeight);
        });
    });

    labels.forEach((label, i) => {
        ctx.fillStyle = theme.faint;
        ctx.textAlign = "center";
        ctx.font = "10px Segoe UI";
        ctx.fillText(label, left + groupWidth * i + groupWidth / 2, height - 15);
    });

    datasetLabels.forEach((label, i) => {
        ctx.fillStyle = i === 0 ? theme.accent : theme.text;
        ctx.fillRect(left + i * 120, height - 4, 10, 10);
        ctx.fillText(label, left + 16 + i * 120, height + 4);
    });
}

function drawLineChart(canvas, xs, ys1, ys2, label1, label2) {
    const prepared = prepareCanvas(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;
    const theme = chartTheme();
    const left = 48;
    const right = 18;
    const top = 24;
    const bottom = 36;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const max = Math.max(1, ...ys1, ...ys2);

    ctx.strokeStyle = theme.panel;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, height - bottom);
    ctx.lineTo(width - right, height - bottom);
    ctx.stroke();

    const drawSeries = (values, lineWidth) => {
        ctx.strokeStyle = lineWidth === 0 ? theme.text : theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        values.forEach((value, index) => {
            const x = left + (index / Math.max(1, values.length - 1)) * chartWidth;
            const y = height - bottom - (Number(value) / max) * chartHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    };

    drawSeries(ys1, 1);

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ys2.forEach((value, index) => {
        const x = left + (index / Math.max(1, ys2.length - 1)) * chartWidth;
        const y = height - bottom - (Number(value) / max) * chartHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = theme.text;
    ctx.font = "10px Segoe UI";
    ctx.fillText(label1, left, 14);
    ctx.fillText(label2, left + 110, 14);
}

function drawScatterChart(canvas, xs, ys, xLabel, yLabel) {
    const prepared = prepareCanvas(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;
    const theme = chartTheme();
    const left = 48;
    const right = 18;
    const top = 24;
    const bottom = 36;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const maxX = Math.max(1, ...xs);
    const maxY = Math.max(1, ...ys);

    ctx.strokeStyle = theme.panel;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, height - bottom);
    ctx.lineTo(width - right, height - bottom);
    ctx.stroke();

    xs.forEach((xValue, index) => {
        const yValue = ys[index];
        const x = left + (xValue / maxX) * chartWidth;
        const y = height - bottom - (yValue / maxY) * chartHeight;

        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = theme.text;
    ctx.font = "10px Segoe UI";
    ctx.fillText(`${xLabel} →`, left, 14);
    ctx.fillText(`${yLabel} ↑`, left + 110, 14);
}


function getAnalyzeButtonLabel() {
    if (state.analysisMode === "qber") return "Run QBER Analysis";
    if (state.analysisMode === "classical") return "Analyze with Classical ML";
    return "Run Hybrid Q-Safe Analysis";
}

function updateModelUi() {
    const config = MODEL_CONFIG[state.analysisMode] || MODEL_CONFIG.hybrid;

    setText("selectedModelName", config.name);
    setText("selectedModelType", config.type);
    setText("selectedModelDescription", config.description);

    const title = state.analysisMode === "qber"
        ? "Quantum Channel Analysis"
        : state.analysisMode === "classical"
            ? "Classical Network Threat Analysis"
            : "Hybrid Q-Safe Analysis";
    setText("uploadTitle", title);

    const helper = state.analysisMode === "qber"
        ? "QBER mode does not require a network dataset. It runs the Qiskit BB84 channel experiment and Bayesian evidence model."
        : "Upload an NSL-KDD-compatible CSV/TXT dataset. The selected model will run on the real uploaded rows.";
    setText("uploadHelper", helper);
    setText("uploadAnalyzeButton", getAnalyzeButtonLabel());

    const button = getElement("uploadAnalyzeButton");
    if (button) {
        button.disabled = state.analysisMode !== "qber" && !state.selectedFile;
    }

    const dropzone = getElement("uploadDropzone");
    if (dropzone) {
        dropzone.classList.toggle("qber-optional", state.analysisMode === "qber");
    }
}

function selectAnalysisMode(mode) {
    if (!MODEL_CONFIG[mode]) mode = "hybrid";
    state.analysisMode = mode;
    localStorage.setItem("qsafe-analysis-mode", mode);

    const select = getElement("modelSelect");
    if (select) select.value = mode;

    updateModelUi();

    getElement("modelWorkspace")?.classList.add("hidden");
    getElement("datasetPanel")?.classList.toggle("hidden", mode === "qber");
}

function renderModelResponse(payload) {
    const mode = payload.analysis_mode || state.analysisMode;
    const config = MODEL_CONFIG[mode] || MODEL_CONFIG.hybrid;

    getElement("modelWorkspace")?.classList.remove("hidden");
    setText("modelResultName", config.name);
    setText("modelResultType", config.type);
    setText(
        "modelResultSource",
        payload.file?.name ? `SOURCE: ${payload.file.name}` : "SOURCE: QISKIT SIMULATION"
    );

    const summary = payload.summary || {};
    const quantum = payload.quantum || {};
    const metrics = payload.metrics || null;

    if (mode === "classical") {
        setText("modelMetric1Label", "PEAK THREAT");
        setText("modelMetric1", `${(Number(summary.max_threat_probability || 0) * 100).toFixed(2)}%`);
        setText("modelMetric2Label", "AVG THREAT");
        setText("modelMetric2", `${(Number(summary.average_threat_probability || 0) * 100).toFixed(2)}%`);
        setText("modelMetric3Label", "PREDICTED ATTACKS");
        setText("modelMetric3", Number(summary.predicted_attack || 0).toLocaleString());
        setText("modelMetric4Label", "F1 SCORE");
        setText("modelMetric4", metrics ? `${(metrics.f1 * 100).toFixed(2)}%` : "N/A");

        const attacks = (payload.attack_distribution || []).slice(0, 10);
        drawBarChart(
            getElement("modelChart1"),
            attacks.map(x => x.label),
            attacks.map(x => x.count),
            "UPLOADED DATA — ATTACK DISTRIBUTION"
        );
        drawBarChart(
            getElement("modelChart2"),
            (payload.probability_histogram || []).map(x => x.range),
            (payload.probability_histogram || []).map(x => x.count),
            "UPLOADED DATA — THREAT PROBABILITY"
        );
        drawBarChart(
            getElement("modelChart3"),
            ["NORMAL", "ATTACK"],
            [summary.predicted_normal || 0, summary.predicted_attack || 0],
            "MODEL PREDICTIONS"
        );
        return;
    }

    if (mode === "qber") {
        setText("modelMetric1Label", "QBER");
        setText("modelMetric1", `${(Number(quantum.qber || 0) * 100).toFixed(2)}%`);
        setText("modelMetric2Label", "P(EVE)");
        setText("modelMetric2", `${(Number(quantum.quantum_attack_probability || 0) * 100).toFixed(2)}%`);
        setText("modelMetric3Label", "NOISE");
        setText("modelMetric3", `${(Number(quantum.noise_rate || 0) * 100).toFixed(2)}%`);
        setText("modelMetric4Label", "SIFTED KEY");
        setText("modelMetric4", `${Math.round(Number(quantum.mean_sifted_key_length || 0))} bits`);

        const charts = payload.quantum?.charts || {};
        const noise = charts.qber_vs_noise || [];
        const eve = charts.qber_vs_eve || [];

        drawLineChart(
            getElement("modelChart1"),
            noise.map(x => x.x * 100),
            noise.map(x => x.observed_qber * 100),
            noise.map(x => x.expected_qber * 100),
            "NOISE %",
            "EXPECTED QBER %"
        );

        drawLineChart(
            getElement("modelChart2"),
            eve.map(x => x.x * 100),
            eve.map(x => x.observed_qber * 100),
            eve.map(x => x.expected_qber * 100),
            "EVE %",
            "EXPECTED QBER %"
        );

        const eveProbability = Number(quantum.quantum_attack_probability || 0);
        drawBarChart(
            getElement("modelChart3"),
            ["P(Eve)", "P(Honest)"],
            [eveProbability * 100, (1 - eveProbability) * 100],
            "BAYESIAN CHANNEL EVIDENCE"
        );
        return;
    }

    const decision = payload.decision || {};
    const rows = (payload.rows || []).slice(0, 12);
    setText("modelMetric1Label", "NETWORK THREAT");
    setText("modelMetric1", `${(Number(payload.threat_signal?.value || 0) * 100).toFixed(2)}%`);
    setText("modelMetric2Label", "P(EVE)");
    setText("modelMetric2", `${(Number(quantum.quantum_attack_probability || 0) * 100).toFixed(2)}%`);
    setText("modelMetric3Label", "QBER");
    setText("modelMetric3", `${(Number(quantum.qber || 0) * 100).toFixed(2)}%`);
    setText("modelMetric4Label", "DECISION");
    setText("modelMetric4", String(decision.decision || "MONITOR").toUpperCase());

    drawGroupedBarChart(
        getElement("modelChart1"),
        rows.map((_, i) => `R${i + 1}`),
        [
            rows.map(x => Number(x.threat_probability || 0) * 100),
            rows.map(() => Number(quantum.quantum_attack_probability || 0) * 100)
        ],
        ["NETWORK THREAT", "QUANTUM EVIDENCE"]
    );

    const decisionValue = String(decision.decision || "MONITOR").toUpperCase();
    drawBarChart(
        getElement("modelChart2"),
        ["ACCEPT", "MONITOR", "REJECT"],
        [
            decisionValue === "ACCEPT" ? 1 : 0,
            decisionValue === "MONITOR" ? 1 : 0,
            decisionValue === "REJECT" ? 1 : 0
        ],
        "CURRENT HYBRID DECISION"
    );

    drawScatterChart(
        getElement("modelChart3"),
        rows.map(x => Number(x.threat_probability || 0) * 100),
        rows.map(() => Number(quantum.qber || 0) * 100),
        "NETWORK THREAT %",
        "QBER %"
    );
}

function applyUploadResponse(payload) {
    const mode = payload.analysis_mode || state.analysisMode;
    renderModelResponse(payload);

    if (mode === "hybrid") {
        updateDashboard(normalizeResult(payload, "upload"));
        renderDataset(payload);
        setText(
            "uploadStatus",
            `Hybrid analysis complete: ${Number(payload.summary?.rows_analyzed || 0).toLocaleString()} rows from ${payload.file?.name || "dataset"}.`
        );
    } else if (mode === "classical") {
        renderDataset(payload);
        setText(
            "uploadStatus",
            `Classical ML analysis complete: ${Number(payload.summary?.rows_analyzed || 0).toLocaleString()} rows analyzed.`
        );
    } else {
        setText(
            "uploadStatus",
            `QBER analysis complete: ${(Number(payload.quantum?.qber || 0) * 100).toFixed(2)}% QBER, P(Eve) ${(Number(payload.quantum?.quantum_attack_probability || 0) * 100).toFixed(2)}%.`
        );
    }

    const selected = getElement("selectedFileName");
    if (selected && payload.file?.name) selected.textContent = `${payload.file.name} • analyzed`;
}

function runScenario(name) {
    const map = {
        normal: "NORMAL",
        noise: "NOISY_CHANNEL",
        network: "NETWORK_ATTACK",
        eve: "EAVESDROPPER",
        combined: "COMBINED_ATTACK"
    };

    if (!map[name]) return;

    document.querySelectorAll(".scenario-button").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.scenario === name
        );
    });

    setBusy(true, "RUNNING Q-SAFE");

    postDemo(map[name])
        .then(result => {
            updateDashboard(result);
            setText("uploadStatus", `Live demo complete: ${map[name]}.`);
        })
        .catch(showError)
        .finally(() => setBusy(false));
}

function handleFile(file) {
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".txt")) {
        state.selectedFile = null;
        setText("selectedFileName", "Unsupported file type");
        setText("uploadStatus", "Please select an NSL-KDD CSV or TXT file.");
        const button = getElement("uploadAnalyzeButton");
        if (button) button.disabled = state.analysisMode !== "qber";
        return;
    }

    state.selectedFile = file;
    setText(
        "selectedFileName",
        `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`
    );
    setText(
        "uploadStatus",
        `${file.name} selected — ready for ${MODEL_CONFIG[state.analysisMode].name}.`
    );

    const button = getElement("uploadAnalyzeButton");
    if (button) button.disabled = false;
}

function initializeUpload() {
    const input = getElement("datasetFile");
    const dropzone = getElement("uploadDropzone");
    const chooseButton = getElement("chooseFileButton");
    const analyzeButton = getElement("uploadAnalyzeButton");

    if (input) {
        input.addEventListener("change", event => {
            handleFile(event.target.files?.[0]);
        });
    }

    if (chooseButton && input) {
        chooseButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            input.value = "";
            input.click();
        });
    }

    if (dropzone) {
        ["dragenter", "dragover"].forEach(type => {
            dropzone.addEventListener(type, event => {
                event.preventDefault();
                event.stopPropagation();
                dropzone.classList.add("dragging");
            });
        });

        ["dragleave", "drop"].forEach(type => {
            dropzone.addEventListener(type, event => {
                event.preventDefault();
                event.stopPropagation();
                dropzone.classList.remove("dragging");
            });
        });

        dropzone.addEventListener("drop", event => {
            const dropped = event.dataTransfer?.files?.[0];
            handleFile(dropped);
        });

        dropzone.addEventListener("click", event => {
            if (!input) return;
            if (event.target.closest("button, input, a, label")) return;
            input.value = "";
            input.click();
        });
    }

    if (analyzeButton) {
        analyzeButton.addEventListener("click", async () => {
            setBusy(
                true,
                state.analysisMode === "hybrid" ? "RUNNING Q-SAFE" : "ANALYZING"
            );
            try {
                const payload = await uploadAndAnalyze();
                applyUploadResponse(payload);
            } catch (error) {
                showError(error);
            } finally {
                setBusy(false);
            }
        });
    }

    const modelSelect = getElement("modelSelect");
    if (modelSelect) {
        modelSelect.addEventListener("change", event => {
            selectAnalysisMode(event.target.value);
        });
    }

    const noise = getElement("uploadNoise");
    const noiseValue = getElement("uploadNoiseValue");
    if (noise && noiseValue) {
        noise.addEventListener("input", () => {
            noiseValue.textContent = noise.value;
        });
    }

    const eve = getElement("uploadEve");
    const eveValue = getElement("uploadEveValue");
    if (eve && eveValue) {
        eve.addEventListener("input", () => {
            eveValue.textContent = eve.value;
        });
    }
}

function initializeScenarioButtons() {
    document.querySelectorAll(".scenario-button").forEach(button => {
        button.addEventListener("click", () => {
            runScenario(button.dataset.scenario);
        });
    });
}

window.runScenario = runScenario;

window.addEventListener("resize", () => {
    clearTimeout(window.qsafeResizeTimer);
    window.qsafeResizeTimer = setTimeout(() => {
        drawResearchCharts();
        const payload = state.currentResponse?.raw;
        if (payload?.source === "uploaded_dataset") renderDataset(payload);
    }, 120);
});

document.addEventListener("DOMContentLoaded", async () => {
    initializeTheme();
    initializeUpload();
    initializeScenarioButtons();

    const savedMode = localStorage.getItem("qsafe-analysis-mode") || "hybrid";
    selectAnalysisMode(savedMode);

    try {
        const health = await fetch(getApiBaseUrl() + API_CONFIG.HEALTH_ENDPOINT);
        const status = await health.json();
        document.body.classList.toggle("backend-online", status.status === "ok");
        document.body.classList.toggle("backend-offline", status.status !== "ok");
    } catch (error) {
        console.warn("Q-Safe backend health check failed:", error);
        document.body.classList.add("backend-offline");
    }

    runScenario("normal");
});
