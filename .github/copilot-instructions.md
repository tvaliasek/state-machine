# Project Guidelines

## Overview

This is `@tvaliasek/state-machine` — a TypeScript library for building finite state machines as multi-step processing pipelines. Steps produce persisted state, declare dependencies on other steps, and can be "array steps" that process multiple items under the same step name (distinguished by `itemIdentifier`).

The library ships as a dual CJS + ESM package. Consumers extend abstract base classes and supply a storage adapter implementing `ProcessStateProviderInterface`.

## Architecture

- **`GenericProcess<inputType>`** — orchestrator. Manages step execution order, dependency resolution, state persistence, and emits lifecycle events (`start`, `step-start`, `step-done`, `step-error`, `done`). Extends `EventEmitter`.
- **`GenericStep<stateType>`** — abstract base for a single unit of work. Must implement `doWork()` and optionally override `shouldRun()`. State is keyed by `processName + stepName`.
- **`GenericArrayStep<stateType>`** — extends `GenericStep` for steps that process multiple items, each identified by a unique `itemIdentifier`. State is keyed by `processName + stepName + itemIdentifier`.
- **`ProcessStateProviderInterface`** — strategy interface for state persistence (load/save). Consumers implement this for their storage backend (e.g., MongoDB, in-memory).
- **`ProcessStepStateInterface`** — shape of persisted step state (`state`, `success`, `skipped`, `disabled`, `error`, `errorMessage`, `itemIdentifier`).
- **`StepInterface<stateType>` / `ArrayItemStepInterface<stateType>`** — contracts that steps must satisfy.
- **`ProcessingState`** — enum: `Idle`, `Running`, `Done`, `Failed`.

### Step lifecycle

Each step terminates in one of three outcomes: `success`, `skipped`, or `failed`. Inside `doWork()`, call one of:
- `this.onSuccess(state?)` — mark succeeded, persist state.
- `this.onSkipped(state?)` — mark skipped.
- `this.onError(message)` — mark failed, then throw.

Return `this.getStepResult()` from `doWork()`. Guard with `this.shouldRun()` to skip already-completed steps on re-runs.

### Process execution

`GenericProcess.run(throwError?)` iterates steps sequentially. On error: sets `ProcessingState.Failed`, saves error state, emits `step-error`. If `throwError` is `false` (default), execution halts but does not throw. `runStep(stepName, itemIdentifier?, throwError?, additionalArguments?)` executes a single step by name.

### Dependency resolution

Dependencies are declared as `Array<string | { stepName: string, itemIdentifier: string | null }>`. Before `doWork()` is called, resolved dependency states are injected into `this.stateOfDependencies` (`Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>`). A missing or non-succeeded dependency throws and halts the process.

### Process input

The optional `processedInput` constructor parameter is accessible from steps via `this.process.getProcessInput<T>()`.

## Code Style

- TypeScript with `strict: true`, targeting ES2022, dual CJS + ESM output (bundled by `tsdown`).
- Package is `"type": "module"` (ESM-first); CJS output at `dist/index.cjs`, ESM at `dist/index.js`.
- ESLint with flat config (`eslint.config.ts`) using `@eslint/js`, `typescript-eslint` (recommended type-checked), and `@stylistic/eslint-plugin`.
- Protected class members use underscore prefix: `_stepName`, `_state`, `_process`.
- Public access via getter properties (`get stepName()`, `get state()`), not direct field access.
- Union types use `|` without spaces around the pipe (e.g., `stateType|null`, `string|null`).
- Prefer `T | null` over `null | T` ordering.
- Prefer `unknown` over `any`. Use type predicates for narrowing.
- Interfaces are suffixed with `Interface` (e.g., `ProcessStepStateInterface`).
- Abstract base classes are prefixed with `Generic` (e.g., `GenericStep`, `GenericProcess`).
- One class or interface per file. File names match the exported symbol (e.g., `GenericStep.ts`).
- Barrel re-exports from `src/index.ts` using `export * from './Module'`.

## Conventions

- All async work uses `async/await`.
- `doWork()` returns `Promise<ProcessStepStateInterface>` — never throw from it unless `throwError` is true.
- Error handling: `GenericProcess.run(throwError)` controls whether errors propagate or are caught, recorded in step state, and emitted as events.
- Dependencies are declared as `Array<string | { stepName: string, itemIdentifier: string|null }>`.
- `GenericStep` constructor parameters follow this order: `stepName, state, dependsOn, success, skipped, error, disabled`.
- `GenericArrayStep` adds `itemIdentifier` as the second parameter after `stepName`.
- State of dependencies is passed via `Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>`.

## Build & Test

```sh
npm run build   # tsdown — bundles src/ to dist/ (CJS + ESM + type declarations)
npm run lint    # eslint --config eslint.config.ts --fix --quiet
npm test        # jest with ts-jest
```

## Testing Patterns

- Tests live in `tests/` with `.test.ts` suffix.
- Shared test implementations (concrete step/process/provider classes) are in `tests/implementation.ts`.
- State provider is mocked with an in-memory `Map`-based implementation.
- Tests verify lifecycle states (`Idle` → `Running` → `Done`/`Failed`), dependency resolution, and state persistence.

## Adding New Features

- New interfaces go in `src/<Name>.interface.ts` and must be re-exported from `src/index.ts`.
- New abstract classes go in `src/<Name>.ts` following the `Generic*` naming pattern.
- Enums go in `src/<Name>.enum.ts`.
- Always add corresponding tests in `tests/<Name>.test.ts`.
- Examples demonstrating usage go in `examples/<example-name>/`.
