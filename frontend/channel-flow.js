/*
    Q-Safe Quantum Channel Flow
    ----------------------------

    Visual-only layer.

    It watches the existing Q-Safe channel status and
    automatically changes the animated particles:

        ACCEPT  -> green arrows
        MONITOR -> orange warning signs
        REJECT  -> red skulls

    Direction:
        Hospital A -> Cloud

    The particles use a sinusoidal vertical motion to
    create a projected helix-like path around the channel.
*/


const CHANNEL_FLOW_CONFIG = {

    particleCount: 7,

    /*
        Smaller value = faster movement.
    */
    duration: 4.2,

    assets: {

        secure:
            "assets/arrow.png",

        monitor:
            "assets/warning.png",

        reject:
            "assets/skull.png"

    }

};


let channelFlowState = "secure";

let channelFlowParticles = [];

let channelFlowAnimationId = null;

let channelFlowLastTime = 0;


/* =========================================================
   ELEMENTS
   ========================================================= */

function getFlowElements() {

    return {

        connection:
            document.getElementById(
                "quantumConnection"
            ),

        track:
            document.getElementById(
                "flowTrack"
            ),

        status:
            document.getElementById(
                "channelStatus"
            )

    };

}


/* =========================================================
   STATE
   ========================================================= */

function determineFlowState(statusText) {

    const status =
        statusText
            .trim()
            .toUpperCase();


    if (
        status === "COMPROMISED" ||
        status === "REJECT" ||
        status === "CRITICAL"
    ) {

        return "reject";

    }


    if (
        status === "MONITOR" ||
        status === "ELEVATED"
    ) {

        return "monitor";

    }


    return "secure";

}


/* =========================================================
   CREATE PARTICLES
   ========================================================= */

function createFlowParticles() {

    const {
        track
    } = getFlowElements();


    if (!track) {
        return;
    }


    track.innerHTML = "";

    channelFlowParticles = [];


    for (
        let i = 0;
        i < CHANNEL_FLOW_CONFIG.particleCount;
        i++
    ) {

        const particle =
            document.createElement("img");


        particle.className =
            "flow-particle";


        particle.draggable =
            false;


        particle.alt =
            "";


        /*
            Slightly different sizes create depth.
        */

        const depth =
            0.75 +
            Math.random() *
            0.4;


        particle.style.width =
            `${24 * depth}px`;


        particle.style.height =
            `${24 * depth}px`;


        /*
            Each particle receives a different phase.
        */

        const phase =
            (
                i /
                CHANNEL_FLOW_CONFIG.particleCount
            );


        /*
            Randomized helix amplitude.
        */

        const amplitude =
            7 +
            Math.random() * 7;


        /*
            Randomized vertical phase.
        */

        const verticalPhase =
            Math.random() *
            Math.PI *
            2;


        /*
            Each particle moves at a slightly
            different speed.
        */

        const speed =
            0.82 +
            Math.random() *
            0.25;


        particle._flow = {

            progress:
                phase,

            amplitude:
                amplitude,

            verticalPhase:
                verticalPhase,

            speed:
                speed,

            depth:
                depth,

            spin:
                Math.random() > 0.5
                    ? 1
                    : -1

        };


        track.appendChild(
            particle
        );


        channelFlowParticles.push(
            particle
        );

    }


    updateParticleImages();

}


/* =========================================================
   CHANGE IMAGE TYPE
   ========================================================= */

function updateParticleImages() {

    const asset =
        CHANNEL_FLOW_CONFIG.assets[
            channelFlowState
        ];


    channelFlowParticles.forEach(
        particle => {

            particle.src =
                asset;

        }
    );


    const {
        connection
    } = getFlowElements();


    if (connection) {

        connection.dataset.flowState =
            channelFlowState;

    }

}


/* =========================================================
   ANIMATION
   ========================================================= */

function animateFlow(timestamp) {

    if (!channelFlowLastTime) {

        channelFlowLastTime =
            timestamp;

    }


    const delta =
        timestamp -
        channelFlowLastTime;


    channelFlowLastTime =
        timestamp;


    const {
        track
    } = getFlowElements();


    if (!track) {
        return;
    }


    const width =
        track.clientWidth;


    if (width <= 0) {

        channelFlowAnimationId =
            requestAnimationFrame(
                animateFlow
            );

        return;

    }


    channelFlowParticles.forEach(
        particle => {

            const flow =
                particle._flow;


            /*
                Move left -> right.

                progress loops from 0 to 1.
            */

            flow.progress +=
                (
                    delta /
                    (
                        CHANNEL_FLOW_CONFIG.duration *
                        1000
                    )
                ) *
                flow.speed;


            if (
                flow.progress >= 1
            ) {

                flow.progress -= 1;

            }


            const progress =
                flow.progress;


            /*
                Horizontal position.
            */

            const x =
                (
                    progress *
                    (
                        width +
                        55
                    )
                ) -
                28;


            /*
                Helix projection.

                The sine wave makes the particle
                move above and below the central
                channel line.

                This gives the visual impression
                of particles orbiting the channel.
            */

            const angle =
                (
                    progress *
                    Math.PI *
                    4
                ) +
                flow.verticalPhase;


            const y =
                Math.sin(angle) *
                flow.amplitude;


            /*
                Depth simulation.

                When the particle is visually closer,
                it becomes slightly larger/brighter.

                When it is behind the channel,
                it becomes slightly smaller/dimmer.
            */

            const depth =
                (
                    Math.sin(angle) +
                    1
                ) /
                2;


            const scale =
                0.72 +
                depth *
                0.42;


            const opacity =
                0.58 +
                depth *
                0.42;


            /*
                Slight rotation follows the
                helix movement.
            */

            const rotation =
                Math.cos(angle) *
                14;


            particle.style.opacity =
                opacity;


            particle.style.transform =
                `translate3d(${x}px, ${y}px, 0)
                 translate(-50%, -50%)
                 rotate(${rotation}deg)
                 scale(${scale})`;

        }
    );


    channelFlowAnimationId =
        requestAnimationFrame(
            animateFlow
        );

}


/* =========================================================
   SET STATE
   ========================================================= */

function setChannelFlowState(
    state
) {

    if (
        ![
            "secure",
            "monitor",
            "reject"
        ].includes(state)
    ) {

        state =
            "secure";

    }


    if (
        channelFlowState === state &&
        channelFlowParticles.length > 0
    ) {

        return;

    }


    channelFlowState =
        state;


    updateParticleImages();

}


/* =========================================================
   WATCH EXISTING APP
   ========================================================= */

/*
    Your existing app.js changes:

        channelStatus.textContent = "SECURE"
        channelStatus.textContent = "MONITOR"
        channelStatus.textContent = "COMPROMISED"

    We watch that existing element.

    Therefore app.js does NOT need to know about
    this animation.
*/

function watchChannelStatus() {

    const {
        status
    } = getFlowElements();


    if (!status) {
        return;
    }


    const observer =
        new MutationObserver(
            () => {

                const newState =
                    determineFlowState(
                        status.textContent
                    );


                setChannelFlowState(
                    newState
                );

            }
        );


    observer.observe(
        status,
        {
            childList: true,
            characterData: true,
            subtree: true
        }
    );


    /*
        Initialize from current status.
    */

    setChannelFlowState(
        determineFlowState(
            status.textContent
        )
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        createFlowParticles();

        watchChannelStatus();

        channelFlowAnimationId =
            requestAnimationFrame(
                animateFlow
            );

    }
);