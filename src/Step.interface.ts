import { ProcessInterface } from './Process.interface'
import { ProcessStepStateInterface } from './ProcessStepState.interface'

export type DependencyDeclaration = Array<string | { stepName: string, itemIdentifier: string | null }>

export type DependencyStatesMap = Record<string, ProcessStepStateInterface | ProcessStepStateInterface[]>

export interface StepInterface<TState extends Record<string, unknown> = Record<string, unknown>> {
    get stepName (): string
    get state(): TState | null
    get dependsOn (): DependencyDeclaration
    get success (): boolean
    get skipped (): boolean
    get disabled (): boolean
    get error (): string | null

    doWork(additionalArguments?: Record<string, unknown>): Promise<ProcessStepStateInterface<TState>>
    shouldRun(): boolean
    setStateOfDependencies(states: Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>): void
    setInitialState (stepState: ProcessStepStateInterface<TState>): void
    onSuccess(state?: TState | null): void
    onSkipped(state?: TState | null): void
    onError(errorMessage: string): void
    setProcessReference(process: ProcessInterface): void
    getStepResult (): ProcessStepStateInterface<TState>
}

export interface ArrayItemStepInterface<TState extends Record<string, unknown> = Record<string, unknown>> extends StepInterface<TState> {
    get itemIdentifier (): string
}
