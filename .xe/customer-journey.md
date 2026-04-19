# Customer Journey

Product-level workflows showing how actors interact with Catalyst across distinct phases of the feature development lifecycle. Each journey captures a named workflow with its triggering actors, key checkpoints, and expected outcomes.

## Initialization

Triggered when a Project Maintainer starts a new project with Catalyst. The Product Manager, Architect, and Engineer contribute their respective context files, which Catalyst consolidates into centralized project context the AI Agent reads on every future workflow run.

```mermaid
sequenceDiagram
    actor PM as Product Manager
    actor Arch as Architect
    actor Eng as Engineer
    participant Cat as Catalyst
    participant Ctx as Context Storage

    PM->>Cat: Provide product vision
    Arch->>Cat: Provide architecture patterns
    Eng->>Cat: Provide engineering principles
    Cat->>Ctx: Store centralized context
    Cat->>PM: Review init PR (Checkpoint)
    PM-->>Cat: Approve and merge
```

## Blueprint Build-out

Triggered when a Project Maintainer creates a blueprint issue to plan a program of work. Catalyst researches the request, drafts a spec and rollout plan, and guides the team through review checkpoints before the blueprint is converted into feature issues for downstream implementation.

```mermaid
sequenceDiagram
    actor PM as Project Maintainer
    participant Cat as Catalyst
    participant Ctx as Context Storage
    participant GH as GitHub

    PM->>GH: Create blueprint issue
    GH->>Cat: Trigger blueprint workflow
    Cat->>Ctx: Read product + architecture + engineering
    Cat->>Cat: Research scope and draft plan
    Cat->>PM: Review blueprint (Checkpoint)
    PM-->>Cat: Approve
    Cat->>GH: File feature issues for rollout
```

## Feature Development

Triggered when a Developer requests feature work. Catalyst reads project context, executes a structured workflow with approval checkpoints at spec, plan, and review phases, then delivers enterprise-quality code with passing tests and requirements traceability.

```mermaid
sequenceDiagram
    actor Dev as Developer
    actor Arch as Architect
    actor Eng as Engineer
    participant Cat as Catalyst
    participant Ctx as Context Storage
    participant Code as Code Output

    Dev->>Cat: Request feature development
    Cat->>Ctx: Read context
    Cat->>Cat: Execute structured workflow

    Cat->>Dev: Review spec (Checkpoint 1)
    Dev-->>Cat: Approve

    Cat->>Arch: Review plan (Checkpoint 2)
    Arch-->>Cat: Approve

    Cat->>Eng: Review tasks (Checkpoint 3)
    Eng-->>Cat: Approve

    Cat->>Code: Generate enterprise-quality code
    Cat->>Eng: Review code (Checkpoint 4)
    Eng-->>Cat: Approve or request changes
```
