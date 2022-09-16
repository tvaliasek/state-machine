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
