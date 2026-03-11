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

### `GenericProcess<TInput>`

Orchestrator class. Extend it and supply a step list and state provider.

The optional `TInput` type parameter types the process input accessible from all steps via `this.process?.getProcessInput<T>()`.

**Constructor:**
```ts
constructor(
    processName: string,
    steps: Array<StepInterface | ArrayItemStepInterface>,
    stepStateProvider: ProcessStateProviderInterface,
    processedInput?: TInput | null
)
```

**Methods:**

| Method | Description |
|--------|-------------|
| `run(throwError?)` | Executes all steps in order. If `throwError` is `false` (default), errors are caught, recorded, and emitted — execution halts. If `true`, errors propagate. |
| `runStep(stepName, itemIdentifier?, throwError?, additionalArguments?)` | Executes a single step by name. `additionalArguments` is passed to `doWork()`. |
| `getStepState(stepName)` | Returns persisted state for a step (`ProcessStepStateInterface` or `ProcessStepStateInterface[]` for array steps). |
| `getProcessInput<TProcessInput>()` | Returns the `processedInput` passed to the constructor. Callable from steps via `this.process?.getProcessInput<MyType>()`. |
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

### `GenericStep<TState>`

Abstract base for single-item steps. Must implement `doWork()`.

`TState` must extend `Record<string, unknown>` and defaults to `Record<string, unknown>`. It types the step's persisted state object.

**Constructor:**
```ts
constructor(
    stepName: string,
    state?: TState | null,
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
| `shouldRun()` | Returns `true` if the step is not already succeeded, skipped, or disabled. Guard `doWork()` with this on re-runs. |
| `onSuccess(state?)` | Marks step as succeeded, optionally sets state. |
| `onSkipped(state?)` | Marks step as skipped. |
| `onError(message)` | Marks step as failed with an error message. |
| `getStepResult()` | Returns the current `ProcessStepStateInterface<TState>` — return this from `doWork()`. |

**Context accessors:**

| Property | Type | Description |
|----------|------|-------------|
| `this.stateOfDependencies` | `Map<string, ProcessStepStateInterface \| ProcessStepStateInterface[]>` | Resolved state of declared dependencies, injected before `doWork()` |
| `this.process` | `ProcessInterface \| null` | Reference to the owning process |

**Example:**

```ts
import {
    GenericStep,
    StepInterface,
    ProcessStepStateInterface,
} from "@tvaliasek/state-machine"

interface MyStepState extends Record<string, unknown> {
    result: string
}

export class ExampleStep extends GenericStep<MyStepState> implements StepInterface<MyStepState> {
    async doWork(): Promise<ProcessStepStateInterface<MyStepState>> {
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

### `GenericArrayStep<TState>`

Extends `GenericStep`. Use when the same logical step is applied to multiple items — each instance is identified by a unique `itemIdentifier`. State is keyed by `processName + stepName + itemIdentifier`.

`TState` follows the same constraint as `GenericStep<TState>`.

**Constructor:**
```ts
constructor(
    stepName: string,
    itemIdentifier: string,
    state?: TState | null,
    dependsOn?: Array<string | { stepName: string, itemIdentifier: string | null }>,
    success?: boolean,
    skipped?: boolean,
    error?: string | null,
    disabled?: boolean
)
```

**Example:**

```ts
import {
    GenericArrayStep,
    ArrayItemStepInterface,
    ProcessStepStateInterface,
} from "@tvaliasek/state-machine"

interface MyItemState extends Record<string, unknown> {
    itemId: string
    processed: boolean
}

export class ExampleArrayItemStep extends GenericArrayStep<MyItemState> implements ArrayItemStepInterface<MyItemState> {
    async doWork(): Promise<ProcessStepStateInterface<MyItemState>> {
        if (!this.shouldRun()) {
            return this.getStepResult()
        }
        try {
            // this.itemIdentifier identifies which item this instance handles
            this.onSuccess({ itemId: this.itemIdentifier, processed: true })
            return this.getStepResult()
        } catch (error) {
            this.onError((error as Error).message)
            throw error
        }
    }
}
```

---

### Dependencies between steps

Steps declare their dependencies via the `dependsOn` constructor parameter. Before `doWork()` is called, the process resolves each dependency's persisted state and injects it into `this.stateOfDependencies`.

```ts
// Depend on the entire "fetchData" array step (all items)
new ProcessStep("transformData", null, ["fetchData"])

// Depend on a specific item in an array step
new ProcessStep("finalize", null, [{ stepName: "processItem", itemIdentifier: "42" }])
```

Reading dependency state inside `doWork()`:

```ts
async doWork(): Promise<ProcessStepStateInterface<MyState>> {
    if (!this.shouldRun()) {
        return this.getStepResult()
    }

    // single step dependency
    const dep = this.stateOfDependencies.get("fetchData") as ProcessStepStateInterface<FetchState>
    const fetchedValue = dep.state?.someField

    // array step dependency (all items)
    const items = this.stateOfDependencies.get("processItem") as ProcessStepStateInterface<ItemState>[]

    this.onSuccess({ combined: fetchedValue })
    return this.getStepResult()
}
```

---

### Accessing process input from a step

Pass input data into the process constructor and retrieve it inside any step:

```ts
interface OrderData extends Record<string, unknown> {
    orderId: string
}

class OrderProcess extends GenericProcess<OrderData> {}

const process = new OrderProcess("orderProcess", steps, provider, { orderId: "123" })

// Inside a step's doWork():
const input = this.process?.getProcessInput<OrderData>()
console.log(input?.orderId) // "123"
```

---

### `ProcessStateProviderInterface`

Consumer-supplied persistence adapter. The library does not impose a storage backend.

```ts
interface ProcessStateProviderInterface {
    getStepState(
        processName: string,
        stepName: string,
        itemIdentifier: string | null
    ): Promise<ProcessStepStateInterface | null>

    setStepState(
        processName: string,
        stepName: string,
        itemIdentifier: string | null,
        stepState: ProcessStepStateInterface
    ): Promise<void>
}
```

**In-memory example:**

```ts
import { ProcessStateProviderInterface, ProcessStepStateInterface } from "@tvaliasek/state-machine"

export class MemoryStepStateProvider implements ProcessStateProviderInterface {
    private state = new Map<string, ProcessStepStateInterface>()

    async getStepState(
        processName: string,
        stepName: string,
        itemIdentifier: string | null
    ): Promise<ProcessStepStateInterface | null> {
        return this.state.get(`${processName}_${stepName}_${itemIdentifier}`) ?? null
    }

    async setStepState(
        processName: string,
        stepName: string,
        itemIdentifier: string | null,
        stepState: ProcessStepStateInterface
    ): Promise<void> {
        this.state.set(`${processName}_${stepName}_${itemIdentifier}`, stepState)
    }
}
```

For multi-tenant or record-scoped scenarios, scope the provider to a specific record identifier via a factory:

```ts
export class ScopedMemoryStepStateProvider implements ProcessStateProviderInterface {
    private state = new Map<string, ProcessStepStateInterface>()

    constructor(private readonly scopeId: string) {}

    static create(id: string): ScopedMemoryStepStateProvider {
        return new ScopedMemoryStepStateProvider(id)
    }

    async getStepState(
        processName: string,
        stepName: string,
        itemIdentifier: string | null
    ): Promise<ProcessStepStateInterface | null> {
        return this.state.get(`${this.scopeId}_${processName}_${stepName}_${itemIdentifier}`) ?? null
    }

    async setStepState(
        processName: string,
        stepName: string,
        itemIdentifier: string | null,
        stepState: ProcessStepStateInterface
    ): Promise<void> {
        this.state.set(`${this.scopeId}_${processName}_${stepName}_${itemIdentifier}`, stepState)
    }
}
```

---

### `ProcessStepStateInterface<TState>`

Shape of persisted step state. `TState` must extend `Record<string, unknown>` and defaults to `Record<string, unknown>`.

```ts
interface ProcessStepStateInterface<TState extends Record<string, unknown> = Record<string, unknown>> {
    state: TState | null
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
