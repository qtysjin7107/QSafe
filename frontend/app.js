/*
    Q-Safe Frontend
    ----------------

    Current data source:
        FastAPI

    Demo source:
        Q-Safe /api/demo

    This file also owns:
        - theme switching
        - theme persistence
        - dashboard updates
        - research visualizations
*/


/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API_CONFIG = {

    USE_MOCK_API: false,

    BASE_URL:
        "",

    SECURITY_ENDPOINT:
        "/api/demo",

    UPLOAD_ENDPOINT:
        "/api/upload/analyze"

};


/* =========================================================
   THEME CONFIGURATION
   ========================================================= */

const THEME_CONFIG = {

    defaultTheme:
        "quantum-core",

    storageKey:
        "qsafe-theme"

};


/* =========================================================
   THEME FUNCTIONS
   ========================================================= */

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


    if (
        !validThemes.includes(themeName)
    ) {

        themeName =
            THEME_CONFIG.defaultTheme;

    }


    document.body.dataset.theme =
        themeName;


    const themeSelect =
        document.getElementById(
            "themeSelect"
        );


    if (themeSelect) {

        themeSelect.value =
            themeName;

    }


    localStorage.setItem(
        THEME_CONFIG.storageKey,
        themeName
    );


    const leftNodeLabel = getElement("leftNodeLabel");
    const rightNodeLabel = getElement("rightNodeLabel");

    if (leftNodeLabel && rightNodeLabel) {
        if (themeName === "dragon") {
            leftNodeLabel.textContent = "PERSON A";
            rightNodeLabel.textContent = "PERSON B";
        } else {
            leftNodeLabel.textContent = "Hospital A";
            rightNodeLabel.textContent = "Cloud";
        }
    }


    if (typeof window.updateDragonTheme === "function") {
        window.updateDragonTheme(themeName);
    }


    /*
        Ambient field reads the theme CSS variables
        dynamically, so no direct call is needed.
    */

}


function initializeTheme() {

    const savedTheme =
        localStorage.getItem(
            THEME_CONFIG.storageKey
        );


    const initialTheme =
        savedTheme ||
        THEME_CONFIG.defaultTheme;


    applyTheme(
        initialTheme
    );


    const themeSelect =
        document.getElementById(
            "themeSelect"
        );


    if (themeSelect) {

        themeSelect.addEventListener(
            "change",
            event => {

                applyTheme(
                    event.target.value
                );

            }
        );

    }

}


/* =========================================================
   SCENARIO DATA
   ========================================================= */

const scenarios = {

    normal: true,
    noise: true,
    network: true,
    eve: true,
    combined: true

};


/* =========================================================
   LIVE RESEARCH DATA
   ========================================================= */

const qberNoiseData = [];

const qberEveData = [];

const threatQberData = [];

const evidenceComparisonData = [];

const decisionDistributionData = [

    {
        decision: "ACCEPT",
        count: 0
    },

    {
        decision: "MONITOR",
        count: 0
    },

    {
        decision: "REJECT",
        count: 0
    }

];


function recordLiveResearchData(
    scenarioName,
    data
) {

    const qberPercent =
        (data.qber || 0) *
        100;

    const noisePercent =
        (data.channel_noise || 0) *
        100;

    const evePercent =
        (
            data.quantum_attack_probability ??
            data.eve_probability ??
            0
        ) *
        100;

    const threatPercent =
        (data.threat_probability || 0) *
        100;

    qberNoiseData.push({
        noise: Number(noisePercent.toFixed(3)),
        qber: Number(qberPercent.toFixed(3))
    });

    qberNoiseData.sort((a, b) => a.noise - b.noise);

    qberEveData.push({
        eve: Number(evePercent.toFixed(3)),
        qber: Number(qberPercent.toFixed(3))
    });

    qberEveData.sort((a, b) => a.eve - b.eve);

    const replacePoint = (array, point) => {
        const existingIndex =
            array.findIndex(
                item => item.name === point.name
            );

        if (existingIndex >= 0) {
            array[existingIndex] = point;
        } else {
            array.push(point);
        }
    };

    replacePoint(
        threatQberData,
        {
            name: scenarioName.toUpperCase(),
            threat: Number(threatPercent.toFixed(2)),
            qber: Number(qberPercent.toFixed(3))
        }
    );

    replacePoint(
        evidenceComparisonData,
        {
            name: scenarioName.toUpperCase(),
            threat: Number(threatPercent.toFixed(2)),
            qber: Number(qberPercent.toFixed(3))
        }
    );

    const decision =
        String(data.decision || "MONITOR")
            .toUpperCase();

    const decisionItem =
        decisionDistributionData.find(
            item => item.decision === decision
        );

    if (decisionItem) {
        decisionItem.count += 1;
    }

    drawAllCharts();

}


/* =========================================================
   DOM HELPER
   ========================================================= */

function getElement(id) {

    return document.getElementById(
        id
    );

}


/* =========================================================
   MOCK API
   ========================================================= */

async function mockSecurityEvaluation(
    scenarioName
) {

    return new Promise(
        resolve => {

            setTimeout(
                () => {

                    const scenario =
                        scenarios[
                            scenarioName
                        ];


                    resolve({

                        success:
                            true,

                        data: {

                            threat_probability:
                                scenario.threatProbability,

                            qber:
                                scenario.qber,

                            channel_noise:
                                scenario.noiseRate,

                            eavesdropper_detected:
                                scenario.eveDetected,

                            decision:
                                scenario.decision,

                            reason:
                                scenario.reason,

                            qkd: {

                                protocol:
                                    "BB84",

                                qubits_sent:
                                    scenario.qubitsSent,

                                sifted_key_length:
                                    scenario.siftedKeyLength

                            },

                            metadata: {

                                source:
                                    "mock",

                                scenario:
                                    scenarioName

                            }

                        }

                    });

                },

                350
            );

        }
    );

}


/* =========================================================
   FASTAPI REQUEST
   ========================================================= */

async function fetchSecurityEvaluation(
    scenarioName
) {

    const modeMap = {
        normal: "NORMAL",
        noise: "NOISY_CHANNEL",
        network: "NETWORK_ATTACK",
        eve: "EAVESDROPPER",
        combined: "COMBINED_ATTACK"
    };

    const response =
        await fetch(
            API_CONFIG.BASE_URL +
            API_CONFIG.SECURITY_ENDPOINT,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    mode: modeMap[scenarioName] || "NORMAL",
                    n_bits: 100,
                    trials: 10
                })
            }
        );

    if (!response.ok) {

        throw new Error(
            `Backend returned HTTP ${response.status}`
        );

    }

    const payload = await response.json();

    if (!payload || !payload.result) {
        throw new Error("Backend response missing result.");
    }

    const result = payload.result;
    const threat = result.threat || {};
    const quantum = result.quantum || {};
    const decision = result.decision || {};

    return {
        success: true,
        data: {
            threat_probability: threat.threat_probability ?? 0,
            qber: quantum.qber ?? 0,
            channel_noise: quantum.noise_rate ?? 0,
            expected_qber: quantum.expected_qber ?? 0,
            quantum_attack_probability: quantum.quantum_attack_probability ?? 0,
            eavesdropper_detected: (quantum.quantum_attack_probability ?? 0) >= 0.80,
            decision: decision.decision || "MONITOR",
            reason: decision.reason || "Security evaluation completed.",
            qkd: {
                protocol: "BB84",
                qubits_sent: (quantum.trials || 0) * (quantum.bits_per_trial || 0),
                sifted_key_length: Math.round(quantum.mean_sifted_key_length || 0)
            },
            metadata: {
                source: "q-safe-fastapi",
                scenario: scenarioName,
                quantum_attack_probability: quantum.quantum_attack_probability ?? 0
            }
        }
    };
}


async function getSecurityEvaluation(
    scenarioName
) {

    if (API_CONFIG.USE_MOCK_API) {
        return await mockSecurityEvaluation(
            scenarioName
        );
    }

    return await fetchSecurityEvaluation(
        scenarioName
    );
}


/* =========================================================
   RESPONSE VALIDATION
   ========================================================= */

function validateSecurityResponse(
    response
) {

    if (!response) {

        throw new Error(
            "Empty API response."
        );

    }


    if (!response.data) {

        throw new Error(
            "API response is missing data."
        );

    }


    const data =
        response.data;


    const requiredFields = [

        "threat_probability",
        "qber",
        "channel_noise",
        "eavesdropper_detected",
        "decision"

    ];


    for (
        const field of requiredFields
    ) {

        if (
            data[field] === undefined ||
            data[field] === null
        ) {

            throw new Error(
                `API response missing field: ${field}`
            );

        }

    }


    return true;

}


/* =========================================================
   UPDATE DASHBOARD
   ========================================================= */

function updateDashboard(
    response
) {

    validateSecurityResponse(
        response
    );


    const data =
        response.data;


    /* ---------- Metrics ---------- */

    getElement(
        "threatProbability"
    ).textContent =
        `${(
            data.threat_probability *
            100
        ).toFixed(1)}%`;


    getElement(
        "qber"
    ).textContent =
        `${(
            data.qber *
            100
        ).toFixed(1)}%`;


    getElement(
        "noise"
    ).textContent =
        `${(
            data.channel_noise *
            100
        ).toFixed(1)}%`;


    if (getElement("quantumAttackProbability")) {
        getElement("quantumAttackProbability").textContent =
            `${(
                (data.quantum_attack_probability || 0) *
                100
            ).toFixed(1)}%`;
    }


    if (getElement("expectedQber")) {
        getElement("expectedQber").textContent =
            `${(
                (data.expected_qber || 0) *
                100
            ).toFixed(1)}%`;
    }


    /* ---------- Eavesdropper ---------- */

    getElement(
        "eve"
    ).textContent =

        data.eavesdropper_detected
            ? "DETECTED"
            : "NOT DETECTED";


    /* ---------- Threat Status ---------- */

    let threatStatus =
        "LOW RISK";


    if (
        data.threat_probability >=
        0.75
    ) {

        threatStatus =
            "HIGH RISK";

    }
    else if (
        data.threat_probability >=
        0.30
    ) {

        threatStatus =
            "MEDIUM RISK";

    }


    getElement(
        "threatStatus"
    ).textContent =
        threatStatus;


    /* ---------- Decision ---------- */

    getElement(
        "decision"
    ).textContent =
        data.decision;


    getElement(
        "decisionReason"
    ).textContent =
        data.reason ||
        "Security assessment completed.";


    /* ---------- QKD ---------- */

    getElement(
        "quantumQber"
    ).textContent =
        `${(
            data.qber *
            100
        ).toFixed(1)}%`;


    if (data.qkd) {

        if (
            data.qkd.qubits_sent !==
            undefined
        ) {

            getElement(
                "qubitsSent"
            ).textContent =
                data.qkd.qubits_sent;

        }


        if (
            data.qkd.sifted_key_length !==
            undefined
        ) {

            getElement(
                "siftedKey"
            ).textContent =
                `${data.qkd.sifted_key_length} bits`;

        }

    }


    /* ---------- Channel ---------- */

    const connection =
        getElement(
            "quantumConnection"
        );


    const connectionLine =
        connection.querySelector(
            ".connection-line"
        );


    const channelStatus =
        getElement(
            "channelStatus"
        );


    let channelText =
        "SECURE";


    let channelColor =
        "#4ee39a";


    if (
        data.decision ===
        "MONITOR"
    ) {

        channelText =
            "MONITOR";

        channelColor =
            "#e8c75c";

    }


    if (
        data.decision ===
        "REJECT"
    ) {

        channelText =
            "COMPROMISED";

        channelColor =
            "#e86b6b";

    }


    channelStatus.textContent =
        channelText;


    channelStatus.style.color =
        channelColor;


    connectionLine.style.background =
        channelColor;


    connectionLine.style.boxShadow =
        `0 0 12px ${channelColor}`;


    /* ---------- Decision Color ---------- */

    const decisionCard =
        getElement(
            "decisionCard"
        );


    if (
        data.decision ===
        "ACCEPT"
    ) {

        decisionCard.style.borderColor =
            "#28543e";

        getElement(
            "decision"
        ).style.color =
            "#67e59a";

    }
    else if (
        data.decision ===
        "MONITOR"
    ) {

        decisionCard.style.borderColor =
            "#66592a";

        getElement(
            "decision"
        ).style.color =
            "#e8c75c";

    }
    else {

        decisionCard.style.borderColor =
            "#633535";

        getElement(
            "decision"
        ).style.color =
            "#e86b6b";

    }


    /* ---------- Security Analysis ---------- */

    let networkEvidence =
        "LOW THREAT";


    if (
        data.threat_probability >=
        0.75
    ) {

        networkEvidence =
            "HIGH THREAT";

    }
    else if (
        data.threat_probability >=
        0.30
    ) {

        networkEvidence =
            "MEDIUM THREAT";

    }


    let quantumEvidence =
        "NORMAL";


    if (
        data.qber >=
        0.05
    ) {

        quantumEvidence =
            "HIGH ERROR";

    }
    else if (
        data.qber >=
        0.03
    ) {

        quantumEvidence =
            "ELEVATED ERROR";

    }


    getElement(
        "networkEvidence"
    ).textContent =
        networkEvidence;


    getElement(
        "quantumEvidence"
    ).textContent =
        quantumEvidence;


    getElement(
        "analysisChannel"
    ).textContent =
        channelText;


    /* ---------- Badge ---------- */

    let badgeText =
        "NORMAL";


    if (
        data.decision ===
        "MONITOR"
    ) {

        badgeText =
            "MONITOR";

    }


    if (
        data.decision ===
        "REJECT"
    ) {

        badgeText =
            "CRITICAL";

    }


    getElement(
        "analysisBadge"
    ).textContent =
        badgeText;


    if (getElement("decisionCard")) {
        getElement("decisionCard").dataset.decision =
            data.decision || "MONITOR";
    }


    if (typeof window.updateDragonThemeState === "function") {
        window.updateDragonThemeState(
            data.decision || "MONITOR"
        );
    }

}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoadingState(
    isLoading
) {

    const decision =
        getElement(
            "decision"
        );


    if (isLoading) {

        decision.textContent =
            "ANALYZING";


        decision.style.color =
            "var(--accent)";

    }

}


/* =========================================================
   ERROR STATE
   ========================================================= */

function showApiError(
    error
) {

    console.error(
        "Q-Safe API error:",
        error
    );


    getElement(
        "decision"
    ).textContent =
        "ERROR";


    getElement(
        "decision"
    ).style.color =
        "#e86b6b";


    getElement(
        "decisionReason"
    ).textContent =
        "Security evaluation could not be completed. Check the backend connection.";


    getElement(
        "analysisBadge"
    ).textContent =
        "API ERROR";


    getElement(
        "analysisChannel"
    ).textContent =
        "UNAVAILABLE";


    getElement(
        "networkEvidence"
    ).textContent =
        "UNAVAILABLE";


    getElement(
        "quantumEvidence"
    ).textContent =
        "UNAVAILABLE";

}


/* =========================================================
   RUN SCENARIO
   ========================================================= */

async function runScenario(
    name
) {

    if (
        !scenarios[name]
    ) {

        return;

    }


    /* ---------- Active button ---------- */

    document
        .querySelectorAll(
            ".scenario-button"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );

            }
        );


    const buttons =
        document.querySelectorAll(
            ".scenario-button"
        );


    buttons.forEach(
        button => {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();


            if (

                (
                    name === "normal" &&
                    text === "normal"
                )

                ||

                (
                    name === "noise" &&
                    text === "channel noise"
                )

                ||

                (
                    name === "network" &&
                    text === "network attack"
                )

                ||

                (
                    name === "eve" &&
                    text === "eavesdropper"
                )

                ||

                (
                    name === "combined" &&
                    text === "combined attack"
                )

            ) {

                button.classList.add(
                    "active"
                );

            }

        }
    );


    setLoadingState(
        true
    );


    try {

        const response =
            await getSecurityEvaluation(
                name
            );


        updateDashboard(
            response
        );

        if (response && response.data) {
            recordLiveResearchData(
                name,
                response.data
            );
        }

    }
    catch (error) {

        showApiError(
            error
        );

    }

}



/* =========================================================
   LIVE QUANTUM THREAT LAB
   Added without changing existing dashboard logic.
   ========================================================= */

const liveLabState = {
    noiseRate: 0.0,
    eveProbability: 0.0,
    threatProbability: 0.05,
    noiseHistory: [],
    eveHistory: [],
    requestTimer: null,
    requestController: null,
    requestSequence: 0,
    initialized: false
};


function clampLiveLabValue(value, minimum, maximum) {
    return Math.min(
        maximum,
        Math.max(minimum, Number(value) || 0)
    );
}


function upsertLiveLabPoint(array, x, y) {
    const existing = array.findIndex(
        point => Math.abs(point.x - x) < 0.0001
    );

    const point = {
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3))
    };

    if (existing >= 0) {
        array[existing] = point;
    }
    else {
        array.push(point);
    }

    array.sort((a, b) => a.x - b.x);

    if (array.length > 20) {
        array.splice(0, array.length - 20);
    }
}


function setLiveLabText(id, value) {
    const element = getElement(id);
    if (element) {
        element.textContent = value;
    }
}


function updateLiveLabControls() {
    const noiseLabel = getElement("liveLabNoiseValue");
    const eveLabel = getElement("liveLabEveValue");
    const threatLabel = getElement("liveLabThreatValue");

    if (noiseLabel) {
        noiseLabel.textContent =
            `${(liveLabState.noiseRate * 100).toFixed(1)}%`;
    }

    if (eveLabel) {
        eveLabel.textContent =
            `${(liveLabState.eveProbability * 100).toFixed(0)}%`;
    }

    if (threatLabel) {
        threatLabel.textContent =
            `${(liveLabState.threatProbability * 100).toFixed(0)}%`;
    }
}


function updateLiveLabStatus(message, type = "") {
    const status = getElement("liveLabStatus");

    if (!status) {
        return;
    }

    status.textContent = message;
    status.className = "live-lab-status";

    if (type) {
        status.classList.add(type);
    }
}


function drawLiveLabCharts() {
    drawLineChart(
        "liveLabNoiseChart",
        liveLabState.noiseHistory,
        "x",
        "y",
        15,
        25,
        "Channel Noise",
        "QBER"
    );

    drawLineChart(
        "liveLabEveChart",
        liveLabState.eveHistory,
        "x",
        "y",
        100,
        50,
        "Eavesdropper Probability",
        "QBER"
    );
}


function updateLiveLabResults(payload) {
    const data = payload.data || {};
    const quantum = payload.quantum || {};
    const decision = payload.decision || {};

    setLiveLabText(
        "liveLabQber",
        `${(Number(data.qber || 0) * 100).toFixed(1)}%`
    );

    setLiveLabText(
        "liveLabExpectedQber",
        `${(Number(data.expected_qber || 0) * 100).toFixed(1)}%`
    );

    setLiveLabText(
        "liveLabEvePosterior",
        `${(Number(data.quantum_attack_probability || 0) * 100).toFixed(1)}%`
    );

    setLiveLabText(
        "liveLabDecision",
        String(data.decision || "MONITOR")
    );

    setLiveLabText(
        "liveLabAnomaly",
        `${(Number(quantum.quantum_anomaly || 0) * 100).toFixed(1)}%`
    );

    const decisionText =
        String(decision.reason || data.reason || "Simulation complete.");

    setLiveLabText(
        "liveLabReason",
        decisionText
    );

    const decisionBadge = getElement("liveLabDecision");
    if (decisionBadge) {
        decisionBadge.dataset.decision =
            String(data.decision || "MONITOR").toLowerCase();
    }

    upsertLiveLabPoint(
        liveLabState.noiseHistory,
        liveLabState.noiseRate * 100,
        Number(data.qber || 0) * 100
    );

    upsertLiveLabPoint(
        liveLabState.eveHistory,
        liveLabState.eveProbability * 100,
        Number(data.qber || 0) * 100
    );

    drawLiveLabCharts();

    const circuitImage = getElement("qiskitCircuitImage");
    if (circuitImage) {
        const eve = liveLabState.eveProbability > 0;
        circuitImage.src =
            `${API_CONFIG.BASE_URL}/api/qiskit/circuit.svg?eve=${eve ? "true" : "false"}&v=${Date.now()}`;
    }
}


async function runLiveLabSimulation() {
    const requestSequence =
        ++liveLabState.requestSequence;

    if (liveLabState.requestController) {
        liveLabState.requestController.abort();
    }

    liveLabState.requestController =
        new AbortController();

    updateLiveLabStatus(
        "Running the Qiskit BB84 simulation…"
    );

    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}/api/lab/simulate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    noise_rate: liveLabState.noiseRate,
                    eve_probability: liveLabState.eveProbability,
                    threat_probability: liveLabState.threatProbability,
                    n_bits: 200,
                    trials: 3
                }),
                signal: liveLabState.requestController.signal
            }
        );

        if (!response.ok) {
            let detail =
                `Backend returned HTTP ${response.status}.`;

            try {
                const errorPayload = await response.json();
                detail =
                    errorPayload.detail ||
                    errorPayload.message ||
                    detail;
            }
            catch (_) {
                /* Keep the HTTP error. */
            }

            throw new Error(detail);
        }

        const payload = await response.json();

        if (requestSequence !== liveLabState.requestSequence) {
            return;
        }

        if (!payload || !payload.data) {
            throw new Error("Live simulation returned an invalid response.");
        }

        updateDashboard({
            success: true,
            data: payload.data
        });

        updateLiveLabResults(payload);

        updateLiveLabStatus(
            "LIVE • Qiskit simulation updated",
            "success"
        );
    }
    catch (error) {
        if (error && error.name === "AbortError") {
            return;
        }

        console.error("Q-Safe live lab error:", error);

        updateLiveLabStatus(
            error.message || "Live quantum simulation failed.",
            "error"
        );
    }
}


function scheduleLiveLabSimulation() {
    updateLiveLabControls();

    clearTimeout(liveLabState.requestTimer);

    liveLabState.requestTimer =
        setTimeout(
            () => {
                runLiveLabSimulation();
            },
            420
        );
}


function openQiskitCircuitModal() {
    const modal = getElement("qiskitCircuitModal");

    if (!modal) {
        return;
    }

    const eve = liveLabState.eveProbability > 0;
    const image = getElement("qiskitCircuitImage");

    if (image) {
        image.src =
            `${API_CONFIG.BASE_URL}/api/qiskit/circuit.svg?eve=${eve ? "true" : "false"}&v=${Date.now()}`;
    }

    setLiveLabText(
        "qiskitCircuitMode",
        eve ? "BB84 WITH EAVESDROPPER" : "BB84 STANDARD"
    );

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
}


function closeQiskitCircuitModal() {
    const modal = getElement("qiskitCircuitModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
}


function initializeLiveThreatLab() {
    if (liveLabState.initialized) {
        return;
    }

    const noiseSlider = getElement("liveLabNoiseSlider");
    const eveSlider = getElement("liveLabEveSlider");
    const threatSlider = getElement("liveLabThreatSlider");

    if (!noiseSlider || !eveSlider || !threatSlider) {
        return;
    }

    liveLabState.initialized = true;

    liveLabState.noiseRate =
        Number(noiseSlider.value) / 100;
    liveLabState.eveProbability =
        Number(eveSlider.value) / 100;
    liveLabState.threatProbability =
        Number(threatSlider.value) / 100;

    noiseSlider.addEventListener(
        "input",
        event => {
            liveLabState.noiseRate =
                clampLiveLabValue(
                    Number(event.target.value) / 100,
                    0,
                    0.15
                );
            scheduleLiveLabSimulation();
        }
    );

    eveSlider.addEventListener(
        "input",
        event => {
            liveLabState.eveProbability =
                clampLiveLabValue(
                    Number(event.target.value) / 100,
                    0,
                    1
                );
            scheduleLiveLabSimulation();
        }
    );

    threatSlider.addEventListener(
        "input",
        event => {
            liveLabState.threatProbability =
                clampLiveLabValue(
                    Number(event.target.value) / 100,
                    0,
                    1
                );
            scheduleLiveLabSimulation();
        }
    );

    updateLiveLabControls();
    drawLiveLabCharts();

    const circuitButton =
        getElement("openQiskitCircuitButton");

    const circuitCloseButton =
        getElement("qiskitCircuitCloseButton");

    const modal =
        getElement("qiskitCircuitModal");

    if (circuitButton) {
        circuitButton.addEventListener(
            "click",
            openQiskitCircuitModal
        );
    }

    if (circuitCloseButton) {
        circuitCloseButton.addEventListener(
            "click",
            closeQiskitCircuitModal
        );
    }

    if (modal) {
        modal.addEventListener(
            "click",
            event => {
                if (event.target === modal) {
                    closeQiskitCircuitModal();
                }
            }
        );
    }

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeQiskitCircuitModal();
            }
        }
    );
}


/* =========================================================
   DATASET UPLOAD + LIVE ANALYSIS
   ========================================================= */

const DATASET_UPLOAD_CONFIG = {
    maxBytes: 25 * 1024 * 1024,
    allowedExtensions: [
        ".csv",
        ".txt",
        ".tsv"
    ]
};


const datasetState = {
    file: null,
    analyzing: false
};


function setDatasetStatus(
    message,
    type = ""
) {
    const status =
        getElement("datasetUploadStatus");

    if (!status) {
        return;
    }

    status.textContent =
        message;

    status.className =
        "dataset-upload-status";

    if (type) {
        status.classList.add(
            type
        );
    }
}


function updateDatasetFileUI() {
    const name =
        getElement("datasetFileName");

    const info =
        getElement("datasetFileInfo");

    const clearButton =
        getElement("datasetClearButton");

    const analyzeButton =
        getElement("datasetAnalyzeButton");

    if (!name || !info) {
        return;
    }

    if (!datasetState.file) {
        name.textContent =
            "No file selected";

        info.textContent =
            "Choose a dataset to begin.";

        if (clearButton) {
            clearButton.disabled = true;
        }

        if (analyzeButton) {
            analyzeButton.disabled = true;
        }

        return;
    }

    const sizeKb =
        datasetState.file.size /
        1024;

    name.textContent =
        datasetState.file.name;

    info.textContent =
        `${sizeKb.toFixed(1)} KB`;

    if (clearButton) {
        clearButton.disabled = false;
    }

    if (analyzeButton) {
        analyzeButton.disabled =
            datasetState.analyzing;
    }
}


function clearDatasetFile() {
    datasetState.file =
        null;

    const input =
        getElement("datasetFileInput");

    if (input) {
        input.value =
            "";
    }

    updateDatasetFileUI();

    const title =
        getElement("datasetDropTitle");

    if (title) {
        title.textContent =
            "DROP YOUR DATASET HERE";
    }

    setDatasetStatus(
        "Waiting for a dataset."
    );
}


function setDatasetFile(file) {
    if (!file) {
        return;
    }

    const lowerName =
        file.name.toLowerCase();

    const validExtension =
        DATASET_UPLOAD_CONFIG
            .allowedExtensions
            .some(
                extension =>
                    lowerName.endsWith(
                        extension
                    )
            );

    if (!validExtension) {
        setDatasetStatus(
            "Unsupported file type. Use CSV, TXT or TSV.",
            "error"
        );
        return;
    }

    if (
        file.size >
        DATASET_UPLOAD_CONFIG.maxBytes
    ) {
        setDatasetStatus(
            "File is larger than the 25 MB upload limit.",
            "error"
        );
        return;
    }

    datasetState.file =
        file;

    updateDatasetFileUI();

    const title =
        getElement("datasetDropTitle");

    if (title) {
        title.textContent =
            "DATASET SELECTED";
    }

    setDatasetStatus(
        `${file.name} is ready to analyze.`,
        "success"
    );
}


function firstDefinedValue(
    ...values
) {
    for (
        const value of values
    ) {
        if (
            value !== undefined &&
            value !== null
        ) {
            return value;
        }
    }

    return null;
}


function unwrapUploadPayload(
    payload
) {
    if (
        payload &&
        payload.data &&
        typeof payload.data === "object"
    ) {
        return payload.data;
    }

    return payload || {};
}


function getUploadResult(
    payload
) {
    const raw =
        unwrapUploadPayload(
            payload
        );

    const threatSignal =
        raw.threat_signal ||
        raw.threat ||
        {};

    const quantum =
        raw.quantum ||
        raw.qkd ||
        {};

    const decision =
        raw.decision_result ||
        raw.decision ||
        {};

    const metrics =
        raw.metrics ||
        raw.model_metrics ||
        {};

    const summary =
        raw.summary ||
        raw.dataset_summary ||
        {};

    const rows =
        firstDefinedValue(
            raw.rows_analyzed,
            raw.row_count,
            summary.rows_analyzed,
            summary.row_count,
            0
        );

    const threatProbability =
        Number(
            firstDefinedValue(
                raw.threat_probability,
                threatSignal.threat_probability,
                threatSignal.probability,
                raw.attack_probability,
                0
            )
        );

    const qber =
        Number(
            firstDefinedValue(
                raw.qber,
                quantum.qber,
                quantum.mean_qber,
                0
            )
        );

    const noise =
        Number(
            firstDefinedValue(
                raw.channel_noise,
                raw.noise_rate,
                quantum.noise_rate,
                quantum.channel_noise,
                0
            )
        );

    const expectedQber =
        Number(
            firstDefinedValue(
                raw.expected_qber,
                quantum.expected_qber,
                0
            )
        );

    const quantumAttackProbability =
        Number(
            firstDefinedValue(
                raw.quantum_attack_probability,
                quantum.quantum_attack_probability,
                quantum.posterior_eve_probability,
                raw.posterior_eve_probability,
                raw.eve_probability,
                0
            )
        );

    const decisionValue =
        String(
            firstDefinedValue(
                raw.decision,
                decision.decision,
                "MONITOR"
            )
        ).toUpperCase();

    const normalCount =
        firstDefinedValue(
            raw.normal_count,
            summary.normal_count,
            summary.predicted_normal,
            summary.normal,
            raw.predicted_normal,
            0
        );

    const attackCount =
        firstDefinedValue(
            raw.attack_count,
            summary.attack_count,
            summary.predicted_attack,
            summary.predicted_attacks,
            summary.attack,
            raw.predicted_attack,
            0
        );

    const averageThreat =
        firstDefinedValue(
            raw.average_threat_probability,
            raw.mean_threat_probability,
            summary.average_threat_probability,
            summary.mean_threat_probability,
            threatProbability
        );

    return {
        payload,
        raw,
        data: {
            threat_probability:
                Number.isFinite(
                    threatProbability
                )
                    ? threatProbability
                    : 0,

            qber:
                Number.isFinite(
                    qber
                )
                    ? qber
                    : 0,

            channel_noise:
                Number.isFinite(
                    noise
                )
                    ? noise
                    : 0,

            expected_qber:
                Number.isFinite(
                    expectedQber
                )
                    ? expectedQber
                    : 0,

            quantum_attack_probability:
                Number.isFinite(
                    quantumAttackProbability
                )
                    ? quantumAttackProbability
                    : 0,

            eavesdropper_detected:
                quantumAttackProbability >=
                0.80,

            decision:
                decisionValue,

            reason:
                firstDefinedValue(
                    raw.reason,
                    decision.reason,
                    raw.decision_reason,
                    "Security assessment completed."
                ),

            qkd: {
                protocol:
                    "BB84",

                qubits_sent:
                    firstDefinedValue(
                        quantum.qubits_sent,
                        quantum.trials &&
                        quantum.bits_per_trial
                            ? quantum.trials *
                              quantum.bits_per_trial
                            : undefined
                    ),

                sifted_key_length:
                    firstDefinedValue(
                        quantum.mean_sifted_key_length,
                        quantum.sifted_key_length
                    )
            },

            metadata: {
                source:
                    "uploaded-dataset",

                filename:
                    raw.filename ||
                    raw.file_name ||
                    datasetState.file?.name ||
                    "uploaded dataset",

                rows_analyzed:
                    rows,

                normal_count:
                    normalCount,

                attack_count:
                    attackCount,

                average_threat_probability:
                    averageThreat,

                accuracy:
                    firstDefinedValue(
                        metrics.accuracy,
                        raw.accuracy
                    ),

                precision:
                    firstDefinedValue(
                        metrics.precision,
                        raw.precision
                    ),

                recall:
                    firstDefinedValue(
                        metrics.recall,
                        raw.recall
                    ),

                f1:
                    firstDefinedValue(
                        metrics.f1,
                        raw.f1
                    )
            }
        }
    };
}


function updateDatasetResults(
    uploadResult
) {
    const data =
        uploadResult.data;

    const meta =
        data.metadata ||
        {};

    const setText =
        (
            id,
            value
        ) => {
            const element =
                getElement(id);

            if (
                element
            ) {
                element.textContent =
                    value;
            }
        };


    setText(
        "datasetRows",
        Number(
            meta.rows_analyzed ||
            0
        ).toLocaleString()
    );

    setText(
        "datasetNormal",
        Number(
            meta.normal_count ||
            0
        ).toLocaleString()
    );

    setText(
        "datasetAttack",
        Number(
            meta.attack_count ||
            0
        ).toLocaleString()
    );

    setText(
        "datasetThreat",
        `${(
            Number(
                meta.average_threat_probability ||
                data.threat_probability ||
                0
            ) *
            100
        ).toFixed(1)}%`
    );

    const percentMetric =
        value =>
            value ===
            null ||
            value ===
            undefined
                ? "—"
                : `${(
                    Number(
                        value
                    ) *
                    100
                ).toFixed(2)}%`;

    setText(
        "datasetAccuracy",
        percentMetric(
            meta.accuracy
        )
    );

    setText(
        "datasetPrecision",
        percentMetric(
            meta.precision
        )
    );

    setText(
        "datasetRecall",
        percentMetric(
            meta.recall
        )
    );

    setText(
        "datasetF1",
        percentMetric(
            meta.f1
        )
    );

    const badge =
        getElement(
            "datasetResultBadge"
        );

    if (badge) {
        badge.textContent =
            data.decision ||
            "ANALYZED";
    }

    const resultMessage =
        getElement(
            "datasetResultMessage"
        );

    if (resultMessage) {
        const name =
            meta.filename ||
            datasetState.file?.name ||
            "uploaded dataset";

        resultMessage.textContent =
            `${name} was processed by the Q-Safe backend. ` +
            `Threat probability: ` +
            `${(
                data.threat_probability *
                100
            ).toFixed(1)}%. ` +
            `QBER: ` +
            `${(
                data.qber *
                100
            ).toFixed(1)}%. ` +
            `Quantum attack probability: ` +
            `${(
                data.quantum_attack_probability *
                100
            ).toFixed(1)}%.`;
    }
}


function recordDatasetResearchData(data) {
    const threatPercent = Number(data.threat_probability || 0) * 100;
    const qberPercent = Number(data.qber || 0) * 100;
    const decision = String(data.decision || "MONITOR").toUpperCase();

    const replacePoint = (array, point) => {
        const index = array.findIndex(item => item.name === point.name);
        if (index >= 0) array[index] = point;
        else array.push(point);
    };

    replacePoint(threatQberData, {
        name: "UPLOADED DATASET",
        threat: Number(threatPercent.toFixed(2)),
        qber: Number(qberPercent.toFixed(3))
    });

    replacePoint(evidenceComparisonData, {
        name: "UPLOADED DATASET",
        threat: Number(threatPercent.toFixed(2)),
        qber: Number(qberPercent.toFixed(3))
    });

    const decisionItem = decisionDistributionData.find(
        item => item.decision === decision
    );
    if (decisionItem) decisionItem.count += 1;

    drawAllCharts();
}


async function uploadAndAnalyzeDataset() {
    if (
        !datasetState.file
    ) {
        setDatasetStatus(
            "Choose a dataset before analysis.",
            "error"
        );
        return;
    }

    datasetState.analyzing =
        true;

    document.body.classList.add(
        "dataset-analyzing"
    );

    const analyzeButton =
        getElement(
            "datasetAnalyzeButton"
        );

    if (analyzeButton) {
        analyzeButton.disabled =
            true;
    }

    setDatasetStatus(
        "Uploading dataset and running the Q-Safe model…"
    );


    try {
        const formData =
            new FormData();

        formData.append(
            "file",
            datasetState.file
        );

        formData.append(
            "analysis_mode",
            "hybrid"
        );

        /*
            These fields match the planned FastAPI upload
            route. The backend controls the actual model
            execution; the browser never computes predictions.
        */
        formData.append(
            "n_bits",
            "100"
        );

        formData.append(
            "trials",
            "10"
        );

        formData.append(
            "noise_rate",
            "0"
        );

        formData.append(
            "eve_probability",
            "0"
        );

        const response =
            await fetch(
                API_CONFIG.BASE_URL +
                API_CONFIG.UPLOAD_ENDPOINT,
                {
                    method:
                        "POST",

                    body:
                        formData
                }
            );


        if (!response.ok) {
            let detail =
                `Backend returned HTTP ${response.status}.`;

            try {
                const errorPayload =
                    await response.json();

                detail =
                    errorPayload.detail ||
                    errorPayload.message ||
                    detail;

            }
            catch (_) {
                /*
                    Keep the HTTP error if the backend
                    does not return JSON.
                */
            }

            throw new Error(
                String(detail)
            );
        }


        const payload =
            await response.json();

        const uploadResult =
            getUploadResult(
                payload
            );


        updateDashboard(
            {
                success:
                    true,

                data:
                    uploadResult.data
            }
        );


        updateDatasetResults(
            uploadResult
        );


        recordDatasetResearchData(
            uploadResult.data
        );


        setDatasetStatus(
            "Dataset analysis completed successfully.",
            "success"
        );

        const source =
            uploadResult.data
                .metadata
                .filename ||
            datasetState.file.name;

        const resultMessage =
            getElement(
                "datasetResultMessage"
            );

        if (resultMessage) {
            resultMessage.textContent =
                `${source} analyzed successfully. ` +
                `The existing Q-Safe metric cards and research charts ` +
                `now reflect this backend result.`;
        }

    }
    catch (error) {
        console.error(
            "Q-Safe dataset upload error:",
            error
        );

        setDatasetStatus(
            error.message ||
            "Dataset analysis failed.",
            "error"
        );

        const resultMessage =
            getElement(
                "datasetResultMessage"
            );

        if (resultMessage) {
            resultMessage.textContent =
                "The dataset could not be analyzed. " +
                "Check the FastAPI terminal for the backend error.";
        }
    }
    finally {
        datasetState.analyzing =
            false;

        document.body.classList.remove(
            "dataset-analyzing"
        );

        updateDatasetFileUI();
    }
}


function initializeDatasetUpload() {
    const dropzone =
        getElement(
            "datasetDropzone"
        );

    const input =
        getElement(
            "datasetFileInput"
        );

    const analyzeButton =
        getElement(
            "datasetAnalyzeButton"
        );

    const clearButton =
        getElement(
            "datasetClearButton"
        );

    if (
        !dropzone ||
        !input
    ) {
        return;
    }


    updateDatasetFileUI();


    dropzone.addEventListener(
        "click",
        () => {
            input.click();
        }
    );


    dropzone.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Enter" ||
                event.key ===
                " "
            ) {
                event.preventDefault();
                input.click();
            }
        }
    );


    input.addEventListener(
        "change",
        event => {
            const files =
                event.target.files;

            if (
                files &&
                files.length
            ) {
                setDatasetFile(
                    files[0]
                );
            }
        }
    );


    [
        "dragenter",
        "dragover"
    ].forEach(
        eventName => {
            dropzone.addEventListener(
                eventName,
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    dropzone.classList.add(
                        "dragover"
                    );
                }
            );
        }
    );


    [
        "dragleave",
        "drop"
    ].forEach(
        eventName => {
            dropzone.addEventListener(
                eventName,
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    dropzone.classList.remove(
                        "dragover"
                    );
                }
            );
        }
    );


    dropzone.addEventListener(
        "drop",
        event => {
            const files =
                event.dataTransfer.files;

            if (
                files &&
                files.length
            ) {
                setDatasetFile(
                    files[0]
                );
            }
        }
    );


    if (analyzeButton) {
        analyzeButton.addEventListener(
            "click",
            uploadAndAnalyzeDataset
        );
    }


    if (clearButton) {
        clearButton.addEventListener(
            "click",
            event => {
                event.stopPropagation();

                clearDatasetFile();
            }
        );
    }
}



/* =========================================================
   CANVAS SETUP
   ========================================================= */

function setupCanvas(
    canvas
) {

    if (!canvas) {

        return null;

    }


    const rect =
        canvas.getBoundingClientRect();


    const width =
        Math.max(
            rect.width,
            100
        );


    const height =
        Math.max(
            rect.height,
            180
        );


    const devicePixelRatio =
        window.devicePixelRatio ||
        1;


    canvas.width =
        width *
        devicePixelRatio;


    canvas.height =
        height *
        devicePixelRatio;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
    );


    return {

        canvas,
        ctx,
        width,
        height

    };

}


/* =========================================================
   CHART HELPERS
   ========================================================= */

function clearCanvas(
    ctx,
    width,
    height
) {

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

}


function drawGrid(
    ctx,
    chartWidth,
    chartHeight,
    padding,
    horizontalLines = 5
) {

    ctx.strokeStyle =
        "rgba(128, 150, 170, 0.16)";


    ctx.lineWidth =
        1;


    for (
        let i = 0;
        i <= horizontalLines;
        i++
    ) {

        const y =
            padding.top +
            (
                (
                    chartHeight -
                    padding.top -
                    padding.bottom
                )
                *
                i /
                horizontalLines
            );


        ctx.beginPath();


        ctx.moveTo(
            padding.left,
            y
        );


        ctx.lineTo(
            chartWidth -
            padding.right,
            y
        );


        ctx.stroke();

    }

}


function drawAxes(
    ctx,
    chartWidth,
    chartHeight,
    padding
) {

    ctx.strokeStyle =
        "rgba(128, 150, 170, 0.42)";


    ctx.lineWidth =
        1;


    ctx.beginPath();


    ctx.moveTo(
        padding.left,
        padding.top
    );


    ctx.lineTo(
        padding.left,
        chartHeight -
        padding.bottom
    );


    ctx.lineTo(
        chartWidth -
        padding.right,
        chartHeight -
        padding.bottom
    );


    ctx.stroke();

}


function drawText(
    ctx,
    text,
    x,
    y,
    color = "#8195ad",
    font = "11px Arial",
    align = "left"
) {

    ctx.fillStyle =
        color;


    ctx.font =
        font;


    ctx.textAlign =
        align;


    ctx.fillText(
        text,
        x,
        y
    );

}


/* =========================================================
   LINE CHART
   ========================================================= */

function drawLineChart(
    canvasId,
    data,
    xKey,
    yKey,
    xMax,
    yMax,
    xLabel,
    yLabel
) {

    const canvas =
        getElement(
            canvasId
        );


    const setup =
        setupCanvas(
            canvas
        );


    if (!setup) {

        return;

    }


    const {
        ctx,
        width,
        height
    } = setup;


    clearCanvas(
        ctx,
        width,
        height
    );


    const padding = {

        top:
            20,

        right:
            25,

        bottom:
            45,

        left:
            48

    };


    drawGrid(
        ctx,
        width,
        height,
        padding
    );


    drawAxes(
        ctx,
        width,
        height,
        padding
    );


    const chartWidth =
        width -
        padding.left -
        padding.right;


    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const value =
            yMax -
            (
                yMax *
                i /
                5
            );


        const y =
            padding.top +
            chartHeight *
            i /
            5;


        drawText(
            ctx,
            `${value.toFixed(0)}%`,
            padding.left - 9,
            y + 4,
            "#72869f",
            "10px Arial",
            "right"
        );

    }


    data.forEach(
        (point, index) => {

            const x =
                padding.left +
                (
                    chartWidth *
                    index /
                    Math.max(
                        data.length - 1,
                        1
                    )
                );


            if (
                index === 0 ||
                index === data.length - 1 ||
                index % 2 === 0
            ) {

                drawText(
                    ctx,
                    `${point[xKey]}%`,
                    x,
                    height - 18,
                    "#72869f",
                    "10px Arial",
                    "center"
                );

            }

        }
    );


    drawText(
        ctx,
        xLabel,
        width / 2,
        height - 3,
        "#9aacc1",
        "10px Arial",
        "center"
    );


    ctx.save();


    ctx.translate(
        12,
        height / 2
    );


    ctx.rotate(
        -Math.PI / 2
    );


    drawText(
        ctx,
        yLabel,
        0,
        0,
        "#9aacc1",
        "10px Arial",
        "center"
    );


    ctx.restore();


    ctx.strokeStyle =
        "#62a9ff";


    ctx.lineWidth =
        2.5;


    ctx.lineJoin =
        "round";


    ctx.lineCap =
        "round";


    ctx.beginPath();


    data.forEach(
        (point, index) => {

            const x =
                padding.left +
                (
                    chartWidth *
                    index /
                    Math.max(
                        data.length - 1,
                        1
                    )
                );


            const y =
                padding.top +
                chartHeight -
                (
                    (
                        point[yKey] /
                        yMax
                    )
                    *
                    chartHeight
                );


            if (
                index === 0
            ) {

                ctx.moveTo(
                    x,
                    y
                );

            }
            else {

                ctx.lineTo(
                    x,
                    y
                );

            }

        }
    );


    ctx.stroke();


    data.forEach(
        (point, index) => {

            const x =
                padding.left +
                (
                    chartWidth *
                    index /
                    Math.max(
                        data.length - 1,
                        1
                    )
                );


            const y =
                padding.top +
                chartHeight -
                (
                    (
                        point[yKey] /
                        yMax
                    )
                    *
                    chartHeight
                );


            ctx.fillStyle =
                "#8ac0ff";


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                3.5,
                0,
                Math.PI * 2
            );


            ctx.fill();

        }
    );

}


/* =========================================================
   QBER VS NOISE
   ========================================================= */

function drawQberNoiseChart() {

    drawLineChart(
        "qberNoiseChart",
        qberNoiseData,
        "noise",
        "qber",
        10,
        12,
        "Channel Noise",
        "QBER"
    );

}


/* =========================================================
   QBER VS EVE
   ========================================================= */

function drawQberEveChart() {

    drawLineChart(
        "qberEveChart",
        qberEveData,
        "eve",
        "qber",
        100,
        24,
        "Eavesdropper Probability",
        "QBER"
    );

}


/* =========================================================
   THREAT VS QBER
   ========================================================= */

function drawThreatQberChart() {

    const canvas =
        getElement(
            "threatQberChart"
        );


    const setup =
        setupCanvas(
            canvas
        );


    if (!setup) {

        return;

    }


    const {
        ctx,
        width,
        height
    } = setup;


    clearCanvas(
        ctx,
        width,
        height
    );


    const padding = {

        top:
            20,

        right:
            25,

        bottom:
            45,

        left:
            48

    };


    drawGrid(
        ctx,
        width,
        height,
        padding
    );


    drawAxes(
        ctx,
        width,
        height,
        padding
    );


    const chartWidth =
        width -
        padding.left -
        padding.right;


    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const value =
            100 -
            (
                100 *
                i /
                5
            );


        const y =
            padding.top +
            chartHeight *
            i /
            5;


        drawText(
            ctx,
            `${value}%`,
            padding.left - 9,
            y + 4,
            "#72869f",
            "10px Arial",
            "right"
        );

    }


    const maxQber =
        threatQberData.length
            ? Math.max(
                ...threatQberData.map(
                    point => point.qber
                )
            )
            : 10;

    const xMax =
        Math.max(
            10,
            Math.ceil(maxQber / 2) * 2
        );


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const value =
            i *
            2;


        const x =
            padding.left +
            chartWidth *
            value /
            xMax;


        drawText(
            ctx,
            `${value}%`,
            x,
            height - 18,
            "#72869f",
            "10px Arial",
            "center"
        );

    }


    drawText(
        ctx,
        "QBER",
        width / 2,
        height - 3,
        "#9aacc1",
        "10px Arial",
        "center"
    );


    ctx.save();


    ctx.translate(
        12,
        height / 2
    );


    ctx.rotate(
        -Math.PI / 2
    );


    drawText(
        ctx,
        "Threat Probability",
        0,
        0,
        "#9aacc1",
        "10px Arial",
        "center"
    );


    ctx.restore();


    threatQberData.forEach(
        point => {

            const x =
                padding.left +
                (
                    point.qber /
                    xMax
                )
                *
                chartWidth;


            const y =
                padding.top +
                chartHeight -
                (
                    point.threat /
                    100
                )
                *
                chartHeight;


            ctx.fillStyle =

                point.threat >= 75
                    ? "#e86b6b"

                    : point.qber >= 5
                        ? "#e8c75c"

                        : "#62a9ff";


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                6,
                0,
                Math.PI * 2
            );


            ctx.fill();


            drawText(
                ctx,
                point.name,
                x,
                y - 10,
                "#9fb2c8",
                "9px Arial",
                "center"
            );

        }
    );

}


/* =========================================================
   EVIDENCE COMPARISON
   ========================================================= */

function drawEvidenceComparisonChart() {

    const canvas =
        getElement(
            "evidenceComparisonChart"
        );


    const setup =
        setupCanvas(
            canvas
        );


    if (!setup) {

        return;

    }


    const {
        ctx,
        width,
        height
    } = setup;


    clearCanvas(
        ctx,
        width,
        height
    );


    const padding = {

        top:
            20,

        right:
            25,

        bottom:
            65,

        left:
            48

    };


    drawGrid(
        ctx,
        width,
        height,
        padding
    );


    drawAxes(
        ctx,
        width,
        height,
        padding
    );


    const chartWidth =
        width -
        padding.left -
        padding.right;


    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const value =
            100 -
            (
                100 *
                i /
                5
            );


        const y =
            padding.top +
            chartHeight *
            i /
            5;


        drawText(
            ctx,
            `${value}%`,
            padding.left - 9,
            y + 4,
            "#72869f",
            "10px Arial",
            "right"
        );

    }


    const groupWidth =
        chartWidth /
        evidenceComparisonData.length;


    evidenceComparisonData.forEach(
        (point, index) => {

            const centerX =
                padding.left +
                groupWidth *
                index +
                groupWidth /
                2;


            const barWidth =
                Math.min(
                    28,
                    groupWidth *
                    0.22
                );


            const threatHeight =
                (
                    point.threat /
                    100
                )
                *
                chartHeight;


            const threatY =
                padding.top +
                chartHeight -
                threatHeight;


            ctx.fillStyle =
                "#62a9ff";


            ctx.fillRect(
                centerX -
                barWidth -
                4,
                threatY,
                barWidth,
                threatHeight
            );


            const qberHeight =
                (
                    point.qber /
                    100
                )
                *
                chartHeight;


            const qberY =
                padding.top +
                chartHeight -
                qberHeight;


            ctx.fillStyle =
                "#e8c75c";


            ctx.fillRect(
                centerX + 4,
                qberY,
                barWidth,
                qberHeight
            );


            drawText(
                ctx,
                point.name,
                centerX,
                height - 28,
                "#8296ae",
                "9px Arial",
                "center"
            );

        }
    );


    ctx.fillStyle =
        "#62a9ff";


    ctx.fillRect(
        width - 170,
        10,
        10,
        10
    );


    drawText(
        ctx,
        "Threat",
        width - 154,
        19,
        "#9aacc1",
        "10px Arial"
    );


    ctx.fillStyle =
        "#e8c75c";


    ctx.fillRect(
        width - 90,
        10,
        10,
        10
    );


    drawText(
        ctx,
        "QBER",
        width - 74,
        19,
        "#9aacc1",
        "10px Arial"
    );

}


/* =========================================================
   DECISION DISTRIBUTION
   ========================================================= */

function drawDecisionDistributionChart() {

    const canvas =
        getElement(
            "decisionDistributionChart"
        );


    const setup =
        setupCanvas(
            canvas
        );


    if (!setup) {

        return;

    }


    const {
        ctx,
        width,
        height
    } = setup;


    clearCanvas(
        ctx,
        width,
        height
    );


    const padding = {

        top:
            30,

        right:
            30,

        bottom:
            45,

        left:
            55

    };


    drawGrid(
        ctx,
        width,
        height,
        padding
    );


    drawAxes(
        ctx,
        width,
        height,
        padding
    );


    const chartWidth =
        width -
        padding.left -
        padding.right;


    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    const maxObservedCount =
        decisionDistributionData.length
            ? Math.max(
                ...decisionDistributionData.map(
                    item => item.count
                )
            )
            : 0;

    const maxCount =
        Math.max(
            4,
            maxObservedCount
        );


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            padding.top +
            chartHeight -
            (
                chartHeight *
                i /
                maxCount
            );


        drawText(
            ctx,
            `${i}`,
            padding.left - 10,
            y + 4,
            "#72869f",
            "10px Arial",
            "right"
        );

    }


    const groupWidth =
        chartWidth /
        decisionDistributionData.length;


    decisionDistributionData.forEach(
        (item, index) => {

            const barWidth =
                Math.min(
                    100,
                    groupWidth *
                    0.45
                );


            const barHeight =
                (
                    item.count /
                    maxCount
                )
                *
                chartHeight;


            const x =
                padding.left +
                groupWidth *
                index +
                (
                    groupWidth -
                    barWidth
                ) /
                2;


            const y =
                padding.top +
                chartHeight -
                barHeight;


            if (
                item.decision ===
                "ACCEPT"
            ) {

                ctx.fillStyle =
                    "#67e59a";

            }
            else if (
                item.decision ===
                "MONITOR"
            ) {

                ctx.fillStyle =
                    "#e8c75c";

            }
            else {

                ctx.fillStyle =
                    "#e86b6b";

            }


            ctx.fillRect(
                x,
                y,
                barWidth,
                barHeight
            );


            drawText(
                ctx,
                `${item.count}`,
                x +
                barWidth / 2,
                y - 8,
                "#dce6f2",
                "12px Arial",
                "center"
            );


            drawText(
                ctx,
                item.decision,
                x +
                barWidth / 2,
                height - 18,
                "#8296ae",
                "10px Arial",
                "center"
            );

        }
    );

}


/* =========================================================
   ALL CHARTS
   ========================================================= */

function drawAllCharts() {

    drawQberNoiseChart();

    drawQberEveChart();

    drawThreatQberChart();

    drawEvidenceComparisonChart();

    drawDecisionDistributionChart();

}


/* =========================================================
   RESIZE
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            window.qsafeResizeTimer
        );


        window.qsafeResizeTimer =
            setTimeout(
                () => {

                    drawAllCharts();

                },
                120
            );

    }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeTheme();

        initializeDatasetUpload();

        initializeLiveThreatLab();

        runScenario(
            "normal"
        );


        setTimeout(
            () => {

                drawAllCharts();

            },
            100
        );

    }
);