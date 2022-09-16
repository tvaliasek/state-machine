import { GenericArrayStep, ArrayItemStepInterface, ProcessStepStateInterface } from "../../src"

export class ExampleArrayItemStep extends GenericArrayStep<Record<string, any>> implements ArrayItemStepInterface<Record<string, any>> {
    async doWork (): Promise<ProcessStepStateInterface> {
        try {
            if (!this.shouldRun()) {
                return this.getStepResult()
            }
            
            return await (new Promise((resolve, reject) => {
                setTimeout(
                    () => {
                        this.onSuccess(this.state)
                        console.log({ step: this.stepName, item: this.itemIdentifier })
                        resolve(this.getStepResult())
                    },
                    250
                )
            }))
        } catch (error) {
            this.onError(error.message)
            throw error
        }
    }
}