import { GenericStep } from './GenericStep';
import { ProcessStepStateInterface } from './ProcessStepState.interface';
/**
 * @classdesc Generic class representing same multiple steps in finite state machine.
 * @extends GenericStep
 */
export declare class GenericArrayStep<stateType> extends GenericStep<stateType> {
    protected _itemIdentifier: string;
    constructor(stepName: string, itemIdentifier: string, state?: stateType | null, dependsOn?: Array<string | {
        stepName: string;
        itemIdentifier: string | null;
    }>, success?: boolean, skipped?: boolean, error?: null | string, disabled?: boolean);
    get itemIdentifier(): string;
    getStepResult(): ProcessStepStateInterface;
    setInitialState(stepState: ProcessStepStateInterface): void;
}
//# sourceMappingURL=GenericArrayStep.d.ts.map