import { ProcessStepStateInterface } from './ProcessStepState.interface';
/**
 * @classdesc Generic class representing step in finite state machine.
 * @template stateType
 */
export declare abstract class GenericStep<stateType> {
    protected _stepName: string;
    protected _state: stateType | null;
    protected _dependsOn: string[];
    protected _success: boolean;
    protected _skipped: boolean;
    protected _error: null | string;
    protected _stateOfDependencies: Map<string, unknown>;
    constructor(stepName: string, state?: stateType | null, dependsOn?: string[], success?: boolean, skipped?: boolean, error?: null | string);
    get stepName(): string;
    get state(): stateType | null;
    get dependsOn(): string[];
    get success(): boolean;
    get skipped(): boolean;
    get error(): null | string;
    get stateOfDependencies(): Map<string, unknown>;
    getStepResult(): ProcessStepStateInterface;
    onError(error: string): void;
    onSuccess(state?: stateType | null): void;
    onSkipped(): void;
    setStateOfDependencies(states: Map<string, unknown>): void;
    setInitialState(stepState: ProcessStepStateInterface): void;
    shouldRun(): boolean;
}
//# sourceMappingURL=GenericStep.d.ts.map