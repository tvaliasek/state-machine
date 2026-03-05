# @tvaliasek/state-machine

A TypeScript library for building finite state machines as multi-step processing pipelines. Each step produces persisted state, declares dependencies on other steps, and can be resumed across multiple runs. Used in production for complex data export and integration workflows.

## Concepts

- **Process** — orchestrates step execution, dependency resolution, and state persistence. Emits lifecycle events.
- **Step** — a single unit of work. Implements `doWork()`, optionally overrides `shouldRun()`. State is keyed by `processName + stepName`.
- **Array step** — a step variant for processing multiple items under the same step name. State is keyed by `processName + stepName + itemIdentifier`.
- **State provider** — a consumer-supplied adapter implementing `ProcessStateProviderInterface`, backed by any storage (database, in-memory, etc.).

Each step terminates in one of three outcomes: `success`, `skipped`, or `failed`.

## Installation

```sh
npm install @tvaliasek/state-machine
```

## Quick start

```ts
import { GenericProcess } from "@tvaliasek/state-machine"
import { ExampleArrayItemStep } from "./ExampleArrayItemStep"
import { ExampleStep } from "./ExampleStep"
import { MemoryStepStateProvider } from "./MemoryStepStateProvider"

class MyProcess extends GenericProcess {}

const process = new MyProcess(
    "exampleProcess",
    [
        new ExampleStep("step1"),
        new ExampleStep("step2"),
        new ExampleArrayItemStep("arrayItemStep1", "1"),
        new ExampleArrayItemStep("arrayItemStep1", "2"),
        new ExampleArrayItemStep("arrayItemStep1", "3"),
    ],
    new MemoryStepStateProvider()
)

await process.run()
```

## API

### `GenericProcess<inputType>`

Orchestrator class. Extend it directly if no customization is needed.

**Constructor:**
```ts
constructor(
    processName: string,
    steps: Array<StepInterface<unknown> | ArrayItemStepInterface<unknown>>,
    stepStateProvider: ProcessStateProviderInterface,
    processedInput?: inputType | null
)
```

**Methods:**

| Method | Description |
|--------|-------------|
| `run(throwError?)` | Executes all steps in order. If `throwError` is `false` (default), errors are caught, recorded, and emitted — execution halts. If `true`, errors propagate. |
| `runStep(stepName, itemIdentifier?, throwError?, additionalArguments?)` | Executes a single step by name. `additionalArguments` is passed to `doWork()`. |
| `getStepState(stepName)` | Returns persisted state for a step (`ProcessStepStateInterface` or `ProcessStepStateInterface[]` for array steps). |
| `getProcessInput<T>()` | Returns the `processedInput` passed to the constructor, accessible from steps via `this.process.getProcessInput()`. |
| `setSteps(steps)` | Replaces the step list. Throws if the process is `Running`. |

**Events:**

| Event | Payload | Trigger |
|-------|---------|---------|
| `start` | `{ processName }` | Before first step |
| `step-start` | `{ processName, stepName, itemIdentifier }` | Before `doWork()` |
| `step-done` | `{ processName, stepName, itemIdentifier, state }` | After successful `doWork()` |
| `step-error` | `{ processName, stepName, itemIdentifier, error }` | On any thrown error |
| `done` | `{ processName }` | After last step (regardless of outcome) |

**Processing states** (`ProcessingState` enum): `Idle` → `Running` → `Done` | `Failed`

---

### `GenericStep<stateType>`

Abstract base for single-item steps. Must implement `doWork()`.

**Constructor:**
```ts
constructor(
    stepName: string,
    state?: stateType | null,
    dependsOn?: Array<string | { stepName: string, itemIdentifier: string | null }>,
    success?: boolean,
    skipped?: boolean,
    error?: string | null,
    disabled?: boolean
)
```

**Lifecycle methods** (call inside `doWork()`):

| Method | Description |
|--------|-------------|
| `shouldRun()` | Returns `true` if step is not already succeeded, skipped, or disabled. |
| `onSuccess(state?)` | Marks step as succeeded, sets state. |
| `onSkipped(state?)` | Marks step as skipped. |
| `onError(message)` | Marks step as failed with an error message. |
| `getStepResult()` | Returns the current `ProcessStepStateInterface` to return from `doWork()`. |

**Context accessors:**

| Property | Type | Description |
|----------|------|-------------|
| `this.stateOfDependencies` | `Map<string, ProcessStepStateInterface \| ProcessStepStateInterface[]>` | Resolved state of declared dependencies |
| `this.process` | `ProcessInterface \| null` | Reference to the owning process |

**Example:**

```ts
import { GenericStep, StepInterface, ProcessStepStateInterface } from "@tvaliasek/state-machine"

export class ExampleStep extends GenericStep<Record<string, unknown>> implements StepInterface<Record<string, unknown>> {
    async doWork(): Promise<ProcessStepStateInterface> {
        if (!this.shouldRun()) {
            return this.getStepResult()
        }
        try {
            // perform work here
            this.onSuccess({ result: "done" })
            return this.getStepResult()
        } catch (error) {
            this.onError((error as Error).message)
            throw error
        }
    }
}
```

---

### `GenericArrayStep<stateType>`

Extends `GenericStep`. Use when the same logical step is applied to multiple items — each instance is identified by a unique `itemIdentifier`. State is keyed by `processName + stepName + itemIdentifier`.

**Constructor:**
```ts
constructor(
    stepName: string,
    itemIdentifier: string,
    state?: stateType | null,
    dependsOn?: Array<string | { stepName: string, itemIdentifier: string | null }>,
    success?: boolean,
    skipped?: boolean,
    error?: string | null,
    disabled?: boolean
)
```

**Example:**

```ts
import { GenericArrayStep, ArrayItemStepInterface, ProcessStepStateInterface } from "@tvaliasek/state-machine"

export class ExampleArrayItemStep extends GenericArrayStep<Record<string, unknown>> implements ArrayItemStepInterface<Record<string, unknown>> {
    async doWork(): Promise<ProcessStepStateInterface> {
        if (!this.shouldRun()) {
            return this.getStepResult()
        }
        try {
            // process this.itemIdentifier
            this.onSuccess({ itemIdentifier: this.itemIdentifier })
            return this.getStepResult()
        } catch (error) {
            this.onError((error as Error).message)
            throw error
        }
    }
}
```

---

### `ProcessStateProviderInterface`

Consumer-supplied persistence adapter. The library does not impose a storage backend.

```ts
export interface ProcessStateProviderInterface {
    getStepState(processName: string, stepName: string, itemIdentifier: string | null): Promise<ProcessStepStateInterface | null>
    setStepState(processName: string, stepName: string, itemIdentifier: string | null, stepState: ProcessStepStateInterface): Promise<void>
}
```

**In-memory example:**

```ts
import { ProcessStepStateInterface } from "@tvaliasek/state-machine"

export class MemoryStepStateProvider {
    private state = new Map<string, ProcessStepStateInterface>()

    async getStepState(processName: string, stepName: string, itemIdentifier: string | null): Promise<ProcessStepStateInterface | null> {
        return this.state.get(`${processName}_${stepName}_${itemIdentifier}`) ?? null
    }

    async setStepState(processName: string, stepName: string, itemIdentifier: string | null, stepState: ProcessStepStateInterface): Promise<void> {
        this.state.set(`${processName}_${stepName}_${itemIdentifier}`, stepState)
    }
}
```

For multi-tenant or record-scoped scenarios, scope the state provider to a specific record identifier via a factory:

```ts
export class ScopedMemoryStepStateProvider {
    private state = new Map<string, ProcessStepStateInterface>()

    constructor(private readonly processedItemId: string) {}

    static createForRecord(id: string): ScopedMemoryStepStateProvider {
        return new ScopedMemoryStepStateProvider(id)
    }

    async getStepState(processName: string, stepName: string, itemIdentifier: string | null): Promise<ProcessStepStateInterface | null> {
        return this.state.get(`${this.processedItemId}_${processName}_${stepName}_${itemIdentifier}`) ?? null
    }

    async setStepState(processName: string, stepName: string, itemIdentifier: string | null, stepState: ProcessStepStateInterface): Promise<void> {
        this.state.set(`${this.processedItemId}_${processName}_${stepName}_${itemIdentifier}`, stepState)
    }
}
```

---

### `ProcessStepStateInterface`

Shape of persisted step state:

```ts
export interface ProcessStepStateInterface {
    state: Record<string, unknown> | null
    success: boolean
    skipped: boolean
    disabled: boolean
    error: boolean
    errorMessage?: string | null
    itemIdentifier?: string | null
}
```

## License

MIT
