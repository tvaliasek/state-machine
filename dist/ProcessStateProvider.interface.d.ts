import { ProcessStepStateInterface } from './ProcessStepState.interface';
export interface ProcessStateProviderInterface {
    getStepState(processName: string, stepName: string, itemIdentifier: string | null): Promise<ProcessStepStateInterface | null>;
    setStepState(processName: string, stepName: string, itemIdentifier: string | null, stepState: ProcessStepStateInterface): Promise<void>;
}
//# sourceMappingURL=ProcessStateProvider.interface.d.ts.map