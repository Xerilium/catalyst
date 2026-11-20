# Explore: ACP (Agent Client Protocol) for ai-providers

Draft for review. No specs changed by this doc. One small spike follows it (see [Spike](#spike)).

**Prompted by**: Backlog task "Update Catalyst to support ACP for ai-providers."

**Key finding**: Base ACP support already shipped in [157](https://github.com/Xerilium/catalyst/pull/157) (`acp` provider, `FR:ai-provider/acp.*`). The task is now a gap list, not a greenfield build. Recommendation: close the gaps in three small phases. Do not add an SDK dependency.

## What ACP is

- Open JSON-RPC 2.0 protocol between a **client** (editor, IDE, or tool) and an **agent** (AI coding agent). The agent runs as a subprocess of the client. Spec: [agentclientprotocol.com](https://agentclientprotocol.com).
- Transport in practice: newline-delimited JSON over the agent's stdin/stdout.
- Current protocol version: `1` (integer, major version only).
- Agent methods (client calls): `initialize`, `authenticate`, `session/new`, `session/load`, `session/prompt`, `session/cancel` (notification), optional `session/set_mode`, `logout`.
- Client methods (agent calls): `session/request_permission`, `fs/read_text_file`, `fs/write_text_file`, `terminal/*` (create, output, release, wait_for_exit, kill), `elicitation/create`. File and terminal methods exist only if the client advertises them in `initialize`.
- Agent notification `session/update` carries: `agent_message_chunk`, `agent_thought_chunk`, `tool_call`, `tool_call_update`, `plan`, `usage_update` (context use and cost), `config_option_update`, `available_commands_update`, and more.
- `session/prompt` ends with a stop reason: `end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, `cancelled`.
- Auth: `initialize` response lists `authMethods`. Type `agent` = client calls `authenticate`. Type `terminal` = client runs the agent program interactively. Gated requests fail with `auth_required` until auth is done.
- Ecosystem: many agents speak ACP natively (for example Gemini CLI, Goose, OpenCode, Kimi CLI, Copilot CLI in preview). Claude Code and Codex CLI connect through adapters (`claude-agent-acp`, `codex-acp`). Cursor is listed. Source: [ACP agents list](https://agentclientprotocol.com/overview/agents).
- TypeScript SDK: `@agentclientprotocol/sdk` v2.4.0, `type: module` (ESM only). Its older `ClientSideConnection` class is deprecated in favor of fluent `client()` and `agent()` APIs.

Facts above come from the ACP docs. Launch commands per agent are NOT on the agents page; verify each before documenting it.

## How current ai-providers work

- Contract: `AIProvider` in `src/ai/types.ts`. Fields: `name`, `displayName`, `capabilities` (`'headless'` or none), `execute(request)`, `isAvailable()`, `signIn()`, optional `instructions`.
- `execute` takes `{ model?, systemPrompt, prompt, maxTokens?, inactivityTimeout, abortSignal? }` and returns `{ content, model, usage?, metadata? }`. One request, one text response, no streaming to the caller.
- Discovery: `scripts/generate-provider-registry.ts` scans `src/ai/providers/*-provider.ts` at build time and writes `provider-catalog.ts`. `createAIProvider(name)` reads it. Adding a provider = adding one file.
- Consumer: `AIPromptAction` (`src/playbooks/actions/ai/ai-prompt-action.ts`). It picks `config.provider`, default `claude`. Headless providers return content directly. Interactive providers (no `headless`) write to an output file instead.
- Existing providers: `claude` (Agent SDK), `openai`, `gemini` (API key), `ollama`, `copilot` and `cursor` (CLI, interactive-only), `mock`.
- Timeouts and cancel: `inactivityTimeout` and `abortSignal` live in each provider; the action does the outer `AbortController`.

### What the shipped `acp` provider does

File: `src/ai/providers/acp-provider.ts` (about 200 lines, no dependency). Tests: `tests/ai/providers/acp-provider.test.ts` (fake agent over in-memory streams).

- Agent command from env var `CATALYST_ACP_COMMAND`, split on spaces, spawned without a shell. Name `acp`, capability `headless`.
- One process per `execute`: spawn, `initialize` (v1, no client capabilities), `session/new` (cwd, no MCP servers), `session/prompt` (one text block: system prompt then prompt), kill.
- Joins `agent_message_chunk` text. Any agent message resets the inactivity timer. Timeout and abort send `session/cancel`, then kill.
- Rejects `session/request_permission` (reject option, else `cancelled`). Answers all other agent requests with `-32601`.
- Maps `refusal` and JSON-RPC errors to `AIProviderError`; ENOENT to `AIProviderUnavailable`.

## Gaps in the shipped provider

| #   | Gap                                                                                                                                             | Impact                                                       | Size   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| G1  | stdout is decoded per chunk (`d.toString()`); a multi-byte UTF-8 character split across two chunks becomes `U+FFFD` and can break a JSON line   | Silent content corruption on non-ASCII output                | Small  |
| G2  | `max_tokens`, `max_turn_requests`, `cancelled` stop reasons return success with partial content                                                 | Playbook gets truncated output as if complete                | Small  |
| G3  | `authMethods` and `auth_required` ignored; no `authenticate`; `signIn()` only checks the executable                                             | Unsigned agent gives a generic error; no guidance            | Medium |
| G4  | Agent `protocolVersion` in the `initialize` reply is not checked; `clientInfo` not sent                                                         | Silent mismatch with a future v2 agent                       | Small  |
| G5  | `request.model` and `maxTokens` are not sent; `model` in the response is just echoed                                                            | Cannot select a model; reported model can be wrong           | Medium |
| G6  | `usage_update` ignored; no `AIUsageStats`                                                                                                       | No cost or token tracking (P3 in `FR:provider.usage`)        | Small  |
| G7  | Config is one env var. No named agents, no presets, no per-playbook agent                                                                       | Cannot use two ACP agents in one repo                        | Medium |
| G8  | Command split on whitespace; no quoting. Windows: `PATH` scan with `X_OK` ignores `PATHEXT`, and no-shell spawn cannot run `.cmd` shims (`npx`) | Setup fails on Windows and for paths with spaces             | Medium |
| G9  | Always rejects permissions; agent cannot edit files or run tools                                                                                | Text-only use works; agentic use does not (see below)        | Design |
| G10 | New process per call                                                                                                                            | Slow for many short prompts (agent start time each call)     | Design |
| G11 | No `instructions` property; no mention in `README.md` or `docs/`                                                                                | Users cannot find the feature                                | Small  |
| G12 | Tests use a scripted fake only; no run against a real agent                                                                                     | Real-agent quirks (extra stdout noise, init time) unverified | Small  |

G1 is confirmed by reading the code (`buf += d.toString()`); the spike fixes it.

## Design for further ACP support

### Principle

An ACP agent is a long-lived tool with its own tools, auth, and models. Catalyst uses it as a text-in, text-out provider. Keep that boundary. File and shell work stays in playbook actions.

### Config (G7)

Keep `CATALYST_ACP_COMMAND` as the default. Add named agents in `.xe/config/catalyst.json`:

```json
{
  "ai": {
    "acp": {
      "agents": {
        "gemini": { "command": ["gemini", "--experimental-acp"] },
        "claude": {
          "command": ["claude-agent-acp"],
          "env": { "ANTHROPIC_API_KEY": "$ANTHROPIC_API_KEY" }
        }
      }
    }
  }
}
```

- `command` is an array: no whitespace parsing, no shell, fixes quoting (G8).
- Select with `provider: acp:gemini` in the `ai-prompt` action. Plain `acp` = env var agent.
- Factory change: `createAIProvider('acp:gemini')` returns an `AcpProvider` bound to that agent. The catalog stays one file.
- Env values may reference the caller's env; Catalyst never writes secrets to config.

### Auth (G3)

- After `initialize`, if the agent lists `authMethods` and `session/new` fails with `auth_required`: if an `agent`-type method exists, call `authenticate` with its id once, then retry.
- For `terminal`-type methods: do NOT run them headless. Throw `AIProviderUnavailable` with guidance (the exact command to run once, interactively). `signIn()` may run it when a TTY exists. Advertise `auth.terminal: false` until then.
- ACP warns against `env` entries that change program lookup or TLS trust (`PATH`, `LD_*`, `NODE_OPTIONS`). Reject those keys in config `env`.

### Model, tokens, usage (G5, G6)

- ACP has session config options (`config_option_update`). Model choice depends on the agent. Plan: if the agent offers a `model` option and `request.model` is set, set it before the prompt; else log a warning and use the agent default.
- `maxTokens`: no ACP field. Ignore and document it; do not fake it.
- Map `usage_update` to `AIUsageStats` when present. Skip when absent.

### Stop reasons and errors (G2, G4)

| Stop reason         | Result                                                  |
| ------------------- | ------------------------------------------------------- |
| `end_turn`          | Success                                                 |
| `max_tokens`        | `AIProviderError` (output truncated)                    |
| `max_turn_requests` | `AIProviderError` (agent hit its request limit)         |
| `cancelled`         | `AIProviderError` (we cancelled; abort or timeout wins) |
| `refusal`           | `AIProviderError` (today)                               |

- Check the `initialize` reply: if `protocolVersion` is not `1`, throw `AIProviderError` with a clear message.
- Send `clientInfo: { name: 'catalyst', version }`.

### Permissions and tools (G9)

Options:

1. **Reject all** (today). Safe. Agent can only answer in text.
2. **Policy by env/config**: `permissions: reject | allow-read | allow`. `allow` picks the first `allow_*` option. Needed for agents that run tools to answer.
3. **Expose `fs`/`terminal` client methods**. Rejected: duplicates playbook actions, large attack surface.

Recommendation: keep option 1 as default; add option 2 as explicit opt-in per agent, with `allow` shown in logs. Never default to allow. (An earlier draft of the provider had `CATALYST_ACP_PERMISSIONS=allow`; it was dropped before merge. Bring it back only with the per-agent config.)

### Session reuse (G10)

Optional pool: keep the agent process for the length of one playbook run, one `session/new` per `execute`. Close on run end. Risk: leaked processes and state bleed between prompts. Defer until measured start time is a real problem.

### Catalyst as an ACP agent (out of scope)

Catalyst could expose playbooks as an ACP agent so editors (Zed and others) can run them. Different product surface. Park as a separate explore.

## Risks

| Risk                                                                     | Mitigation                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| ACP changes fast (v1 docs show many new notifications and capabilities)  | Use only 5 methods. Version check (G4). Unknown updates are ignored.                      |
| SDK is ESM-only; repo is CJS                                             | Stay dependency-free. Re-check when the repo moves to ESM or the SDK ships CJS.           |
| Agent runs arbitrary tools under the user's account                      | Reject permissions by default (G9). No `fs`/`terminal` capability.                        |
| Agent writes noise to stdout (banners) or hangs at start                 | Ignore non-JSON lines (done). Inactivity timer covers hangs.                              |
| Agent launch flags vary and change (`--experimental-acp` vs `--acp`)     | No built-in presets in phase 1. Docs link to each agent's own ACP page.                   |
| Secrets in config `env`                                                  | Values come from the caller's env only; deny-list for lookup-changing keys.               |
| Adapter agents (Claude, Codex) add a second auth layer                   | Document per agent; auth guidance in error text (G3).                                     |
| Windows spawn differences (G8)                                           | Use `shell: false` + `PATHEXT`-aware resolve; test on Windows CI before claiming support. |
| Duplicate paths: `claude` provider (Agent SDK) vs ACP `claude-agent-acp` | Keep both. SDK provider is the supported default; ACP is the generic path.                |

## Phased plan

Each phase = one PR, spec first, tests before code.

1. **Phase 1 - Correctness** (small, no new config): G1 UTF-8 decode (spike below), G2 stop reasons, G4 version check and `clientInfo`, G11 README/docs section.
2. **Phase 2 - Setup**: G7 named agents in `catalyst.json` with `acp:{name}`, G8 array command and Windows-safe resolve, G3 auth (`authenticate`, terminal-method guidance), G12 optional real-agent smoke test (manual script, not in CI).
3. **Phase 3 - Capability**: G5 model selection, G6 usage mapping, G9 permission policy opt-in.
4. **Later (needs evidence)**: G10 session reuse; Catalyst as ACP agent.

Specs touched: `ai-provider` (`FR:acp.*`), `playbook-actions-ai` (provider name with `:agent`), `cli-init` (only if init should detect ACP agents; not planned).

## Open questions

| #   | Question                                                                  | Recommendation                                                                                                                   | Default if silent                         |
| --- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Q1  | Keep dependency-free, or adopt `@agentclientprotocol/sdk`?                | Stay dependency-free. Protocol use is 5 methods; SDK is ESM-only and still changing its API.                                     | Stay dependency-free                      |
| Q2  | Named agents in `catalyst.json` (`acp:gemini`) or env var only?           | Named agents. Env var stays as the zero-config default.                                                                          | Add named agents in phase 2               |
| Q3  | Should truncated stop reasons (`max_tokens`) fail or return partial text? | Fail. A playbook cannot tell partial from complete.                                                                              | Fail with `AIProviderError`               |
| Q4  | Allow tool permissions for agents?                                        | Opt-in per agent, never default. Default stays reject.                                                                           | Reject only                               |
| Q5  | Ship built-in presets for known agents?                                   | No. Launch flags change. Docs list examples with a "verify" note.                                                                | No presets                                |
| Q6  | Make `acp` the route for Copilot and Cursor (now interactive-only CLI)?   | Yes, as an experiment after phase 2. Both are listed as ACP agents; this could make them headless. Verify launch commands first. | No change to `copilot`/`cursor` providers |
| Q7  | Reuse agent process across calls?                                         | Not yet. Measure start time first.                                                                                               | One process per call                      |
| Q8  | Catalyst as an ACP agent for editors?                                     | Separate explore. Not part of "ai-providers".                                                                                    | Not started                               |
| Q9  | Windows support in phase 2 or later?                                      | Phase 2, behind a Windows CI test. Do not claim support without it.                                                              | Phase 2                                   |

## Spike

Scope: G1 only. Smallest safe fix, no behavior change for ASCII.

- Spec: add the rule under `FR:acp.protocol` in `.xe/features/ai-provider/spec.md`.
- Test first: a fake agent splits a multi-byte character across two stdout chunks. Test fails before the fix.
- Code: decode stdout with a streaming UTF-8 decoder in `acp-provider.ts`.

G2 to G12 stay in the phased plan. They change behavior or config and need a decision first.

## References

- ACP: [overview](https://agentclientprotocol.com/protocol/overview), [initialization](https://agentclientprotocol.com/protocol/initialization), [prompt turn](https://agentclientprotocol.com/protocol/prompt-turn), [authentication](https://agentclientprotocol.com/protocol/authentication), [agents](https://agentclientprotocol.com/overview/agents)
- Shipped provider: [157](https://github.com/Xerilium/catalyst/pull/157), `src/ai/providers/acp-provider.ts`, `.xe/features/ai-provider/spec.md` (`FR:acp`)
- Consumer: `src/playbooks/actions/ai/ai-prompt-action.ts`
- Build discovery: `scripts/generate-provider-registry.ts`
