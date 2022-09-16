import { GenericStep } from './GenericStep'
import { ProcessStepStateInterface } from './ProcessStepState.interface'

/**
 * @classdesc Generic class representing same multiple steps in finite state machine.
 * @extends GenericStep
 */
export class GenericArrayStep<stateType> extends GenericStep<stateType> {
    protected _itemIdentifier: string

    constructor (
        stepName: string,
        itemIdentifier: string,
        state: stateType|null = null,
        dependsOn: string[] = [],
        success = false,
        skipped = false,
        error: null|string = null
    ) {
        super(
            stepName,
            state,
            dependsOn,
            success,
            skipped,
            error
        )
        if (!itemIdentifier) {
            throw new Error('Bad arguments: missing required identifier')
        }
        this._itemIdentifier = `${itemIdentifier}`
    }

    get itemIdentifier (): string {
        return this._itemIdentifier
    }

    getStepResult (): ProcessStepStateInterface {
        return {
            success: this.success,
            error: this.error !== null,
            errorMessage: this.error,
            skipped: this.skipped,
            state: (this.state) ? { ...this.state } : null,
            itemIdentifier: this.itemIdentifier
        }
    }

    setInitialState (stepState: ProcessStepStateInterface): void {
        super.setInitialState(stepState)
        if (!stepState.itemIdentifier) {
            throw new Error('Bad arguments: missing required identifier')
        }
        this._itemIdentifier = stepState.itemIdentifier
    }
}
