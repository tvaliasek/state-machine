# Generic state machine

A simple but useful DIY framework for building state machines. We use it in several projects for complex user data exports to integrated business systems.

## Basic concepts

Using this library, you can arrange multiple units of work - "**steps**" in processing pipeline - "**process**". Each step can be dependent on other steps state and produces its own state. This state is then persisted and retrieved by process state provider, which must be implemented. Each step can end in one of three states - success, skipped or failed.

## Usage

1. Install package

``` sh
$ npm install @tvaliasek/state-machine
```

2. Bring your own classes that implement the appropriate interface (see the docs below), you can extend generic abstract classes and run the process.

``` ts
import { GenericProcess } from "../../src";
import { ExampleArrayItemStep } from "./ExampleArrayItemStep";
import { ExampleStep } from "./ExampleStep";
import { MemoryStepStateProvider } from './MemoryStepStateProvider'

class Process extends GenericProcess {}

const stateProvider = new MemoryStepStateProvider()

const instance = new Process(
    'exampleProcess', 
    [
        new ExampleStep('step1'),
        new ExampleStep('step2'),
        new ExampleArrayItemStep('arrayItemStep1', '1'),
        new ExampleArrayItemStep('arrayItemStep1', '2'),
        new ExampleArrayItemStep('arrayItemStep1', '3')
    ],
    stateProvider
)

instance.run()
    .then(() => {
        console.log('Process has been finished')
    }).catch((error) => {
        console.error(error)
    })
```

## The docs below :)

### Classes

There are several basic abstract classes to extend from.

#### GenericProcess
This is the main class containing all the logic needed to run all steps, validate and resolve their dependencies and retrieve and save step states. If you do not need anything custom, you can simply extend it.

*Example:*

``` ts
import { GenericProcess } from "@tvaliasek/state-machine"

class Process extends GenericProcess {}
```

#### GenericStep
Abstract class representing common step. You can customize inner logic to your needs, but you must implement at least doWork method. And you probably want to customize shouldRun method. Its state is maintained by combination of process name and step name.

*Example:*

``` ts
import { GenericStep, StepInterface, ProcessStepStateInterface } from "@tvaliasek/state-machine"

export class ExampleStep extends GenericStep<Record<string, any>> implements StepInterface<Record<string, any>> {
    async doWork (): Promise<ProcessStepStateInterface> {
        try {
            if (!this.shouldRun()) {
                return this.getStepResult()
            }
            
            return await (new Promise((resolve, reject) => {
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
            this.onError(error.message)
            throw error
        }
    }
}
```

#### GenericArrayStep
GenericArrayStep is just like GenericStep, but it is meant to be used as one step repeatedly used on multiple items. For this reason, its state is maintained by combination of process name, step name and specific processed item identifier. 

*Example:*

``` ts
import { GenericArrayStep, ArrayItemStepInterface, ProcessStepStateInterface } from "@tvaliasek/state-machine"

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
```

### State provider

State provider could be instance of class implementing two methods:

``` ts
export interface ProcessStateProviderInterface {
    getStepState (processName: string, stepName: string, itemIdentifier: string|null): Promise<ProcessStepStateInterface|null>
    setStepState (processName: string, stepName: string, itemIdentifier: string|null, stepState: ProcessStepStateInterface): Promise<void>
}
```
*Example:*
``` ts
import { ProcessStepStateInterface } from "@tvaliasek/state-machine"

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
```

In our case, we use factory methods to instantiate state providers scoped to specific record of processed items.

*Example:*
``` ts
import { ProcessStepStateInterface } from "@tvaliasek/state-machine"

export class ScopedMemoryStepStateProvider {
    constructor (
        protected readonly processedItemId: string,
        public state: Map<string, ProcessStepStateInterface> = new Map([])
    ) {}

    async getStepState (processName: string, stepName: string, itemIdentifier: string|null): Promise<ProcessStepStateInterface|null> {
        const entry = this.state.get(`${this.processedItemId}_${processName}_${stepName}_${itemIdentifier}`)
        return entry ?? null
    }

    async setStepState (processName: string, stepName: string, itemIdentifier: string|null, stepState: ProcessStepStateInterface): Promise<void> {
        console.log(`State for process ${processName}, step ${stepName}, item ${itemIdentifier} has been set.`)
        this.state.set(`${this.processedItemId}_${processName}_${stepName}_${itemIdentifier}`, stepState)
    }

    // factory method
    public static createForRecord (id: string): ScopedMemoryStepStateProvider {
        return new ScopedMemoryStepStateProvider(id)
    }
}

const stateProvider = ScopedMemoryStepStateProvider.createForRecord('someId')

```
