import { ProcessInterface } from './Process.interface'
import { ProcessStepStateInterface } from './ProcessStepState.interface'

export interface StepInterface<stateType> {
    get stepName (): string
    get state(): stateType|null
    get dependsOn (): Array<string|{ stepName: string, itemIdentifier: string|null }>
    get success (): boolean
    get skipped (): boolean
    get error (): null|string

    doWork(additionalArguments?: Record<string, any>): Promise<ProcessStepStateInterface>
    setStateOfDependencies(states: Map<string, ProcessStepStateInterface|ProcessStepStateInterface[]>): void
    setInitialState (stepState: ProcessStepStateInterface): void
    onSuccess(state: stateType|null): void
    onSkipped(state: stateType|null|undefined): void
    onError(errorMessage: string): void
    setProcessReference(process: ProcessInterface): void
    getStepResult (): ProcessStepStateInterface
}

export interface ArrayItemStepInterface<stateType> extends StepInterface<stateType> {
    get itemIdentifier (): string
}
