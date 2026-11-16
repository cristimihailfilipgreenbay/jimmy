# Guardrails use a prompted classifier on an allowed model

The plan was NeMo Guardrails with the multilingual Nemotron safety model on Student input, and Llama Prompt Guard 2 on retrieved and web text. The spike (issue #8, 2026-11-16) found:

- `nvidia/nemotron-3.5-content-safety` and `openai/gpt-oss-safeguard-20b` are listed on OpenRouter but blocked by this account's workspace guardrail (`404 model-ignored-by-guardrail`). The account's allowed models include no dedicated safety model.
- Llama Prompt Guard 2 is not on OpenRouter. Its weights are gated on Hugging Face and need torch and transformers in the backend image.
- `nemoguardrails` installs on Python 3.13, but its Colang runtime adds about 40 dependencies for what is one classifier call here.

Decision: one cheap, allowed model (`GUARD_MODEL`, else `BACKGROUND_MODEL`) acts as a prompted classifier for three checks, in `backend/app/guardrails/`:

- **Input guard and scope check:** one call per Student message returns `ok`, `harmful`, `injection` or `off_topic` (with a redirect reply in the Student's language). `harmful` and `injection` return `429 guardrail_blocked`; `off_topic` gets a friendly assistant reply and no Tutor run.
- **Injection scan:** passages from Notes and web results are scanned in one call per search; a flagged passage is withheld from the Tutor and cannot be cited. The Subject Library is trusted and not scanned.
- A list of known injection phrases (English, German, French, Spanish, Romanian) runs first, for free, on both.

Considered: Prompt Guard 2 locally (matches the plan, but adds about 2 GB and a licence step); NeMo Guardrails (more moving parts for the same result); regex only (easy to evade).

Consequences: a classifier that cannot be reached fails open and logs a warning, because Jimmy is a local study tool and the Tutor's prompt still treats passages as data. A prompted general model is weaker than a dedicated safety model; the evaluation set (#17) should include injection and off-topic cases. Promotion (#9) must run the same scan on a Finding before it is stored. If the workspace later allows Nemotron, set `GUARD_MODEL` and compare.
