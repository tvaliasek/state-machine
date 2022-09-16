import { ProcessStepStateInterface } from "../../src"

export class MemoryStepStateProvider {
    constructor (
        public state: Map<string, ProcessStepStateInterface> = new Map([])
    ) {}

    async getStepState (processName: string, stepName: string, itemIdentifier: string|null): Promise<ProcessStepStateInterface|null> {
        const entry = this.state.get(`${processName}_${stepName}_${itemIdentifier}`)
        return entry ?? null
    }

    async setStepState (processName: string, stepName: string, itemIdentifier: string|null, stepState: ProcessStepStateInterface): Promise<void> {
        console.log(`State for process ${processName}, step ${stepName}, item ${itemIdentifier} has been set.`)
        this.state.set(`${processName}_${stepName}_${itemIdentifier}`, stepState)
    }
}