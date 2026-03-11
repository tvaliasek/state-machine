import { ProcessInterface } from './Process.interface'
import { ProcessStepStateInterface } from './ProcessStepState.interface'

/**
 * @classdesc Generic class representing step in finite state machine.
 * @template TState
 */
export abstract class GenericStep<TState extends Record<string, unknown> = Record<string, unknown>> {
    protected _stepName: string
    protected _state: TState | null
    protected _dependsOn: Array<string | { stepName: string, itemIdentifier: string | null }>
    protected _success: boolean
    protected _skipped: boolean
    protected _disabled: boolean
    protected _error: string | null
    protected _stateOfDependencies: Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>
    protected _process: ProcessInterface | null = null

    constructor(
        stepName: string,
        state: TState | null = null,
        dependsOn: Array<string | { stepName: string, itemIdentifier: string | null }> = [],
        success = false,
        skipped = false,
        error: string | null = null,
        disabled = false
    ) {
        this._stepName = stepName
        this._state = state
        this._dependsOn = dependsOn
        this._success = success
        this._skipped = skipped
        this._error = error
        this._disabled = disabled
        this._stateOfDependencies = new Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>()
    }

    get stepName(): string {
        return this._stepName
    }

    get state(): TState | null {
        return this._state
    }

    get dependsOn(): Array<string | { stepName: string, itemIdentifier: string | null }> {
        return this._dependsOn
    }

    get success(): boolean {
        return this._success
    }

    get disabled(): boolean {
        return this._disabled
    }

    get skipped(): boolean {
        return this._skipped
    }

    get error(): string | null {
        return this._error
    }

    get stateOfDependencies(): Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]> {
        return this._stateOfDependencies
    }

    get process(): ProcessInterface | null {
        return this._process
    }

    setProcessReference(process: ProcessInterface): void {
        this._process = process
    }

    getStepResult(): ProcessStepStateInterface<TState> {
        const currentState: TState | null = this.state
        return {
            success: this.success,
            error: this.error !== null,
            errorMessage: this.error ?? null,
            skipped: this.skipped,
            state: currentState !== null ? { ...currentState } : null,
            itemIdentifier: null,
            disabled: this.disabled
        }
    }

    onError(error: string, state?: TState | null): void {
        this._error = error
        this._skipped = false
        this._success = false
        this._disabled = false
        if (state !== undefined) {
            this._state = state
        }
    }

    onSuccess(state: TState | null = null): void {
        this._error = null
        this._skipped = false
        this._success = true
        this._disabled = false
        this._state = state
    }

    onSkipped(state: TState | null | undefined = undefined): void {
        this._error = null
        this._skipped = true
        this._success = false
        this._disabled = false
        if (state !== undefined) {
            this._state = state
        }
    }

    setStateOfDependencies(states: Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>): void {
        this._stateOfDependencies = states
    }

    setInitialState(stepState: ProcessStepStateInterface<TState>): void {
        this._state = stepState.state
        this._success = stepState.success
        this._skipped = stepState.skipped
        this._disabled = stepState.disabled
    }

    abstract doWork(additionalArguments?: Record<string, unknown>): Promise<ProcessStepStateInterface<TState>>

    shouldRun(): boolean {
        return !(this.success || this.skipped || this.disabled)
    }
}
