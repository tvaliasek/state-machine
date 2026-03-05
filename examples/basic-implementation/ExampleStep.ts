import { GenericStep, StepInterface, ProcessStepStateInterface } from '../../src'

export class ExampleStep extends GenericStep<Record<string, any>> implements StepInterface<Record<string, any>> {
    async doWork(): Promise<ProcessStepStateInterface> {
        try {
            if (!this.shouldRun()) {
                return this.getStepResult()
            }

            return await (new Promise<ProcessStepStateInterface>((resolve) => {
                setTimeout(
                    () => {
                        this.onSuccess(this.state)
                        console.log({ step: this.stepName, item: null })
                        resolve(this.getStepResult())
                    },
                    250
                )
            }))
        } catch (error) {
            this.onError((error as Error).message)
            throw error
        }
    }
}
