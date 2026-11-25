# Hermit voice interaction

Voice is an input/output shell for Hermit, not a separate assistant and not an authority channel.

## Experience

The Pages shell now demonstrates:

- Speech synthesis through the browser's native speech engine, with voice selection, rate/pitch bounds, and cancellation.
- Optional streaming speech recognition when the browser exposes `SpeechRecognition` or `webkitSpeechRecognition`.
- Interim and final transcript handling, explicit stop/cancel, and clear unsupported/permission/no-speech outcomes.
- A typed request fallback so the interaction remains usable without microphone recognition.
- A small deterministic fixture grammar: inspect an object, request moving an object to the workbench, or ask “What can you do?” / “How can I?” for capability discovery.
- A capability explanation generated from the browser shell's validated host-provided catalog; it describes read-only inspection versus approval-gated movement and gives example phrases without invoking either action.
- Automatic invocation only for the fixture's read-only inspection action. A world-changing move is surfaced as an approval request and still requires the host's explicit approval control.

The demo grammar is intentionally narrow. It does not pretend to understand arbitrary natural-language questions or invoke a live language model. Capability discovery reads the browser shell's declarative fixture catalog and is limited to its two registered interactions, not a claim that Hermit has access to capabilities outside this fixture. Voice action parsing also checks that the active shell advertises the requested capability; an unavailable action fails closed, and catalog risk/approval metadata prevents automatic execution of gated actions.

## Architecture

| Component | Responsibility |
|---|---|
| `src/voice.js` | Host-neutral speech output, streaming recognition, cancellation/error contracts, and deterministic fixture intent parsing |
| `assets/hermit-voice.js` | Browser feature detection, voice controls, transcript display, typed fallback, and routing into the existing playground and shell-provided catalog |
| `src/capability-catalog.js` / `src/playground-capabilities.js` | Bounded catalog validation and the browser fixture's declared capabilities |
| Browser speech synthesis | Produces audible Hermit responses using voices installed by the browser/operating system |
| Browser speech recognition | Optional recognition provider; support and behavior vary by browser and operating system |
| Existing Hermit runtime | Validates and executes the selected capability under host policy, approval, and verification |

The core module does not read browser globals. A host injects a synthesis engine and utterance constructor, or a recognition factory. That keeps the contract open to a desktop-local recognizer, a local Whisper process, a remote host service, or another provider without changing Hermit's intent and policy model.

## Recognition quality and provider strategy

The Web Speech API is a convenient browser adapter, not the quality target. Some browsers do not expose recognition at all; others may use operating-system or network-backed services whose behavior is outside this repository's control. The Pages experience feature-detects support and leaves the typed path available.

For a dependable desktop experience, the next recognizer should be evaluated as a host adapter, with local Whisper-class transcription as a strong candidate. It should be tested against a repeatable Workshop command corpus covering object names, accents, room noise, interruptions, partial corrections, and domain vocabulary. Compare word error rate, command/intent accuracy, latency, cancellation behavior, and offline operation. Do not select a provider based on one successful demo.

## Trust boundary

Audio and transcripts are untrusted user input. Recognition proposes text; intent parsing proposes a capability; the existing Hermit runtime and host remain responsible for policy, approval, bounded execution, and verification. A recognized phrase cannot grant permission, bypass a confirmation, or authorize access to a host capability.

The Pages fixture can inspect a known object through its read-only capability. Moving an object changes the simulated world and therefore remains behind the explicit approval control. A transcript is never interpreted as approval.

## Current status

Implemented and testable: provider-neutral synthesis and recognition adapters, cancellation/error handling, browser speech output, optional browser recognition, transcript display, typed fallback, and a narrow fixture intent grammar.

Not implemented: a production-grade local recognizer, acoustic model, audio upload/service, live LLM intent understanding, AnyApp microphone integration, persistent voice preferences, wake-word detection, or continuous background listening.
