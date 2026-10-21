---
id: ai-provider-acp
title: AI Provider - ACP
description: Headless AI execution through any Agent Client Protocol (ACP) compatible agent.
dependencies:
  - ai-provider
---

<!-- markdownlint-disable single-title -->

# Feature: AI Provider - ACP

## Purpose

Catalyst needs one provider that works with any agent speaking the [Agent Client Protocol](https://agentclientprotocol.com) so that new agents (Gemini CLI, Claude Code adapters, Goose, etc.) work without a dedicated provider each. The ACP provider implements `AIProvider` by launching a configured agent command and talking JSON-RPC 2.0 over its stdio.

Explicit non-goals:

- This feature does NOT define the AIProvider interface (see `ai-provider`)
- This feature does NOT install or authenticate agents (must be pre-installed and signed in)
- This feature does NOT expose client-side file system or terminal capabilities to the agent
- This feature does NOT stream (message chunks are collected before returning)

## Scenarios

### FR:acp: ACP Provider Implementation

Catalyst user needs to run prompts through any ACP agent so that agent choice is configuration, not code.

- **FR:acp.interface** (P1): Provider MUST implement `AIProvider` interface from `ai-provider`
  > - @req FR:ai-provider/provider.interface
  - `name` property MUST be `'acp'`
  - `capabilities` MUST include `'headless'`

- **FR:acp.protocol** (P1): Provider MUST speak ACP over the agent's stdio using newline-delimited JSON-RPC 2.0, without an SDK dependency
  - `initialize` with protocol version 1 and no client capabilities
  - `session/new` with the current working directory and no MCP servers
  - `session/prompt` with a single text content block

- **FR:acp.execute** (P1): `execute()` MUST:
  - Send `systemPrompt` followed by `prompt` as one text block (ACP has no system prompt)
  - Concatenate `agent_message_chunk` text updates into `content`
  - Return when `session/prompt` resolves with a stop reason
  - Terminate the agent process before returning or throwing
  - Throw `AIProviderError` when the stop reason is `refusal`
  - Report `model` as `request.model` or `'acp'`

- **FR:acp.cancel** (P1): Provider MUST honor `abortSignal` and `inactivityTimeout`
  - Send `session/cancel` then terminate the agent
  - Any agent message resets the inactivity timer
  - Timeout throws `AIProviderTimeout`

### FR:acp.config: Agent Configuration

Catalyst user needs to choose the agent so that any ACP agent can be used.

- **FR:acp.config.command** (P1): Agent command MUST come from the `CATALYST_ACP_COMMAND` environment variable (e.g. `gemini --experimental-acp`)
  - Split on whitespace; first token is the executable
  - Spawned without a shell

- **FR:acp.config.available** (P1): `isAvailable()` MUST return true only when `CATALYST_ACP_COMMAND` is set and its executable resolves

- **FR:acp.config.signin** (P2): `signIn()` MUST throw `AIProviderUnavailable` when the command is missing or not launchable; authentication happens in the agent itself

### FR:acp.permissions: Permission Requests

Catalyst user needs unattended runs to be safe so that agents cannot act beyond what was allowed.

- **FR:acp.permissions.default** (P1): `session/request_permission` MUST be rejected by default (selecting a reject option, else `cancelled`)

- **FR:acp.permissions.allow** (P2): When `CATALYST_ACP_PERMISSIONS=allow`, provider MUST select an `allow_once` option

- **FR:acp.permissions.unsupported** (P2): Other agent-initiated requests (file system, terminal) MUST get a JSON-RPC `-32601` error

### FR:acp.errors: Error Handling

- **FR:acp.errors.process** (P1): Spawn failure or early agent exit MUST throw `AIProviderUnavailable` or `AIProviderError` with stderr tail in the message
- **FR:acp.errors.rpc** (P2): JSON-RPC error responses MUST throw `AIProviderError` with the agent's message

### Non-Functional Requirements

- **NFR:acp.performance.instantiation** (P4): Provider instantiation MUST complete in <10ms (no process spawned in constructor)

## Architecture Constraints

None

## External Dependencies

- **ACP agent**: Any agent implementing the Agent Client Protocol, installed separately
