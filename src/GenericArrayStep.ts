import { GenericStep } from './GenericStep'
import { ProcessStepStateInterface } from './ProcessStepState.interface'
import { DependencyDeclaration, DependencyStatesMap } from './Step.interface'

/**
 * @classdesc Generic class representing same multiple steps in finite state machine.
 * @extends GenericStep
 */
export abstract class GenericArrayStep<TState extends Record<string, unknown> = Record<string, unknown>, TDependencies extends DependencyStatesMap = DependencyStatesMap> extends GenericStep<TState, TDependencies> {
    protected _itemIdentifier: string

    constructor(
        stepName: string,
        itemIdentifier: string,
        state: TState | null = null,
        dependsOn: DependencyDeclaration = [],
        success = false,
        skipped = false,
        error: string | null = null,
        disabled = false
    ) {
        super(
            stepName,
            state,
            dependsOn,
            success,
            skipped,
            error,
            disabled
        )
        if (!itemIdentifier) {
            throw new Error('Bad arguments: missing required identifier')
        }
        this._itemIdentifier = `${itemIdentifier}`
    }

    get itemIdentifier(): string {
        return this._itemIdentifier
    }

    getStepResult(): ProcessStepStateInterface<TState> {
        const currentState: TState | null = this.state
        return {
            success: this.success,
            error: this.error !== null,
            errorMessage: this.error ?? null,
            skipped: this.skipped,
            state: currentState !== null ? { ...currentState } : null,
            itemIdentifier: this.itemIdentifier,
            disabled: this.disabled
        }
    }

    setInitialState(stepState: ProcessStepStateInterface<TState>): void {
        super.setInitialState(stepState)
        if (stepState.itemIdentifier == null) {
            throw new Error('Bad arguments: missing required identifier')
        }
        this._itemIdentifier = stepState.itemIdentifier
    }
}
