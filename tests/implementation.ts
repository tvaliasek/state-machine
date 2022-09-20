import { GenericArrayStep, ArrayItemStepInterface, ProcessStepStateInterface, GenericStep, StepInterface, GenericProcess } from '../src'

export class ArrayItemStep extends GenericArrayStep<Record<string, any>> implements ArrayItemStepInterface<Record<string, any>> {
    public shouldFail = false
    
    doWork (): Promise<ProcessStepStateInterface> {
        if (!this.shouldRun()) {
            return Promise.resolve(this.getStepResult())
        }
        if (this.shouldFail) {
            this.onError('I was born to fail.')
            return Promise.reject(new Error('I was born to fail.'))
        }
        return new Promise((resolve, reject) => {
            setTimeout(
                () => {
                    this.onSuccess(this.state)
                    resolve(this.getStepResult())
                },
                250
            )
        })    
    }
}

export class Step extends GenericStep<Record<string, any>> implements StepInterface<Record<string, any>> {
    public shouldFail = false
    
    doWork (): Promise<ProcessStepStateInterface> {
        if (!this.shouldRun()) {
            return Promise.resolve(this.getStepResult())
        }
        if (this.shouldFail) {
            this.onError('I was born to fail.')
            return Promise.reject(new Error('I was born to fail.'))
        }
        return new Promise((resolve, reject) => {
            setTimeout(
                () => {
                    this.onSuccess(this.state)
                    resolve(this.getStepResult())
                },
                250
            )
        })    
    }
}

export class LongStep extends Step {
    doWork (): Promise<ProcessStepStateInterface> {
        if (this.shouldFail) {
            this.onError('error message')
            throw new Error('error message')
        }
        return new Promise((resolve) => { setTimeout(() => { this.onSuccess(); resolve(this.getStepResult()) }, (this.shouldFail) ? 0 : 1000) })
    }    
}

export class Process extends GenericProcess<Record<string, any>> {
    public async resolveStepDependencies(dependsOn: string[]): Promise<Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>> {
        return await super.resolveStepDependencies(dependsOn)
    }
}

export type InternalState = Array<{
    processName: string,
    stepName: string,
    itemIdentifier: string|null
    state: ProcessStepStateInterface
}>

export class StepStateProvider {
    constructor (
        public state: InternalState  = []
    ) {}

    async getStepState (processName: string, stepName: string, itemIdentifier: string|null): Promise<ProcessStepStateInterface|null> {
        const entry = this.state.find(item => item.processName === processName && item.stepName === stepName && item.itemIdentifier === itemIdentifier)
        return entry ? entry.state : null
    }

    async setStepState (processName: string, stepName: string, itemIdentifier: string|null, stepState: ProcessStepStateInterface): Promise<void> {
        if (await this.getStepState(processName, stepName, itemIdentifier) !== null) {
            this.state = this.state.map(item => {
                if (item.processName === processName && item.stepName === stepName && item.itemIdentifier === itemIdentifier) {
                    return {
                        ...item,
                        state: stepState
                    }
                }
                return item
            })
        } else {
            this.state.push({
                processName,
                stepName,
                itemIdentifier,
                state: stepState
            })
        }
    }
}

export const processFactory = (state: InternalState, steps: Array<Step|ArrayItemStep>, input: Record<string, any> = { processedInputId: 'someId' }): Process => {
    return new Process('process', steps, new StepStateProvider(state), input)
}

export const defaultState = [
    {
        processName: 'process2',
        stepName: 'foo',
        itemIdentifier: null,
        state: {
            state: null,
            success: true,
            skipped: false,
            error: false,
            errorMessage: null,
            itemIdentifier: null
        } 
    },
    {
        processName: 'process',
        stepName: 's1',
        itemIdentifier: null,
        state: {
            state: { result: 's1' },
            success: true,
            skipped: false,
            error: false,
            errorMessage: null,
            itemIdentifier: null
        }
    },
    {
        processName: 'process',
        stepName: 's2',
        itemIdentifier: null,
        state: {
            state: { result: 's2' },
            success: false,
            skipped: true,
            error: false,
            errorMessage: null,
            itemIdentifier: null
        }
    },
    {
        processName: 'process',
        stepName: 'as1',
        itemIdentifier: '1',
        state: {
            state: null,
            success: false,
            skipped: false,
            error: false,
            errorMessage: null,
            itemIdentifier: '1'
        }
    },
    {
        processName: 'process',
        stepName: 'as1',
        itemIdentifier: '2',
        state: {
            state: null,
            success: false,
            skipped: false,
            error: false,
            errorMessage: null,
            itemIdentifier: '2'
        }
    }
]
