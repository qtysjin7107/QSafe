/* =========================================================
   Q-SAFE FRONTEND CONTROLLER
   Restored visual system + model selection + proper data upload
   ========================================================= */

const API_CONFIG = {
    USE_MOCK_API: false,
    BASE_URL: "http://localhost:8000",
    SECURITY_ENDPOINT: "/api/demo",
    HEALTH_ENDPOINT: "/api/health",
    HEALTH_CHECK_INTERVAL: 15000,
    REQUEST_TIMEOUT: 60000,
    DEMO_REQUEST_TIMEOUT: 10000,
    UPLOAD_API_ENABLED: false,
    UPLOAD_API_ENDPOINT: "/api/model/evaluate"
};

const MODEL_CATALOG = {
    ml: {
        key: "ml",
        short: "ML MODEL",
        badge: "ML MODEL",
        name: "NSL-KDD Attack Classifier",
        type: "Classical ML · Binary Classification",
        description: "Classifies uploaded network records into normal/attack evidence and estimates threat probability."
    },
    qber: {
        key: "qber",
        short: "QBER MODEL",
        badge: "QBER MODEL",
        name: "BB84 QBER Detector",
        type: "Quantum Model · Error-Rate Threshold",
        description: "Uses BB84 quantum-channel error behavior to evaluate QBER and channel disturbance."
    },
    hybrid: {
        key: "hybrid",
        short: "HYBRID MODEL",
        badge: "HYBRID MODEL",
        name: "Q-Safe Hybrid Evidence Fusion",
        type: "Hybrid Model · ML + QBER + Channel Noise",
        description: "Combines classical threat evidence with quantum-channel evidence for the final Q-Safe policy decision."
    }
};

const SCENARIOS = {
    normal: {
        threat_probability: 0.08,
        qber: 0.008,
        channel_noise: 0.003,
        expected_qber: 0.003,
        eavesdropper_detected: false,
        quantum_attack_probability: 0.04,
        decision: "ACCEPT",
        reason: "Network and quantum-channel evidence indicate a normal secure channel.",
        qubits_sent: 1000,
        sifted_key_length: 493
    },
    noise: {
        threat_probability: 0.10,
        qber: 0.041,
        channel_noise: 0.035,
        expected_qber: 0.024,
        eavesdropper_detected: false,
        quantum_attack_probability: 0.34,
        decision: "MONITOR",
        reason: "Elevated QBER is consistent with channel noise, but the channel should be monitored.",
        qubits_sent: 1000,
        sifted_key_length: 491
    },
    network: {
        threat_probability: 0.91,
        qber: 0.012,
        channel_noise: 0.004,
        expected_qber: 0.004,
        eavesdropper_detected: false,
        quantum_attack_probability: 0.09,
        decision: "MONITOR",
        reason: "High network threat detected, but the quantum channel currently appears stable.",
        qubits_sent: 1000,
        sifted_key_length: 496
    },
    eve: {
        threat_probability: 0.12,
        qber: 0.063,
        channel_noise: 0.008,
        expected_qber: 0.006,
        eavesdropper_detected: true,
        quantum_attack_probability: 0.86,
        decision: "MONITOR",
        reason: "Quantum-channel errors are elevated, but classical network evidence is weak.",
        qubits_sent: 1000,
        sifted_key_length: 487
    },
    combined: {
        threat_probability: 0.93,
        qber: 0.067,
        channel_noise: 0.018,
        expected_qber: 0.008,
        eavesdropper_detected: true,
        quantum_attack_probability: 0.95,
        decision: "REJECT",
        reason: "High network threat combined with elevated quantum-channel error indicates a likely compromise.",
        qubits_sent: 1000,
        sifted_key_length: 486
    }
};

const RESEARCH_DATA = {
    qberNoise: [
        { x: 0, y: 0.8 }, { x: 1, y: 1.4 }, { x: 2, y: 2.3 }, { x: 3, y: 3.2 },
        { x: 4, y: 4.1 }, { x: 5, y: 5.3 }, { x: 6, y: 6.1 }, { x: 7, y: 7.0 },
        { x: 8, y: 8.2 }, { x: 10, y: 10.1 }
    ],
    qberEve: [
        { x: 0, y: 0.8 }, { x: 10, y: 2.1 }, { x: 20, y: 4.3 }, { x: 30, y: 6.4 },
        { x: 40, y: 8.1 }, { x: 50, y: 10.2 }, { x: 60, y: 12.4 }, { x: 70, y: 14.8 },
        { x: 80, y: 17.0 }, { x: 90, y: 19.2 }, { x: 100, y: 21.0 }
    ]
};

const scenarioHistory = [
    { name: "Normal", threat: 8, qber: 0.8, decision: "ACCEPT" },
    { name: "Noise", threat: 10, qber: 4.1, decision: "MONITOR" },
    { name: "Network Attack", threat: 91, qber: 1.2, decision: "MONITOR" },
    { name: "Eavesdropper", threat: 12, qber: 6.3, decision: "MONITOR" },
    { name: "Combined Attack", threat: 93, qber: 6.7, decision: "REJECT" }
];

const NORMALS = new Set(["normal", "normal.0", "normal traffic", "benign", "0", "false", "no", "secure"]);
const NSL_KDD_HEADERS = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes", "land", "wrong_fragment", "urgent",
    "hot", "num_failed_logins", "logged_in", "num_compromised", "root_shell", "su_attempted", "num_root",
    "num_file_creations", "num_shells", "num_access_files", "num_outbound_cmds", "is_host_login", "is_guest_login",
    "count", "srv_count", "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate", "same_srv_rate",
    "diff_srv_rate", "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count", "dst_host_same_srv_rate",
    "dst_host_diff_srv_rate", "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate", "dst_host_serror_rate",
    "dst_host_srv_serror_rate", "dst_host_rerror_rate", "dst_host_srv_rerror_rate", "label", "difficulty"
];

let selectedModel = "hybrid";
let uploadedDataset = null;
let currentDatasetResult = null;
let currentScenario = "normal";
let lastData = normalizeScenario(SCENARIOS.normal);
let backendHealthTimer = null;

const $ = (id) => document.getElementById(id);

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function safeNumber(value, fallback = null) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function percent(value, decimals = 1) {
    const n = safeNumber(value, 0);
    return `${(n * 100).toFixed(decimals)}%`;
}

function nowTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function mean(values) {
    const valid = values.filter(Number.isFinite);
    if (!valid.length) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function median(values) {
    const valid = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!valid.length) return null;
    const mid = Math.floor(valid.length / 2);
    return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

function normalizeHeader(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s\-\/]+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
}

function normalizeScenario(raw) {
    return {
        threat_probability: clamp(safeNumber(raw?.threat_probability, 0), 0, 1),
        qber: clamp(safeNumber(raw?.qber, 0), 0, 1),
        channel_noise: clamp(safeNumber(raw?.channel_noise, 0), 0, 1),
        expected_qber: clamp(safeNumber(raw?.expected_qber, 0), 0, 1),
        eavesdropper_detected: Boolean(raw?.eavesdropper_detected),
        quantum_attack_probability: clamp(safeNumber(raw?.quantum_attack_probability, 0), 0, 1),
        decision: String(raw?.decision || "MONITOR").toUpperCase(),
        reason: raw?.reason || "Security evaluation completed.",
        qkd: {
            protocol: "BB84",
            qubits_sent: Math.max(0, Math.round(safeNumber(raw?.qubits_sent, raw?.qkd?.qubits_sent || 0))),
            sifted_key_length: Math.max(0, Math.round(safeNumber(raw?.sifted_key_length, raw?.qkd?.sifted_key_length || 0)))
        },
        metadata: raw?.metadata || {}
    };
}

function getRiskScore(data) {
    const score =
        data.threat_probability * 55 +
        data.qber * 100 * 0.30 +
        data.channel_noise * 100 * 0.15 +
        (data.eavesdropper_detected ? 10 : 0);
    return Math.round(clamp(score, 0, 100));
}

function decisionFromScore(score) {
    if (score < 30) return "ACCEPT";
    if (score < 65) return "MONITOR";
    return "REJECT";
}

function modelDecisionFromML(threatProbability) {
    if (threatProbability < 0.30) return "ACCEPT";
    if (threatProbability < 0.70) return "MONITOR";
    return "REJECT";
}

function modelDecisionFromQber(qber) {
    if (qber < 0.03) return "ACCEPT";
    if (qber < 0.05) return "MONITOR";
    return "REJECT";
}

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

function setClass(id, classNames, active = true) {
    const el = $(id);
    if (!el) return;
    String(classNames).split(/\s+/).filter(Boolean).forEach(cls => el.classList.toggle(cls, active));
}

/* =========================================================
   BACKEND
   ========================================================= */

function setBackendStatus(state) {
    const status = $("backendStatus");
    if (!status) return;

    status.classList.remove("backend-checking", "backend-online", "backend-offline");
    status.classList.add(`backend-${state}`);

    const text = {
        checking: " BACKEND CHECKING",
        online: " BACKEND ONLINE",
        offline: " BACKEND OFFLINE"
    }[state] || " BACKEND CHECKING";

    status.lastChild.textContent = text;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = API_CONFIG.REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function checkBackendHealth() {
    if (API_CONFIG.USE_MOCK_API) {
        setBackendStatus("online");
        return true;
    }

    setBackendStatus("checking");
    try {
        const response = await fetchWithTimeout(
            `${API_CONFIG.BASE_URL}${API_CONFIG.HEALTH_ENDPOINT}`,
            { method: "GET", cache: "no-store" },
            5000
        );
        if (!response.ok) throw new Error(`Health endpoint returned ${response.status}`);
        setBackendStatus("online");
        return true;
    } catch (error) {
        console.warn("Q-Safe backend health check failed:", error);
        setBackendStatus("offline");
        return false;
    }
}

function startBackendHealthMonitoring() {
    checkBackendHealth();
    clearInterval(backendHealthTimer);
    backendHealthTimer = setInterval(checkBackendHealth, API_CONFIG.HEALTH_CHECK_INTERVAL);
}

async function fetchDemoScenario(scenarioName) {
    const scenario = SCENARIOS[scenarioName] || SCENARIOS.normal;
    if (API_CONFIG.USE_MOCK_API) return normalizeScenario({ ...scenario, metadata: { source: "mock" } });

    const modeMap = {
        normal: "NORMAL",
        noise: "NOISY_CHANNEL",
        network: "NETWORK_ATTACK",
        eve: "EAVESDROPPER",
        combined: "COMBINED_ATTACK"
    };

    const bits = Number($("nBitsControl")?.value || 100);
    const trials = Number($("trialsControl")?.value || 10);

    try {
        const response = await fetchWithTimeout(
            `${API_CONFIG.BASE_URL}${API_CONFIG.SECURITY_ENDPOINT}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: modeMap[scenarioName] || "NORMAL", n_bits: bits, trials })
            },
            API_CONFIG.DEMO_REQUEST_TIMEOUT
        );

        if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}`);
        const payload = await response.json();
        const result = payload?.result;
        if (!result) throw new Error("Backend response missing result.");

        const threat = result.threat || {};
        const quantum = result.quantum || {};
        const decision = result.decision || {};

        setBackendStatus("online");
        return normalizeScenario({
            threat_probability: threat.threat_probability ?? 0,
            qber: quantum.qber ?? 0,
            channel_noise: quantum.noise_rate ?? 0,
            expected_qber: quantum.expected_qber ?? 0,
            quantum_attack_probability: quantum.quantum_attack_probability ?? 0,
            eavesdropper_detected: (quantum.quantum_attack_probability ?? 0) >= 0.80,
            decision: decision.decision || "MONITOR",
            reason: decision.reason || "Security evaluation completed.",
            qubits_sent: (quantum.trials || trials) * (quantum.bits_per_trial || bits),
            sifted_key_length: Math.round(quantum.mean_sifted_key_length || 0),
            metadata: {
                source: "q-safe-fastapi",
                scenario: scenarioName,
                n_bits: bits,
                trials,
                likelihood_ratio: quantum.likelihood_ratio ?? 0
            }
        });
    } catch (error) {
        console.warn("Falling back to controlled scenario data:", error);
        setBackendStatus("offline");
        return normalizeScenario({
            ...scenario,
            metadata: { source: "controlled-fallback", reason: error.message }
        });
    }
}

async function evaluateUploadWithBackend(file, modelKey) {
    if (!API_CONFIG.UPLOAD_API_ENABLED) return null;

    const form = new FormData();
    form.append("file", file);
    form.append("model", modelKey);

    const response = await fetchWithTimeout(
        `${API_CONFIG.BASE_URL}${API_CONFIG.UPLOAD_API_ENDPOINT}`,
        { method: "POST", body: form },
        API_CONFIG.REQUEST_TIMEOUT
    );

    if (!response.ok) {
        throw new Error(`Upload analysis API returned HTTP ${response.status}`);
    }

    return response.json();
}

/* =========================================================
   THEME
   ========================================================= */

function applyTheme(themeName) {
    const validThemes = [
        "quantum-core", "cyber-neon", "clinical-secure", "threat-command",
        "neo-brutalism", "midnight-violet", "arctic-lab", "carbon-matrix", "dragon"
    ];
    const theme = validThemes.includes(themeName) ? themeName : "quantum-core";
    document.body.dataset.theme = theme;
    localStorage.setItem("qsafe-theme", theme);
    const themeSelect = $("themeSelect");
    if (themeSelect) themeSelect.value = theme;
    window.updateDragonTheme?.(theme);
    updateModelView();
    drawAllCharts();
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("qsafe-theme") || "quantum-core";
    applyTheme(savedTheme);
    $("themeSelect")?.addEventListener("change", e => applyTheme(e.target.value));
}

/* =========================================================
   MODEL SELECTION
   ========================================================= */

function updateModelMetadata() {
    const model = MODEL_CATALOG[selectedModel];
    setText("selectedModelName", model.name);
    setText("selectedModelType", model.type);
    setText("activeModelBadge", model.badge);
    setText("modelOutputSource", uploadedDataset ? "UPLOADED DATA" : "CONTROLLED DEMO");
}

function initializeModelSelector() {
    const select = $("modelSelect");
    if (!select) return;
    selectedModel = localStorage.getItem("qsafe-model") || "hybrid";
    if (!MODEL_CATALOG[selectedModel]) selectedModel = "hybrid";
    select.value = selectedModel;
    select.addEventListener("change", async e => {
        selectedModel = MODEL_CATALOG[e.target.value] ? e.target.value : "hybrid";
        localStorage.setItem("qsafe-model", selectedModel);
        updateModelMetadata();
        await refreshForSelectedModel();
    });
    updateModelMetadata();
}

function setPanelActive(modelKey, active) {
    const panel = document.querySelector(`[data-result-model="${modelKey}"]`);
    if (!panel) return;
    panel.classList.toggle("is-active", active);
    panel.classList.toggle("is-inactive", !active);
}

function updateModelResultPanels(result) {
    const ml = result.ml;
    const qber = result.qber;
    const hybrid = result.hybrid;

    setPanelActive("ml", selectedModel === "ml" || selectedModel === "hybrid");
    setPanelActive("qber", selectedModel === "qber" || selectedModel === "hybrid");
    setPanelActive("hybrid", selectedModel === "hybrid");

    setText("mlResultName", MODEL_CATALOG.ml.name);
    setText("mlResultType", MODEL_CATALOG.ml.type);
    setText("qberResultName", MODEL_CATALOG.qber.name);
    setText("qberResultType", MODEL_CATALOG.qber.type);
    setText("hybridResultName", MODEL_CATALOG.hybrid.name);
    setText("hybridResultType", MODEL_CATALOG.hybrid.type);

    if (ml?.available) {
        setText("mlResultValue", percent(ml.threat_probability));
        setText("mlResultLabel", "THREAT PROBABILITY");
        setText("mlResultDetail", ml.detail || "ML analysis completed.");
    } else {
        setText("mlResultValue", "NOT AVAILABLE");
        setText("mlResultLabel", "ML RESULT");
        setText("mlResultDetail", ml?.detail || "An attack/normal target column was not detected.");
    }

    if (qber?.available) {
        setText("qberResultValue", percent(qber.qber));
        setText("qberResultLabel", "QUANTUM BIT ERROR RATE");
        setText("qberResultDetail", qber.detail || "QBER analysis completed.");
    } else {
        setText("qberResultValue", "NOT AVAILABLE");
        setText("qberResultLabel", "QBER RESULT");
        setText("qberResultDetail", qber?.detail || "QBER data is not available.");
    }

    if (hybrid?.available) {
        setText("hybridResultValue", hybrid.decision || "MONITOR");
        setText("hybridResultLabel", `RISK SCORE ${Math.round(hybrid.risk_score ?? 0)}/100`);
        setText("hybridResultDetail", hybrid.detail || hybrid.reason || "Hybrid evidence fusion completed.");
    } else {
        setText("hybridResultValue", "NOT AVAILABLE");
        setText("hybridResultLabel", "HYBRID RESULT");
        setText("hybridResultDetail", hybrid?.detail || "Both ML and QBER evidence are required for hybrid evaluation.");
    }
}

function updateModelView() {
    document.querySelector(".dashboard")?.classList.remove("model-mode-ml", "model-mode-qber", "model-mode-hybrid");
    document.querySelector(".dashboard")?.classList.add(`model-mode-${selectedModel}`);

    const metadata = MODEL_CATALOG[selectedModel];
    setText("activeModelBadge", metadata.badge);
    setText("selectedModelName", metadata.name);
    setText("selectedModelType", metadata.type);
}

/* =========================================================
   CSV/TXT PARSING
   ========================================================= */

function splitDelimitedLine(line, delimiter) {
    if (delimiter === "whitespace") return line.trim().split(/\s+/);

    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            i += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            cells.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    cells.push(current.trim());
    return cells;
}

function detectDelimiter(line) {
    const counts = [
        [",", (line.match(/,/g) || []).length],
        ["\t", (line.match(/\t/g) || []).length],
        [";", (line.match(/;/g) || []).length]
    ].sort((a, b) => b[1] - a[1]);
    return counts[0][1] > 0 ? counts[0][0] : "whitespace";
}

function looksLikeHeader(row) {
    if (!row?.length) return false;
    const normalized = row.map(normalizeHeader);
    const known = [
        "label", "class", "target", "attack", "threat", "qber", "noise", "noise_rate",
        "eavesdropper", "eavesdropping", "anomaly", "risk", "difficulty", "protocol_type", "service"
    ];
    const knownHits = normalized.filter(x => known.includes(x)).length;
    const numericCount = row.filter(v => v !== "" && Number.isFinite(Number(v))).length;
    return knownHits > 0 || numericCount < row.length * 0.45;
}

function parseDataset(text, fileName) {
    const cleanText = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
    const lines = cleanText.split("\n").map(line => line.trimEnd()).filter(line => line.trim().length > 0);
    if (!lines.length) throw new Error("The uploaded file is empty.");

    const delimiter = detectDelimiter(lines[0]);
    const firstRow = splitDelimitedLine(lines[0], delimiter);
    const firstRowIsHeader = looksLikeHeader(firstRow);
    const looksLikeNSLKDD = !firstRowIsHeader && firstRow.length === NSL_KDD_HEADERS.length;

    let headers;
    let rawRows;

    if (firstRowIsHeader) {
        headers = firstRow.map((h, i) => normalizeHeader(h) || `column_${i + 1}`);
        rawRows = lines.slice(1).map(line => splitDelimitedLine(line, delimiter));
    } else if (looksLikeNSLKDD) {
        // NSL-KDD KDDTrain+.txt / KDDTest+.txt files commonly arrive without a header.
        // Preserve the first data record and attach the canonical NSL-KDD schema.
        headers = NSL_KDD_HEADERS.slice();
        rawRows = lines.map(line => splitDelimitedLine(line, delimiter));
    } else {
        headers = firstRow.map((_, i) => `column_${i + 1}`);
        rawRows = lines.map(line => splitDelimitedLine(line, delimiter));
    }

    const rows = rawRows
        .filter(row => row.some(cell => String(cell).trim() !== ""))
        .map(row => {
            const normalized = [];
            for (let i = 0; i < headers.length; i += 1) normalized.push(row[i] ?? "");
            return normalized;
        });

    if (!rows.length) throw new Error("No data rows were found in the uploaded file.");

    return {
        fileName,
        delimiter,
        headers,
        rows,
        fileFormat: fileName.toLowerCase().endsWith(".txt") ? "TXT" : "CSV"
    };
}

function columnIndex(dataset, aliases) {
    const normalized = dataset.headers.map(normalizeHeader);
    for (const alias of aliases) {
        const target = normalizeHeader(alias);
        const exact = normalized.indexOf(target);
        if (exact >= 0) return exact;
    }
    for (const alias of aliases) {
        const target = normalizeHeader(alias);
        const fuzzy = normalized.findIndex(value => value.includes(target));
        if (fuzzy >= 0) return fuzzy;
    }
    return -1;
}

function numericColumn(dataset, index) {
    if (index < 0) return [];
    return dataset.rows
        .map(row => Number(String(row[index] ?? "").replace(/[%]/g, "")))
        .map(value => value > 1 ? value / 100 : value)
        .filter(Number.isFinite);
}

function booleanish(value) {
    const v = String(value ?? "").trim().toLowerCase();
    if (!v) return null;
    if (["1", "true", "yes", "y", "detected", "attack", "attacker"].includes(v)) return true;
    if (["0", "false", "no", "n", "secure", "normal", "benign", "not_detected"].includes(v)) return false;
    return null;
}

function analyzeMLDataset(dataset) {
    const labelIndex = columnIndex(dataset, [
        "label", "class", "target", "attack", "threat", "outcome", "category"
    ]);

    if (labelIndex < 0) {
        return {
            available: false,
            detail: "No normal/attack target column was found in this dataset. NSL-KDD label detection requires a label/class/target column."
        };
    }

    const labels = dataset.rows.map(row => String(row[labelIndex] ?? "").trim().toLowerCase()).filter(Boolean);
    if (!labels.length) {
        return { available: false, detail: "The detected target column contains no usable labels." };
    }

    const attackCount = labels.filter(value => !NORMALS.has(value)).length;
    const threatProbability = clamp(attackCount / labels.length, 0, 1);
    const decision = modelDecisionFromML(threatProbability);
    const confidence = Math.max(threatProbability, 1 - threatProbability);

    return {
        available: true,
        threat_probability: threatProbability,
        prediction: threatProbability >= 0.5 ? "ATTACK" : "NORMAL",
        confidence,
        decision,
        detail: `${attackCount.toLocaleString()} of ${labels.length.toLocaleString()} records are classified as attack/non-normal evidence (${percent(threatProbability)}).`
    };
}

function readUploadedQber(dataset) {
    const qberIndex = columnIndex(dataset, [
        "qber", "quantum_bit_error_rate", "error_rate", "bit_error_rate"
    ]);
    const noiseIndex = columnIndex(dataset, [
        "noise", "noise_rate", "channel_noise", "channel_noise_rate"
    ]);
    const eveIndex = columnIndex(dataset, [
        "eavesdropper", "eavesdropping", "eve", "intercept", "interception", "eavesdropper_detected"
    ]);

    const qberValues = numericColumn(dataset, qberIndex);
    const noiseValues = numericColumn(dataset, noiseIndex);

    let eveDetected = false;
    if (eveIndex >= 0) {
        const bools = dataset.rows.map(row => booleanish(row[eveIndex])).filter(value => value !== null);
        eveDetected = bools.some(Boolean);
    }

    if (!qberValues.length && !noiseValues.length && eveIndex < 0) {
        return {
            available: false,
            needsQiskit: true,
            detail: "No QBER/noise/eavesdropper fields were found; the QBER model should use its Qiskit BB84 experiment output."
        };
    }

    const qber = clamp(mean(qberValues) ?? 0, 0, 1);
    const noise = clamp(mean(noiseValues) ?? 0, 0, 1);
    const decision = modelDecisionFromQber(qber);

    return {
        available: true,
        qber,
        channel_noise: noise,
        expected_qber: noise * 0.8,
        eavesdropper_detected: eveDetected || qber >= 0.08,
        quantum_attack_probability: clamp(qber * 5 + noise * 2, 0, 1),
        decision,
        detail: `QBER mean ${percent(qber)} from ${qberValues.length.toLocaleString()} quantum-error records${noiseValues.length ? `; mean channel noise ${percent(noise)}.` : "."}`
    };
}

function buildPreview(dataset) {
    const table = $("previewTableWrap");
    if (!table) return;
    const previewRows = dataset.rows.slice(0, 8);
    const maxColumns = Math.min(dataset.headers.length, 18);

    let html = "<table class=\"preview-table\"><thead><tr>";
    dataset.headers.slice(0, maxColumns).forEach(header => {
        html += `<th>${escapeHtml(header)}</th>`;
    });
    html += "</tr></thead><tbody>";

    previewRows.forEach(row => {
        html += "<tr>";
        for (let i = 0; i < maxColumns; i += 1) html += `<td>${escapeHtml(row[i] ?? "")}</td>`;
        html += "</tr>";
    });

    html += "</tbody></table>";
    table.innerHTML = html;
    setText("datasetPreviewMeta", `Showing ${previewRows.length} of ${dataset.rows.length.toLocaleString()} rows · ${maxColumns} of ${dataset.headers.length} columns`);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateDatasetSummary(fileName, dataset) {
    setText("datasetFile", fileName || "No file loaded");
    setText("datasetRows", dataset ? dataset.rows.length.toLocaleString() : "—");
    setText("datasetColumns", dataset ? dataset.headers.length.toLocaleString() : "—");
}

/* =========================================================
   LOCAL MODEL EXECUTION
   ========================================================= */

async function buildUploadedResult(file, dataset) {
    const ml = analyzeMLDataset(dataset);
    let qber = readUploadedQber(dataset);

    if (qber.needsQiskit) {
        const qiskit = await fetchDemoScenario(currentScenario);
        qber = {
            available: true,
            qber: qiskit.qber,
            channel_noise: qiskit.channel_noise,
            expected_qber: qiskit.expected_qber,
            eavesdropper_detected: qiskit.eavesdropper_detected,
            quantum_attack_probability: qiskit.quantum_attack_probability,
            decision: modelDecisionFromQber(qiskit.qber),
            qubits_sent: qiskit.qkd.qubits_sent,
            sifted_key_length: qiskit.qkd.sifted_key_length,
            source: qiskit.metadata?.source || "qiskit-fallback",
            detail: `Qiskit BB84 output used because the uploaded dataset has no QBER column: QBER ${percent(qiskit.qber)}. ` +
                    (qiskit.metadata?.source === "q-safe-fastapi" ? "Live backend experiment." : "Controlled fallback experiment.")
        };
    }

    let hybrid = { available: false };
    if (ml.available && qber.available) {
        const fusedData = normalizeScenario({
            threat_probability: ml.threat_probability,
            qber: qber.qber,
            channel_noise: qber.channel_noise,
            expected_qber: qber.expected_qber,
            eavesdropper_detected: qber.eavesdropper_detected,
            quantum_attack_probability: qber.quantum_attack_probability
        });
        const riskScore = getRiskScore(fusedData);
        hybrid = {
            available: true,
            risk_score: riskScore,
            decision: decisionFromScore(riskScore),
            reason: `Hybrid evidence fusion used uploaded ML threat probability (${percent(ml.threat_probability)}) and Qiskit/QBER evidence (${percent(qber.qber)} QBER, ${percent(qber.channel_noise)} noise).`,
            detail: `Fused risk score ${riskScore}/100 from classical + quantum evidence.`
        };
    } else {
        hybrid.detail = "Hybrid mode needs both a usable normal/attack target and quantum evidence.";
    }

    return {
        ml,
        qber,
        hybrid,
        dataset: {
            file: file.name,
            rows: dataset.rows.length,
            columns: dataset.headers.length,
            format: dataset.fileFormat,
            delimiter: dataset.delimiter
        }
    };
}

function resultToDashboardData(result) {
    const source = uploadedDataset ? "uploaded-data" : "controlled-demo";

    if (selectedModel === "ml") {
        const ml = result.ml;
        return normalizeScenario({
            threat_probability: ml?.threat_probability ?? 0,
            qber: 0,
            channel_noise: 0,
            expected_qber: 0,
            eavesdropper_detected: false,
            quantum_attack_probability: 0,
            decision: ml?.decision || "MONITOR",
            reason: ml?.detail || "ML model completed.",
            qubits_sent: 0,
            sifted_key_length: 0,
            metadata: { source, model: "ml" }
        });
    }

    if (selectedModel === "qber") {
        const qber = result.qber;
        return normalizeScenario({
            threat_probability: 0,
            qber: qber?.qber ?? 0,
            channel_noise: qber?.channel_noise ?? 0,
            expected_qber: qber?.expected_qber ?? 0,
            eavesdropper_detected: qber?.eavesdropper_detected ?? false,
            quantum_attack_probability: qber?.quantum_attack_probability ?? 0,
            decision: qber?.decision || modelDecisionFromQber(qber?.qber ?? 0),
            reason: qber?.detail || "QBER model completed.",
            qubits_sent: qber?.qubits_sent ?? 1000,
            sifted_key_length: qber?.sifted_key_length ?? 493,
            metadata: { source, model: "qber", qber_source: qber?.source || "uploaded-data" }
        });
    }

    const hybrid = result.hybrid;
    const ml = result.ml;
    const qber = result.qber;
    return normalizeScenario({
        threat_probability: ml?.threat_probability ?? 0,
        qber: qber?.qber ?? 0,
        channel_noise: qber?.channel_noise ?? 0,
        expected_qber: qber?.expected_qber ?? 0,
        eavesdropper_detected: qber?.eavesdropper_detected ?? false,
        quantum_attack_probability: qber?.quantum_attack_probability ?? 0,
        decision: hybrid?.decision || "MONITOR",
        reason: hybrid?.reason || "Hybrid evidence fusion completed.",
        qubits_sent: qber?.qubits_sent ?? 1000,
        sifted_key_length: qber?.sifted_key_length ?? 493,
        metadata: { source, model: "hybrid" }
    });
}

async function analyzeUploadedFile(file) {
    if (!file) return;
    setText("datasetStatus", "READING");
    setText("datasetMessage", "Reading the dataset and preparing the selected model.");
    $("datasetMessage")?.classList.remove("is-success", "is-error");

    try {
        const text = await file.text();
        const dataset = parseDataset(text, file.name);
        uploadedDataset = dataset;
        updateDatasetSummary(file.name, dataset);
        buildPreview(dataset);
        $("clearDataButton") && ($("clearDataButton").disabled = false);
        $("datasetDropzone")?.classList.remove("is-dragging");

        let backendResult = null;
        if (API_CONFIG.UPLOAD_API_ENABLED) {
            backendResult = await evaluateUploadWithBackend(file, selectedModel);
        }

        if (backendResult?.results) {
            currentDatasetResult = backendResult.results;
        } else {
            currentDatasetResult = await buildUploadedResult(file, dataset);
        }

        setText("datasetStatus", "ANALYZED");
        const msg = backendResult?.message || `Dataset loaded successfully. ${dataset.rows.length.toLocaleString()} rows and ${dataset.headers.length.toLocaleString()} columns are available to the selected model.`;
        setText("datasetMessage", msg);
        $("datasetMessage")?.classList.add("is-success");
        setText("uploadHeadline", file.name);
        setText("uploadSubline", `${dataset.fileFormat} · ${dataset.rows.length.toLocaleString()} rows · ${dataset.headers.length.toLocaleString()} columns`);

        await refreshForSelectedModel();
    } catch (error) {
        console.error("Q-Safe dataset upload failed:", error);
        uploadedDataset = null;
        currentDatasetResult = null;
        updateDatasetSummary("No file loaded", null);
        setText("datasetStatus", "ERROR");
        setText("datasetMessage", error.message || "Could not read the uploaded dataset.");
        $("datasetMessage")?.classList.add("is-error");
        $("clearDataButton") && ($("clearDataButton").disabled = true);
    }
}

function clearUploadedDataset() {
    uploadedDataset = null;
    currentDatasetResult = null;
    updateDatasetSummary("No file loaded", null);
    setText("datasetStatus", "READY");
    setText("datasetMessage", "No uploaded dataset. The dashboard is showing the controlled Q-Safe demonstration data.");
    $("datasetMessage")?.classList.remove("is-success", "is-error");
    setText("uploadHeadline", "UPLOAD DATASET");
    setText("uploadSubline", "NSL-KDD CSV/TXT or experiment CSV/TXT");
    $("clearDataButton") && ($("clearDataButton").disabled = true);
    const table = $("previewTableWrap");
    if (table) table.innerHTML = '<div class="preview-empty">No dataset loaded.</div>';
    setText("datasetPreviewMeta", "Upload a dataset to inspect its first rows.");
    document.querySelectorAll(".scenario-button").forEach(button => button.disabled = false);
    updateModelMetadata();
    refreshForSelectedModel();
}

function initializeDataUpload() {
    const input = $("dataFileInput");
    const choose = $("chooseDataButton");
    const clear = $("clearDataButton");
    const zone = $("datasetDropzone");
    if (!input || !choose || !clear || !zone) return;

    choose.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (file) analyzeUploadedFile(file);
    });
    clear.addEventListener("click", clearUploadedDataset);

    ["dragenter", "dragover"].forEach(type => zone.addEventListener(type, event => {
        event.preventDefault();
        zone.classList.add("is-dragging");
    }));
    ["dragleave", "drop"].forEach(type => zone.addEventListener(type, event => {
        event.preventDefault();
        zone.classList.remove("is-dragging");
    }));
    zone.addEventListener("drop", event => {
        const file = event.dataTransfer?.files?.[0];
        if (file) {
            analyzeUploadedFile(file);
        }
    });
    zone.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            input.click();
        }
    });
}

/* =========================================================
   DASHBOARD RENDERING
   ========================================================= */

function updateSecurityPulse(decision) {
    const pulse = $("securityPulse");
    if (!pulse) return;
    pulse.classList.remove("pulse-stable", "pulse-elevated", "pulse-critical", "pulse-analyzing");

    if (decision === "ACCEPT") {
        pulse.classList.add("pulse-stable");
        setText("pulseTitle", "SECURITY STABLE");
        setText("pulseDescription", "The active model is within secure limits.");
    } else if (decision === "MONITOR") {
        pulse.classList.add("pulse-elevated");
        setText("pulseTitle", "SECURITY ELEVATED");
        setText("pulseDescription", "The selected model reports evidence that requires monitoring.");
    } else if (decision === "REJECT") {
        pulse.classList.add("pulse-critical");
        setText("pulseTitle", "SECURITY CRITICAL");
        setText("pulseDescription", "The selected model reports a high-risk condition.");
    } else {
        pulse.classList.add("pulse-analyzing");
        setText("pulseTitle", "SECURITY ANALYZING");
        setText("pulseDescription", "Evaluating model evidence.");
    }
}

function updateRiskGauge(data) {
    const score = selectedModel === "hybrid" && currentDatasetResult?.hybrid?.available
        ? currentDatasetResult.hybrid.risk_score
        : selectedModel === "ml"
            ? data.threat_probability * 100
            : selectedModel === "qber"
                ? data.qber * 100
                : getRiskScore(data);

    const safeScore = Math.round(clamp(score ?? 0, 0, 100));
    setText("riskScore", String(safeScore));
    const fill = $("riskGaugeFill");
    const marker = $("riskGaugeMarker");
    if (fill) fill.style.width = `${safeScore}%`;
    if (marker) marker.style.left = `${safeScore}%`;

    const label = $("riskGaugeLabel");
    if (!label) return;
    if (safeScore < 30) {
        label.textContent = "LOW RISK";
        label.style.color = "var(--success)";
    } else if (safeScore < 65) {
        label.textContent = "ELEVATED RISK";
        label.style.color = "var(--warning)";
    } else {
        label.textContent = "HIGH / CRITICAL RISK";
        label.style.color = "var(--danger)";
    }
}

function updateDecisionState(data) {
    const decision = data.decision;
    const state = $("decisionState");
    if (state) {
        state.classList.remove("decision-accept", "decision-monitor", "decision-reject");
        state.classList.add(`decision-${decision.toLowerCase()}`);
    }
    setText("decisionValue", decision);
    setText("decisionReason", data.reason);
    updateSecurityPulse(decision);
}

function updateEvidence(data) {
    const activeML = selectedModel === "ml" || selectedModel === "hybrid";
    const activeQBER = selectedModel === "qber" || selectedModel === "hybrid";

    setText("decisionThreat", activeML ? percent(data.threat_probability) : "NOT IN USE");
    setText("decisionQber", activeQBER ? percent(data.qber) : "NOT IN USE");
    setText("decisionNoise", activeQBER ? percent(data.channel_noise) : "NOT IN USE");
    setText("decisionEve", activeQBER ? (data.eavesdropper_detected ? "YES" : "NO") : "NOT IN USE");

    setText("fusionThreat", activeML ? percent(data.threat_probability) : "NOT IN USE");
    setText("fusionQber", activeQBER ? percent(data.qber) : "NOT IN USE");
    setText("fusionNoise", activeQBER ? percent(data.channel_noise) : "NOT IN USE");
    setText("fusionDecision", selectedModel === "hybrid" ? data.decision : `${selectedModel.toUpperCase()}-ONLY`);
    setText("fusionDecisionReason", data.reason);
}

function updateMetrics(data) {
    const activeML = selectedModel === "ml" || selectedModel === "hybrid";
    const activeQBER = selectedModel === "qber" || selectedModel === "hybrid";

    const threatCard = $("threatMetricCard");
    const qberCard = $("qberMetricCard");
    const noiseCard = $("noiseMetricCard");
    const eveCard = $("eveMetricCard");

    [threatCard, qberCard, noiseCard, eveCard].forEach(el => el?.classList.remove("is-not-in-use"));
    if (!activeML) threatCard?.classList.add("is-not-in-use");
    if (!activeQBER) {
        qberCard?.classList.add("is-not-in-use");
        noiseCard?.classList.add("is-not-in-use");
        eveCard?.classList.add("is-not-in-use");
    }

    setText("threatProbability", activeML ? percent(data.threat_probability) : "NOT IN USE");
    setText("qberValue", activeQBER ? percent(data.qber) : "NOT IN USE");
    setText("noiseValue", activeQBER ? percent(data.channel_noise) : "NOT IN USE");
    setText("eveValue", activeQBER ? (data.eavesdropper_detected ? "DETECTED" : "NOT DETECTED") : "NOT IN USE");

    const threatBar = $("threatBar");
    const qberBar = $("qberBar");
    const noiseBar = $("noiseBar");
    if (threatBar) threatBar.style.width = `${activeML ? data.threat_probability * 100 : 0}%`;
    if (qberBar) qberBar.style.width = `${activeQBER ? clamp(data.qber * 100, 0, 100) : 0}%`;
    if (noiseBar) noiseBar.style.width = `${activeQBER ? clamp(data.channel_noise * 100, 0, 100) : 0}%`;

    const eveState = $("eveState");
    if (eveState) {
        eveState.className = `metric-state ${!activeQBER ? "state-off" : data.eavesdropper_detected ? "state-danger" : "state-safe"}`;
        eveState.textContent = !activeQBER ? "NOT IN USE" : data.eavesdropper_detected ? "THREAT" : "SECURE";
    }
}

function updateQuantumMetrics(data) {
    const active = selectedModel === "qber" || selectedModel === "hybrid";
    const value = active ? Number(data.qkd.qubits_sent).toLocaleString() : "NOT IN USE";
    const sifted = active ? `${Number(data.qkd.sifted_key_length).toLocaleString()} bits` : "NOT IN USE";
    setText("qubitsSent", value);
    setText("siftedKey", sifted);
    setText("quantumQber", active ? percent(data.qber) : "NOT IN USE");
    setText("expectedQber", active ? percent(data.expected_qber) : "NOT IN USE");
}

function updateNetworkVisualization(data) {
    const connection = $("mainConnection");
    if (!connection) return;

    const state = data.decision === "REJECT" ? "reject" : data.decision === "MONITOR" ? "monitor" : "secure";
    connection.dataset.state = state;
    setText("networkChannelStatus", selectedModel === "ml" ? "ML-ONLY" : state.toUpperCase());

    const threatLayer = $("networkThreatLayer");
    threatLayer?.classList.toggle("active", selectedModel !== "qber" && data.threat_probability >= 0.70);
}

function updateAttackSurface(data) {
    const networkVector = $("networkVector");
    const quantumVector = $("quantumVector");
    const status = $("attackSurfaceStatus");
    if (!networkVector || !quantumVector || !status) return;

    const networkThreat = (selectedModel === "ml" || selectedModel === "hybrid") && data.threat_probability >= 0.70;
    const quantumThreat = (selectedModel === "qber" || selectedModel === "hybrid") && (data.qber >= 0.05 || data.eavesdropper_detected);

    networkVector.classList.toggle("active", networkThreat);
    quantumVector.classList.toggle("active", quantumThreat);

    status.textContent = networkThreat && quantumThreat
        ? "MULTI-LAYER THREAT"
        : networkThreat
            ? "NETWORK THREAT"
            : quantumThreat
                ? "QUANTUM THREAT"
                : "BASELINE";
}

function updateQuantumVisualization(data) {
    const eve = $("eveInterceptor");
    if (!eve) return;
    eve.classList.toggle("active", (selectedModel === "qber" || selectedModel === "hybrid") && data.eavesdropper_detected);
}

function updateAnalysis(data) {
    setText("analysisText", data.reason);
    setText("analysisThreat", selectedModel === "qber" ? "NOT IN USE" : data.threat_probability >= 0.70 ? "HIGH" : data.threat_probability >= 0.30 ? "ELEVATED" : "LOW");
    setText("analysisQuantum", selectedModel === "ml" ? "NOT IN USE" : data.qber >= 0.05 ? "HIGH" : data.qber >= 0.03 ? "ELEVATED" : "LOW");
    setText("analysisChannel", selectedModel === "ml" ? "NOT IN USE" : data.channel_noise >= 0.03 ? "NOISY" : "STABLE");
    const risk = getRiskScore(data);
    setText("analysisConfidence", selectedModel === "hybrid" ? (risk >= 65 ? "HIGH" : risk >= 30 ? "MEDIUM" : "HIGH") : "MODEL SCORE");
    setText("analysisBadge", selectedModel === "hybrid" ? "HYBRID" : selectedModel.toUpperCase() + " ONLY");
}

function updateSecurityEvents(data) {
    const feed = $("eventFeed");
    if (!feed) return;
    const events = [
        {
            title: `Policy decision: ${data.decision}`,
            message: data.reason,
            severity: data.decision === "ACCEPT" ? "success" : data.decision === "MONITOR" ? "warning" : "danger"
        }
    ];

    if (selectedModel !== "qber") {
        events.push({
            title: "Classical model",
            message: `Threat probability ${percent(data.threat_probability)}.`,
            severity: data.threat_probability >= 0.70 ? "danger" : data.threat_probability >= 0.30 ? "warning" : "success"
        });
    }

    if (selectedModel !== "ml") {
        events.push({
            title: "Quantum model",
            message: `QBER ${percent(data.qber)} · noise ${percent(data.channel_noise)}.`,
            severity: data.qber >= 0.05 ? "danger" : data.qber >= 0.03 ? "warning" : "success"
        });
    }

    if (data.eavesdropper_detected && selectedModel !== "ml") {
        events.push({
            title: "Eavesdropper evidence",
            message: "Quantum-channel telemetry indicates possible interception.",
            severity: "danger"
        });
    }

    feed.innerHTML = events.map(event => `
        <div class="security-event event-${event.severity}">
            <span class="event-dot"></span>
            <div class="event-copy">
                <strong>${escapeHtml(event.title)}</strong>
                <span>${escapeHtml(event.message)}</span>
            </div>
            <span class="event-time">${escapeHtml(nowTime())}</span>
        </div>
    `).join("");
}

function updateDragonState(data) {
    window.updateDragonThemeState?.(data.decision, selectedModel);
}

function renderDashboard(data) {
    lastData = data;
    updateModelView();
    updateDecisionState(data);
    updateRiskGauge(data);
    updateEvidence(data);
    updateMetrics(data);
    updateQuantumMetrics(data);
    updateNetworkVisualization(data);
    updateQuantumVisualization(data);
    updateAttackSurface(data);
    updateAnalysis(data);
    updateSecurityEvents(data);
    updateDragonState(data);
    window.setChannelFlowState?.(data.decision === "REJECT" ? "reject" : data.decision === "MONITOR" ? "monitor" : "secure");
    drawAllCharts();
}

/* =========================================================
   MODEL REFRESH
   ========================================================= */

async function refreshForSelectedModel() {
    updateModelMetadata();

    if (uploadedDataset && currentDatasetResult) {
        updateModelResultPanels(currentDatasetResult);
        const data = resultToDashboardData(currentDatasetResult);
        renderDashboard(data);
        return;
    }

    const demo = await fetchDemoScenario(currentScenario);
    const result = {
        ml: {
            available: true,
            threat_probability: demo.threat_probability,
            decision: modelDecisionFromML(demo.threat_probability),
            detail: `Controlled scenario threat evidence is ${percent(demo.threat_probability)}.`,
            confidence: Math.max(demo.threat_probability, 1 - demo.threat_probability)
        },
        qber: {
            available: true,
            qber: demo.qber,
            channel_noise: demo.channel_noise,
            expected_qber: demo.expected_qber,
            eavesdropper_detected: demo.eavesdropper_detected,
            quantum_attack_probability: demo.quantum_attack_probability,
            decision: modelDecisionFromQber(demo.qber),
            detail: `Controlled Qiskit/QBER scenario: ${percent(demo.qber)} QBER and ${percent(demo.channel_noise)} noise.`,
            qubits_sent: demo.qkd.qubits_sent,
            sifted_key_length: demo.qkd.sifted_key_length,
            source: demo.metadata?.source
        }
    };
    const hybridData = normalizeScenario(demo);
    const riskScore = getRiskScore(hybridData);
    result.hybrid = {
        available: true,
        risk_score: riskScore,
        decision: demo.decision,
        reason: demo.reason,
        detail: `Combined controlled evidence gives risk score ${riskScore}/100.`
    };

    currentDatasetResult = null;
    updateModelResultPanels(result);
    const data = selectedModel === "ml"
        ? normalizeScenario({ ...demo, qber: 0, channel_noise: 0, eavesdropper_detected: false, decision: result.ml.decision, reason: result.ml.detail })
        : selectedModel === "qber"
            ? normalizeScenario({ ...demo, threat_probability: 0, decision: result.qber.decision, reason: result.qber.detail })
            : demo;
    renderDashboard(data);
}

/* =========================================================
   SCENARIOS
   ========================================================= */

async function runScenario(scenarioName) {
    if (uploadedDataset) {
        setText("datasetMessage", "Demo scenarios are disabled while an uploaded dataset is active. Clear the dataset to return to the controlled scenario simulation.");
        $("datasetMessage")?.classList.add("is-error");
        return;
    }

    currentScenario = SCENARIOS[scenarioName] ? scenarioName : "normal";
    document.querySelectorAll(".scenario-button").forEach(button => {
        button.classList.toggle("active", button.dataset.scenario === currentScenario);
    });

    const data = await refreshForSelectedModel();
    void data;
}

window.runScenario = runScenario;

/* =========================================================
   EXPERIMENT CONTROLS
   ========================================================= */

function updateExperimentLabels() {
    setText("nBitsValue", $("nBitsControl")?.value || "100");
    setText("trialsValue", $("trialsControl")?.value || "10");
}

function initializeExperimentControls() {
    $("nBitsControl")?.addEventListener("input", updateExperimentLabels);
    $("trialsControl")?.addEventListener("input", updateExperimentLabels);
    updateExperimentLabels();
}

/* =========================================================
   CHARTS
   ========================================================= */

function chartColors() {
    const style = getComputedStyle(document.body);
    return {
        accent: style.getPropertyValue("--accent").trim() || "#55d6ff",
        accent2: style.getPropertyValue("--accent-2").trim() || "#7b61ff",
        success: style.getPropertyValue("--success").trim() || "#43f5a1",
        warning: style.getPropertyValue("--warning").trim() || "#ffc857",
        danger: style.getPropertyValue("--danger").trim() || "#ff5268",
        muted: style.getPropertyValue("--muted").trim() || "#8ca2b8",
        text: style.getPropertyValue("--text").trim() || "#eef7ff"
    };
}

function drawAxes(ctx, width, height, margin, xMax, yMax, colors, xLabel, yLabel) {
    ctx.strokeStyle = "rgba(150,170,190,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();

    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "center";
    ctx.fillText(xLabel, width / 2, height - 8);
    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    const grid = 4;
    ctx.textAlign = "right";
    for (let i = 0; i <= grid; i += 1) {
        const y = margin.top + (height - margin.top - margin.bottom) * (1 - i / grid);
        const value = (yMax * i / grid).toFixed(yMax < 10 ? 1 : 0);
        ctx.fillStyle = colors.muted;
        ctx.fillText(value, margin.left - 6, y + 3);
        if (i > 0) {
            ctx.strokeStyle = "rgba(150,170,190,0.10)";
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(width - margin.right, y);
            ctx.stroke();
        }
    }

    ctx.textAlign = "center";
    for (let i = 0; i <= grid; i += 1) {
        const x = margin.left + (width - margin.left - margin.right) * i / grid;
        const value = (xMax * i / grid).toFixed(xMax < 10 ? 1 : 0);
        ctx.fillStyle = colors.muted;
        ctx.fillText(value, x, height - margin.bottom + 16);
    }
}

function clearCanvas(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(260, Math.round(rect.width || 520));
    const height = 280;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
}

function showChartUnavailable(canvasId, message) {
    const canvas = $(canvasId);
    const setup = clearCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const colors = chartColors();
    ctx.fillStyle = colors.muted;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(message, width / 2, height / 2);
}

function drawLineChart(canvasId, points, xLabel, yLabel, stroke) {
    if (!points?.length) {
        showChartUnavailable(canvasId, "NO DATA FOR SELECTED MODEL");
        return;
    }
    const canvas = $(canvasId);
    const setup = clearCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const colors = chartColors();
    const margin = { left: 50, right: 18, top: 14, bottom: 35 };
    const xMax = Math.max(...points.map(p => p.x), 1);
    const yMax = Math.max(...points.map(p => p.y), 1) * 1.15;
    drawAxes(ctx, width, height, margin, xMax, yMax, colors, xLabel, yLabel);

    const px = x => margin.left + (width - margin.left - margin.right) * (x / xMax);
    const py = y => height - margin.bottom - (height - margin.top - margin.bottom) * (y / yMax);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(px(p.x), py(p.y)) : ctx.lineTo(px(p.x), py(p.y)));
    ctx.stroke();

    points.forEach(p => {
        ctx.fillStyle = stroke;
        ctx.beginPath();
        ctx.arc(px(p.x), py(p.y), 3.2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawScatterChart(canvasId, points, xLabel, yLabel, stroke) {
    drawLineChart(canvasId, points, xLabel, yLabel, stroke);
}

function drawEvidenceChart(canvasId) {
    const canvas = $(canvasId);
    const setup = clearCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const colors = chartColors();
    const data = scenarioHistory;
    const margin = { left: 45, right: 14, top: 18, bottom: 38 };
    const max = 100;

    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    data.forEach((item, index) => {
        const groupWidth = (width - margin.left - margin.right) / data.length;
        const x = margin.left + groupWidth * index + groupWidth / 2;
        const barWidth = Math.max(9, groupWidth * 0.18);
        const threatH = (height - margin.top - margin.bottom) * (item.threat / max);
        const qberH = (height - margin.top - margin.bottom) * (item.qber / max);
        ctx.fillStyle = colors.accent;
        ctx.fillRect(x - barWidth - 2, height - margin.bottom - threatH, barWidth, threatH);
        ctx.fillStyle = colors.danger;
        ctx.fillRect(x + 2, height - margin.bottom - qberH, barWidth, qberH);
        ctx.fillStyle = colors.muted;
        ctx.save();
        ctx.translate(x, height - margin.bottom + 13);
        ctx.rotate(-Math.PI / 7);
        ctx.fillText(item.name, 0, 0);
        ctx.restore();
    });

    ctx.strokeStyle = "rgba(150,170,190,0.16)";
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

    ctx.fillStyle = colors.accent;
    ctx.fillRect(width - 150, 10, 9, 9);
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "left";
    ctx.fillText("THREAT", width - 136, 18);
    ctx.fillStyle = colors.danger;
    ctx.fillRect(width - 90, 10, 9, 9);
    ctx.fillStyle = colors.muted;
    ctx.fillText("QBER", width - 76, 18);
}

function drawDecisionDistribution(canvasId) {
    const canvas = $(canvasId);
    const setup = clearCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const colors = chartColors();
    const counts = { ACCEPT: 0, MONITOR: 0, REJECT: 0 };
    scenarioHistory.forEach(item => { counts[item.decision] = (counts[item.decision] || 0) + 1; });
    if (selectedModel === "ml") counts.ACCEPT = counts.MONITOR = counts.REJECT = 0;

    const values = ["ACCEPT", "MONITOR", "REJECT"].map(k => ({ label: k, value: counts[k] || 0 }));
    const max = Math.max(...values.map(v => v.value), 1);
    const margin = { left: 48, right: 22, top: 18, bottom: 34 };
    const groupW = (width - margin.left - margin.right) / values.length;
    const barW = groupW * 0.42;
    values.forEach((item, i) => {
        const x = margin.left + groupW * i + (groupW - barW) / 2;
        const h = (height - margin.top - margin.bottom) * (item.value / max);
        const color = item.label === "ACCEPT" ? colors.success : item.label === "MONITOR" ? colors.warning : colors.danger;
        ctx.fillStyle = color;
        ctx.fillRect(x, height - margin.bottom - h, barW, h);
        ctx.fillStyle = colors.muted;
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(item.label, x + barW / 2, height - margin.bottom + 16);
        ctx.fillText(String(item.value), x + barW / 2, height - margin.bottom - h - 7);
    });

    ctx.strokeStyle = "rgba(150,170,190,0.16)";
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
}

function drawResearchCharts() {
    const colors = chartColors();
    const activeQBER = selectedModel === "qber" || selectedModel === "hybrid";
    const activeML = selectedModel === "ml" || selectedModel === "hybrid";

    if (activeQBER) {
        drawLineChart("qberNoiseChart", RESEARCH_DATA.qberNoise, "CHANNEL NOISE (%)", "QBER (%)", colors.accent);
        drawLineChart("qberEveChart", RESEARCH_DATA.qberEve, "EAVESDROPPING (%)", "QBER (%)", colors.danger);
    } else {
        showChartUnavailable("qberNoiseChart", "QBER MODEL NOT IN USE");
        showChartUnavailable("qberEveChart", "QBER MODEL NOT IN USE");
    }

    if (selectedModel === "hybrid") {
        drawScatterChart("threatQberChart", scenarioHistory.map(item => ({ x: item.threat, y: item.qber })), "THREAT (%)", "QBER (%)", colors.accent2);
        drawEvidenceChart("evidenceComparisonChart");
    } else if (selectedModel === "ml") {
        drawScatterChart("threatQberChart", scenarioHistory.map((item, index) => ({ x: index + 1, y: item.threat })), "SCENARIO INDEX", "THREAT (%)", colors.accent);
        showChartUnavailable("evidenceComparisonChart", "QUANTUM EVIDENCE NOT IN USE");
    } else {
        drawScatterChart("threatQberChart", scenarioHistory.map((item, index) => ({ x: index + 1, y: item.qber })), "SCENARIO INDEX", "QBER (%)", colors.danger);
        showChartUnavailable("evidenceComparisonChart", "CLASSICAL EVIDENCE NOT IN USE");
    }

    drawDecisionDistribution("decisionDistributionChart");

    // Make sure the uploaded-data mode shows a small status line without replacing the research curves.
    if (uploadedDataset) {
        setText("experimentRunInfo", `Uploaded: ${uploadedDataset.fileName} · ${uploadedDataset.rows.length.toLocaleString()} rows`);
    } else {
        setText("experimentRunInfo", `Last run: ${currentScenario.toUpperCase()} · ${$("nBitsControl")?.value || 100} bits × ${$("trialsControl")?.value || 10} trials`);
    }
}

function drawAllCharts() {
    requestAnimationFrame(drawResearchCharts);
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    initializeTheme();
    initializeModelSelector();
    initializeExperimentControls();
    initializeDataUpload();

    document.querySelectorAll(".scenario-button").forEach(button => {
        button.addEventListener("click", () => runScenario(button.dataset.scenario));
    });

    await refreshForSelectedModel();
    startBackendHealthMonitoring();
});
