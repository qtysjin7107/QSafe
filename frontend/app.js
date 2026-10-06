/* =========================================
   Q-SAFE DEMO SCENARIOS
========================================= */

const scenarios = {

    normal: {

        threatProbability: 0.08,

        qber: 0.008,

        noiseRate: 0.003,

        eveDetected: false,

        decision: "ACCEPT",

        reason:
            "Network and quantum-channel evidence indicate a normal secure channel."

    },


    noise: {

        threatProbability: 0.10,

        qber: 0.041,

        noiseRate: 0.035,

        eveDetected: false,

        decision: "MONITOR",

        reason:
            "Elevated QBER is consistent with channel noise, but the channel should be monitored."

    },


    network: {

        threatProbability: 0.91,

        qber: 0.012,

        noiseRate: 0.004,

        eveDetected: false,

        decision: "MONITOR",

        reason:
            "High network threat detected, but the quantum channel currently appears stable."

    },


    eve: {

        threatProbability: 0.12,

        qber: 0.063,

        noiseRate: 0.008,

        eveDetected: true,

        decision: "MONITOR",

        reason:
            "Quantum-channel errors are elevated, but classical network evidence is weak."

    },


    combined: {

        threatProbability: 0.93,

        qber: 0.067,

        noiseRate: 0.018,

        eveDetected: true,

        decision: "REJECT",

        reason:
            "High network threat combined with elevated quantum-channel error indicates a likely compromise."

    }

};


/* =========================================
   RUN SCENARIO
========================================= */

function runScenario(name) {

    const data = scenarios[name];

    if (!data) {
        return;
    }


    /* =========================
       THREAT PROBABILITY
    ========================== */

    document.getElementById(
        "threatProbability"
    ).textContent =
        (data.threatProbability * 100).toFixed(1) + "%";


    /* =========================
       THREAT STATUS
    ========================== */

    const threatStatus =
        document.getElementById(
            "threatStatus"
        );


    if (data.threatProbability >= 0.7) {

        threatStatus.textContent =
            "HIGH RISK";

    } else if (data.threatProbability >= 0.3) {

        threatStatus.textContent =
            "MEDIUM RISK";

    } else {

        threatStatus.textContent =
            "LOW RISK";
    }


    /* =========================
       QBER
    ========================== */

    document.getElementById(
        "qber"
    ).textContent =
        (data.qber * 100).toFixed(1) + "%";


    document.getElementById(
        "quantumQber"
    ).textContent =
        (data.qber * 100).toFixed(1) + "%";


    /* =========================
       CHANNEL NOISE
    ========================== */

    document.getElementById(
        "noise"
    ).textContent =
        (data.noiseRate * 100).toFixed(1) + "%";


    /* =========================
       EAVESDROPPER
    ========================== */

    document.getElementById(
        "eve"
    ).textContent =
        data.eveDetected
            ? "DETECTED"
            : "NOT DETECTED";


    /* =========================
       SECURITY DECISION
    ========================== */

    document.getElementById(
        "decision"
    ).textContent =
        data.decision;


    document.getElementById(
        "decisionReason"
    ).textContent =
        data.reason;


    /* =========================
       QUANTUM CHANNEL STATUS
    ========================== */

    const channelStatus =
        document.getElementById(
            "channelStatus"
        );


    if (name === "normal") {

        channelStatus.textContent =
            "SECURE";

    } else if (name === "noise") {

        channelStatus.textContent =
            "NOISY";

    } else if (name === "network") {

        channelStatus.textContent =
            "SECURE / THREAT";

    } else if (name === "eve") {

        channelStatus.textContent =
            "COMPROMISED";

    } else if (name === "combined") {

        channelStatus.textContent =
            "COMPROMISED";
    }


    /* =========================
       QUANTUM CHANNEL COLOR
    ========================== */

    const quantumConnection =
        document.getElementById(
            "quantumConnection"
        );


    const connectionLine =
        quantumConnection.querySelector(
            "span"
        );


    if (
        name === "normal" ||
        name === "network"
    ) {

        connectionLine.style.background =
            "#35d07f";

        connectionLine.style.boxShadow =
            "0 0 12px #35d07f";


        quantumConnection.classList.remove(
            "noisy",
            "compromised"
        );

        quantumConnection.classList.add(
            "secure"
        );


    } else if (name === "noise") {

        connectionLine.style.background =
            "#f0b429";

        connectionLine.style.boxShadow =
            "0 0 12px #f0b429";


        quantumConnection.classList.remove(
            "secure",
            "compromised"
        );

        quantumConnection.classList.add(
            "noisy"
        );


    } else {

        connectionLine.style.background =
            "#ff4d5d";

        connectionLine.style.boxShadow =
            "0 0 12px #ff4d5d";


        quantumConnection.classList.remove(
            "secure",
            "noisy"
        );

        quantumConnection.classList.add(
            "compromised"
        );
    }


    /* =========================
       SECURITY ANALYSIS
    ========================== */

    const networkEvidence =
        document.getElementById(
            "networkEvidence"
        );


    if (data.threatProbability >= 0.7) {

        networkEvidence.textContent =
            "HIGH THREAT";

    } else if (
        data.threatProbability >= 0.3
    ) {

        networkEvidence.textContent =
            "MEDIUM THREAT";

    } else {

        networkEvidence.textContent =
            "LOW THREAT";
    }


    const quantumEvidence =
        document.getElementById(
            "quantumEvidence"
        );


    if (data.qber >= 0.05) {

        quantumEvidence.textContent =
            "ELEVATED QBER";

    } else if (data.qber >= 0.02) {

        quantumEvidence.textContent =
            "MODERATE QBER";

    } else {

        quantumEvidence.textContent =
            "NORMAL";
    }


    document.getElementById(
        "analysisChannel"
    ).textContent =
        channelStatus.textContent;


    /* =========================
       ANALYSIS BADGE
    ========================== */

    const analysisBadge =
        document.getElementById(
            "analysisBadge"
        );


    if (data.decision === "ACCEPT") {

        analysisBadge.textContent =
            "SECURE";

    } else if (data.decision === "MONITOR") {

        analysisBadge.textContent =
            "MONITOR";

    } else {

        analysisBadge.textContent =
            "CRITICAL";
    }

}


/* =========================================
   INITIAL STATE
========================================= */

runScenario("normal");