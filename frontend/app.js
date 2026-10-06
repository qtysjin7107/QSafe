/*
    Q-Safe Frontend

    IMPORTANT:
    The values below are currently MOCK / DEMO values.

    Later:
    - Person 1 -> real Qiskit BB84 results
    - Person 2 -> real NSL-KDD threat probability
    - Backend -> FastAPI integration

    This file is responsible only for frontend visualization.
*/


/* =========================================================
   SCENARIO DATA
   ========================================================= */

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


/* =========================================================
   RESEARCH DATA
   ========================================================= */

/*
    Mock experiment:
    QBER as channel noise increases.
*/

const qberNoiseData = [
    { noise: 0, qber: 0.8 },
    { noise: 1, qber: 1.4 },
    { noise: 2, qber: 2.3 },
    { noise: 3, qber: 3.2 },
    { noise: 4, qber: 4.1 },
    { noise: 5, qber: 5.3 },
    { noise: 6, qber: 6.1 },
    { noise: 7, qber: 7.0 },
    { noise: 8, qber: 8.2 },
    { noise: 10, qber: 10.1 }
];


/*
    Mock experiment:
    QBER as eavesdropper interception probability increases.
*/

const qberEveData = [
    { eve: 0, qber: 0.8 },
    { eve: 10, qber: 2.1 },
    { eve: 20, qber: 4.3 },
    { eve: 30, qber: 6.4 },
    { eve: 40, qber: 8.1 },
    { eve: 50, qber: 10.2 },
    { eve: 60, qber: 12.4 },
    { eve: 70, qber: 14.8 },
    { eve: 80, qber: 17.0 },
    { eve: 90, qber: 19.2 },
    { eve: 100, qber: 21.0 }
];


/*
    Threat probability vs QBER.

    This uses the five demo scenarios.
*/

const threatQberData = [
    {
        name: "Normal",
        threat: 8,
        qber: 0.8
    },
    {
        name: "Noise",
        threat: 10,
        qber: 4.1
    },
    {
        name: "Network Attack",
        threat: 91,
        qber: 1.2
    },
    {
        name: "Eavesdropper",
        threat: 12,
        qber: 6.3
    },
    {
        name: "Combined Attack",
        threat: 93,
        qber: 6.7
    }
];


/*
    Classical evidence vs quantum evidence.

    QBER is converted into a percentage so that
    both values can be compared visually.
*/

const evidenceComparisonData = [
    {
        name: "Normal",
        threat: 8,
        qber: 0.8
    },
    {
        name: "Noise",
        threat: 10,
        qber: 4.1
    },
    {
        name: "Network Attack",
        threat: 91,
        qber: 1.2
    },
    {
        name: "Eavesdropper",
        threat: 12,
        qber: 6.3
    },
    {
        name: "Combined Attack",
        threat: 93,
        qber: 6.7
    }
];


/*
    Security decision distribution.

    Current demo has:
    ACCEPT  = 1
    MONITOR = 3
    REJECT  = 1
*/

const decisionDistributionData = [
    {
        decision: "ACCEPT",
        count: 1
    },
    {
        decision: "MONITOR",
        count: 3
    },
    {
        decision: "REJECT",
        count: 1
    }
];


/* =========================================================
   DOM HELPERS
   ========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


/* =========================================================
   SCENARIO UPDATE
   ========================================================= */

function runScenario(name) {

    const scenario = scenarios[name];

    if (!scenario) {
        return;
    }


    /* ---------- Metrics ---------- */

    getElement("threatProbability").textContent =
        `${(scenario.threatProbability * 100).toFixed(1)}%`;

    getElement("qber").textContent =
        `${(scenario.qber * 100).toFixed(1)}%`;

    getElement("noise").textContent =
        `${(scenario.noiseRate * 100).toFixed(1)}%`;


    /* ---------- Eavesdropper ---------- */

    getElement("eve").textContent =
        scenario.eveDetected
            ? "DETECTED"
            : "NOT DETECTED";


    /* ---------- Threat Status ---------- */

    let threatStatus = "LOW RISK";

    if (scenario.threatProbability >= 0.75) {
        threatStatus = "HIGH RISK";
    }
    else if (scenario.threatProbability >= 0.30) {
        threatStatus = "MEDIUM RISK";
    }

    getElement("threatStatus").textContent = threatStatus;


    /* ---------- Decision ---------- */

    getElement("decision").textContent =
        scenario.decision;

    getElement("decisionReason").textContent =
        scenario.reason;


    /* ---------- Quantum Section ---------- */

    getElement("quantumQber").textContent =
        `${(scenario.qber * 100).toFixed(1)}%`;


    /*
        Sifted key is currently a frontend approximation.
        It will later come from the actual Qiskit experiment.
    */

    const siftedKey =
        Math.round(1000 * 0.493);

    getElement("siftedKey").textContent =
        `${siftedKey} bits`;


    /* ---------- Channel State ---------- */

    const connection =
        getElement("quantumConnection");

    const connectionLine =
        connection.querySelector(".connection-line");

    const channelStatus =
        getElement("channelStatus");

    let channelText = "SECURE";
    let channelColor = "#4ee39a";


    if (scenario.decision === "MONITOR") {
        channelText = "MONITOR";
        channelColor = "#e8c75c";
    }

    if (scenario.decision === "REJECT") {
        channelText = "COMPROMISED";
        channelColor = "#e86b6b";
    }


    channelStatus.textContent = channelText;
    channelStatus.style.color = channelColor;

    connectionLine.style.background = channelColor;
    connectionLine.style.boxShadow =
        `0 0 12px ${channelColor}`;


    /* ---------- Decision Color ---------- */

    const decisionCard =
        getElement("decisionCard");

    if (scenario.decision === "ACCEPT") {

        decisionCard.style.borderColor = "#28543e";

        getElement("decision").style.color =
            "#67e59a";

    }
    else if (scenario.decision === "MONITOR") {

        decisionCard.style.borderColor = "#66592a";

        getElement("decision").style.color =
            "#e8c75c";

    }
    else {

        decisionCard.style.borderColor = "#633535";

        getElement("decision").style.color =
            "#e86b6b";
    }


    /* ---------- Security Analysis ---------- */

    let networkEvidence = "LOW THREAT";

    if (scenario.threatProbability >= 0.75) {
        networkEvidence = "HIGH THREAT";
    }
    else if (scenario.threatProbability >= 0.30) {
        networkEvidence = "MEDIUM THREAT";
    }


    let quantumEvidence = "NORMAL";

    if (scenario.qber >= 0.05) {
        quantumEvidence = "HIGH ERROR";
    }
    else if (scenario.qber >= 0.03) {
        quantumEvidence = "ELEVATED ERROR";
    }


    getElement("networkEvidence").textContent =
        networkEvidence;

    getElement("quantumEvidence").textContent =
        quantumEvidence;

    getElement("analysisChannel").textContent =
        channelText;


    /* ---------- Analysis Badge ---------- */

    let badgeText = "NORMAL";

    if (scenario.decision === "MONITOR") {
        badgeText = "MONITOR";
    }

    if (scenario.decision === "REJECT") {
        badgeText = "CRITICAL";
    }

    getElement("analysisBadge").textContent =
        badgeText;


    /* ---------- Active Button ---------- */

    document
        .querySelectorAll(".scenario-button")
        .forEach(button => {
            button.classList.remove("active");
        });


    const buttons =
        document.querySelectorAll(".scenario-button");

    buttons.forEach(button => {

        const text =
            button.textContent.trim().toLowerCase();

        if (
            (name === "normal" && text === "normal") ||
            (name === "noise" && text === "channel noise") ||
            (name === "network" && text === "network attack") ||
            (name === "eve" && text === "eavesdropper") ||
            (name === "combined" && text === "combined attack")
        ) {
            button.classList.add("active");
        }

    });

}


/* =========================================================
   CANVAS SETUP
   ========================================================= */

function setupCanvas(canvas) {

    if (!canvas) {
        return null;
    }

    const rect =
        canvas.getBoundingClientRect();

    const width =
        Math.max(rect.width, 100);

    const height =
        Math.max(rect.height, 180);

    const devicePixelRatio =
        window.devicePixelRatio || 1;

    canvas.width =
        width * devicePixelRatio;

    canvas.height =
        height * devicePixelRatio;

    const ctx =
        canvas.getContext("2d");

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
   COMMON CHART HELPERS
   ========================================================= */

function clearCanvas(ctx, width, height) {

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

    ctx.strokeStyle = "#1a2b40";
    ctx.lineWidth = 1;

    for (let i = 0; i <= horizontalLines; i++) {

        const y =
            padding.top +
            (
                (chartHeight - padding.top - padding.bottom)
                * i
                / horizontalLines
            );

        ctx.beginPath();

        ctx.moveTo(
            padding.left,
            y
        );

        ctx.lineTo(
            chartWidth - padding.right,
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

    ctx.strokeStyle = "#42566e";
    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(
        padding.left,
        padding.top
    );

    ctx.lineTo(
        padding.left,
        chartHeight - padding.bottom
    );

    ctx.lineTo(
        chartWidth - padding.right,
        chartHeight - padding.bottom
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

    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
}


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
        getElement(canvasId);

    const setup =
        setupCanvas(canvas);

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
        top: 20,
        right: 25,
        bottom: 45,
        left: 48
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


    /* ---------- Y Labels ---------- */

    for (let i = 0; i <= 5; i++) {

        const value =
            yMax -
            (yMax * i / 5);

        const y =
            padding.top +
            chartHeight * i / 5;

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


    /* ---------- X Labels ---------- */

    data.forEach((point, index) => {

        const x =
            padding.left +
            (
                chartWidth *
                index /
                Math.max(data.length - 1, 1)
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

    });


    /* ---------- Axis Labels ---------- */

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

    ctx.rotate(-Math.PI / 2);

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


    /* ---------- Line ---------- */

    ctx.strokeStyle = "#62a9ff";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();

    data.forEach((point, index) => {

        const x =
            padding.left +
            (
                chartWidth *
                index /
                Math.max(data.length - 1, 1)
            );

        const y =
            padding.top +
            chartHeight -
            (
                (point[yKey] / yMax) *
                chartHeight
            );

        if (index === 0) {
            ctx.moveTo(x, y);
        }
        else {
            ctx.lineTo(x, y);
        }

    });

    ctx.stroke();


    /* ---------- Points ---------- */

    data.forEach((point, index) => {

        const x =
            padding.left +
            (
                chartWidth *
                index /
                Math.max(data.length - 1, 1)
            );

        const y =
            padding.top +
            chartHeight -
            (
                (point[yKey] / yMax) *
                chartHeight
            );

        ctx.fillStyle = "#8ac0ff";

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            3.5,
            0,
            Math.PI * 2
        );

        ctx.fill();

    });

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
   QBER VS EAVESDROPPER
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
   THREAT PROBABILITY VS QBER
   ========================================================= */

function drawThreatQberChart() {

    const canvas =
        getElement("threatQberChart");

    const setup =
        setupCanvas(canvas);

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
        top: 20,
        right: 25,
        bottom: 45,
        left: 48
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


    /* Y axis */

    for (let i = 0; i <= 5; i++) {

        const value =
            100 -
            (100 * i / 5);

        const y =
            padding.top +
            chartHeight * i / 5;

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


    /* X axis */

    const xMax = 8;

    for (let i = 0; i <= 4; i++) {

        const value =
            i * 2;

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

    ctx.rotate(-Math.PI / 2);

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


    /* ---------- Points ---------- */

    threatQberData.forEach(point => {

        const x =
            padding.left +
            (
                point.qber /
                xMax
            ) *
            chartWidth;

        const y =
            padding.top +
            chartHeight -
            (
                point.threat /
                100
            ) *
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

    });

}


/* =========================================================
   THREAT VS QUANTUM EVIDENCE
   ========================================================= */

function drawEvidenceComparisonChart() {

    const canvas =
        getElement("evidenceComparisonChart");

    const setup =
        setupCanvas(canvas);

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
        top: 20,
        right: 25,
        bottom: 65,
        left: 48
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


    /* Y labels */

    for (let i = 0; i <= 5; i++) {

        const value =
            100 -
            (100 * i / 5);

        const y =
            padding.top +
            chartHeight * i / 5;

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
                groupWidth * index +
                groupWidth / 2;


            const barWidth =
                Math.min(
                    28,
                    groupWidth * 0.22
                );


            /* Threat bar */

            const threatHeight =
                (
                    point.threat /
                    100
                ) *
                chartHeight;

            const threatY =
                padding.top +
                chartHeight -
                threatHeight;


            ctx.fillStyle = "#62a9ff";

            ctx.fillRect(
                centerX - barWidth - 4,
                threatY,
                barWidth,
                threatHeight
            );


            /* QBER bar */

            const qberHeight =
                (
                    point.qber /
                    100
                ) *
                chartHeight;

            const qberY =
                padding.top +
                chartHeight -
                qberHeight;


            ctx.fillStyle = "#e8c75c";

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


    /* Legend */

    ctx.fillStyle = "#62a9ff";

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


    ctx.fillStyle = "#e8c75c";

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
   SECURITY DECISION DISTRIBUTION
   ========================================================= */

function drawDecisionDistributionChart() {

    const canvas =
        getElement("decisionDistributionChart");

    const setup =
        setupCanvas(canvas);

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
        top: 30,
        right: 30,
        bottom: 45,
        left: 55
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


    const maxCount = 4;


    /* Y labels */

    for (let i = 0; i <= 4; i++) {

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
                    groupWidth * 0.45
                );


            const barHeight =
                (
                    item.count /
                    maxCount
                ) *
                chartHeight;


            const x =
                padding.left +
                groupWidth * index +
                (
                    groupWidth -
                    barWidth
                ) / 2;


            const y =
                padding.top +
                chartHeight -
                barHeight;


            if (item.decision === "ACCEPT") {
                ctx.fillStyle = "#67e59a";
            }
            else if (item.decision === "MONITOR") {
                ctx.fillStyle = "#e8c75c";
            }
            else {
                ctx.fillStyle = "#e86b6b";
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
                x + barWidth / 2,
                y - 8,
                "#dce6f2",
                "12px Arial",
                "center"
            );


            drawText(
                ctx,
                item.decision,
                x + barWidth / 2,
                height - 18,
                "#8296ae",
                "10px Arial",
                "center"
            );

        }
    );

}


/* =========================================================
   DRAW ALL GRAPHS
   ========================================================= */

function drawAllCharts() {

    drawQberNoiseChart();

    drawQberEveChart();

    drawThreatQberChart();

    drawEvidenceComparisonChart();

    drawDecisionDistributionChart();

}


/* =========================================================
   WINDOW RESIZE
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        clearTimeout(window.qsafeResizeTimer);

        window.qsafeResizeTimer =
            setTimeout(() => {

                drawAllCharts();

            }, 120);

    }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        runScenario("normal");

        /*
            Small delay ensures the browser has completed
            layout calculations before canvas dimensions
            are calculated.
        */

        setTimeout(() => {

            drawAllCharts();

        }, 100);

    }
);