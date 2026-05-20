# Use AskUserQuestion (AUQ) Tool

Before using AUQ:

- Analysis confirm user suggestion? → Skip AUQ, just execute
- Decision low-risk or easy to reverse? → Skip AUQ, decide + execute
- Will questions require discussion → Skip AUQ, use review pattern (HR+H2+context+HR+"Anything else or **done** to continue" → repeat until "done")
- Many related questions in logical groups → Use progressive approval (group Qs with 3-5 word summary of nested Qs, "Approve all"/"Review individually")

Always group questions, excluding sequential dependencies. One decision per question.

PRE-SUBMIT GATE:

- MUST invoke via AskUserQuestion tool (NOT prose)
- NO console preamble — AUQ hides it; pack detail into question + options
- Each Q+option standalone: cold reader can name the decision and pick
- No content repeated between question and answers
- Write for **Distilled Excellence**: highest signal per character

Format plain text (no markdown): Questions <100 words
Options are mutually-exclusive paths user can pick: diff directions/scopes/sequencing. Descriptions MUST clarify diff enough to compare w/o external lookup. If only 1 option, propose up to 3 valid alternatives that meet success criteria (1 safe/low risk, 1 high risk/reward, 1 creative/non-obvious). Mark 1 "(Recommended)" if confident, "(Suggested)" if under-informed; offer to research more if needed.
