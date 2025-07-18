import { ProcessInterface } from './Process.interface';
import { ProcessStepStateInterface } from './ProcessStepState.interface';
/**
 * @classdesc Generic class representing step in finite state machine.
 * @template stateType
 */
export declare abstract class GenericStep<stateType> {
    protected _stepName: string;
    protected _state: stateType | null;
    protected _dependsOn: Array<string | {
        stepName: string;
        itemIdentifier: string | null;
    }>;
    protected _success: boolean;
    protected _skipped: boolean;
    protected _disabled: boolean;
    protected _error: null | string;
    protected _stateOfDependencies: Map<string, unknown>;
    protected _process: ProcessInterface | null;
    constructor(stepName: string, state?: stateType | null, dependsOn?: Array<string | {
        stepName: string;
        itemIdentifier: string | null;
    }>, success?: boolean, skipped?: boolean, error?: null | string, disabled?: boolean);
    get stepName(): string;
    get state(): stateType | null;
    get dependsOn(): Array<string | {
        stepName: string;
        itemIdentifier: string | null;
    }>;
    get success(): boolean;
    get disabled(): boolean;
    get skipped(): boolean;
    get error(): null | string;
    get stateOfDependencies(): Map<string, unknown>;
    get process(): ProcessInterface | null;
    setProcessReference(process: ProcessInterface): void;
    getStepResult(): ProcessStepStateInterface;
    onError(error: string): void;
    onSuccess(state?: stateType | null): void;
    onSkipped(state?: stateType | null | undefined): void;
    setStateOfDependencies(states: Map<string, unknown>): void;
    setInitialState(stepState: ProcessStepStateInterface): void;
    shouldRun(): boolean;
}
//# sourceMappingURL=GenericStep.d.ts.map