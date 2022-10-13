import { ProcessInterface } from './Process.interface'
import { ProcessStepStateInterface } from './ProcessStepState.interface'

/**
 * @classdesc Generic class representing step in finite state machine.
 * @template stateType
 */
export abstract class GenericStep<stateType> {
    protected _stepName: string
    protected _state: stateType|null
    protected _dependsOn: string[]
    protected _success: boolean
    protected _skipped: boolean
    protected _disabled: boolean
    protected _error: null|string
    protected _stateOfDependencies: Map<string, unknown>
    protected _process: ProcessInterface|null = null

    constructor (
        stepName: string,
        state: stateType|null = null,
        dependsOn: string[] = [],
        success = false,
        skipped = false,
        error: null|string = null,
        disabled = false
    ) {
        this._stepName = stepName
        this._state = state
        this._dependsOn = dependsOn
        this._success = success
        this._skipped = skipped
        this._error = error
        this._disabled = disabled
        this._stateOfDependencies = new Map()
    }

    get stepName (): string {
        return this._stepName
    }

    get state (): stateType|null {
        return this._state
    }

    get dependsOn (): string[] {
        return this._dependsOn
    }

    get success (): boolean {
        return this._success
    }

    get disabled (): boolean {
        return this._disabled
    }

    get skipped (): boolean {
        return this._skipped
    }

    get error (): null|string {
        return this._error
    }

    get stateOfDependencies (): Map<string, unknown> {
        return this._stateOfDependencies
    }

    get process (): ProcessInterface|null {
        return this._process
    }

    setProcessReference (process: ProcessInterface) {
        this._process = process
    }

    getStepResult (): ProcessStepStateInterface {
        return {
            success: this.success,
            error: this.error !== null,
            errorMessage: this.error ?? null,
            skipped: this.skipped,
            state: (this.state) ? { ...this.state } : null,
            itemIdentifier: null,
            disabled: this.disabled
        }
    }

    onError (error: string): void {
        this._error = error
        this._skipped = false
        this._success = false
        this._disabled = false
    }

    onSuccess (state: stateType|null = null): void {
        this._error = null
        this._skipped = false
        this._success = true
        this._disabled = false
        this._state = state
    }

    onSkipped (state: stateType|null|undefined = undefined): void {
        this._error = null
        this._skipped = true
        this._success = false
        this._disabled = false
        if (state !== undefined) {
            this._state = state
        }
    }

    setStateOfDependencies (states: Map<string, unknown>): void {
        this._stateOfDependencies = states
    }

    setInitialState (stepState: ProcessStepStateInterface): void {
        this._state = stepState.state as stateType
        this._success = stepState.success
        this._skipped = stepState.skipped
        this._disabled = stepState.disabled
    }

    shouldRun (): boolean {
        return !(this.success || this.skipped || this.disabled)
    }
}
