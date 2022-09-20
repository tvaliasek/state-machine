import { ProcessInterface } from './Process.interface';
import { ProcessStepStateInterface } from './ProcessStepState.interface';
export interface StepInterface<stateType> {
    get stepName(): string;
    get state(): stateType | null;
    get dependsOn(): string[];
    get success(): boolean;
    get skipped(): boolean;
    get error(): null | string;
    doWork(): Promise<ProcessStepStateInterface>;
    setStateOfDependencies(states: Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>): void;
    setInitialState(stepState: ProcessStepStateInterface): void;
    onSuccess(state: stateType | null): void;
    onSkipped(): void;
    onError(errorMessage: string): void;
    setProcessReference(process: ProcessInterface): void;
}
export interface ArrayItemStepInterface<stateType> extends StepInterface<stateType> {
    get itemIdentifier(): string;
}
//# sourceMappingURL=Step.interface.d.ts.map