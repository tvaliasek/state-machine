import { ArrayItemStepInterface, StepInterface } from './Step.interface'
import { EventEmitter } from 'events'
import { ProcessStateProviderInterface } from './ProcessStateProvider.interface'
import { ProcessingState } from './ProcessingState.enum'
import { ProcessStepStateInterface } from './ProcessStepState.interface'
import { ProcessInterface } from './Process.interface'

/**
 * @classdesc Generic class representing parent class containing  steps which should be working on.
 * @extends EventEmitter
 * @description Final class should also implementes ProcessInterface.
 * @example
 * export class CreateClientProcess extends GenericProcess<ClientSessionPopulatedDocument> implements ProcessInterface {
    constructor (
        protected readonly stateProviderFactory: ProcessStateProviderFactory,
        public readonly processName: string = CreateClientProcess.name
    ) {
        super(
            processName,
            [],
            stateProviderFactory.getStepStateProvider(clientSession._id)
        )
        this._steps = this.generateSteps()
        this.checkStepsValidity()
    }
}
*
 */
export abstract class GenericProcess<inputType = unknown> extends EventEmitter implements ProcessInterface {
    protected _processingState: ProcessingState = ProcessingState.Idle
    protected _stepStates: ProcessStepStateInterface[] = []
    protected _error: string|null = null
    protected _steps: Array<StepInterface<unknown>|ArrayItemStepInterface<unknown>>

    constructor (
        public readonly processName: string,
        steps: Array<StepInterface<unknown>|ArrayItemStepInterface<unknown>>,
        protected readonly stepStateProvider: ProcessStateProviderInterface,
        protected readonly processedInput: inputType|null = null
    ) {
        super()
        this._steps = steps
        this.processName = processName
        this.checkStepsValidity()
    }

    get steps (): Array<StepInterface<unknown>|ArrayItemStepInterface<unknown>> {
        return this._steps
    }

    getProcessInput<processedInputType = inputType|null> (): processedInputType|null {
        return this.processedInput as processedInputType|null
    }

    public setSteps (steps: Array<StepInterface<unknown>|ArrayItemStepInterface<unknown>>): void {
        if (this._processingState === ProcessingState.Running) {
            throw new Error('Cannot change steps during run phase.')
        }
        this._steps = steps
        this.checkStepsValidity()
    }

    public async getStepState (stepName: string): Promise<ProcessStepStateInterface|ProcessStepStateInterface[]|null> {
        const isArrayStep = this.isArrayItemStep(stepName)
        const states = (await Promise.all(
            this._steps
                .filter(item => item.stepName === stepName)
                .map(
                    async (item) => await this.stepStateProvider.getStepState(
                        this.processName,
                        item.stepName,
                        (this.implementsArrayItemStepInterface(item) ? item.itemIdentifier : null)
                    )
                )
        )).filter(item => item)
        if (states.length === 0) {
            return null
        }
        return (isArrayStep) ? states as ProcessStepStateInterface[] : states[0] as ProcessStepStateInterface
    }

    protected checkStepsValidity (): void {
        const singleStepNames = [...new Set(this.steps.filter(item => !this.implementsArrayItemStepInterface(item)).map(item => item.stepName))]
        const arrayStepNames = [...new Set(this.steps.filter(item => this.implementsArrayItemStepInterface(item)).map(item => item.stepName))]
        for (const step of this.steps) {
            if (singleStepNames.includes(step.stepName) && arrayStepNames.includes(step.stepName)) {
                throw new Error(`Invalid argument steps, step ${step.stepName} is declared as both single and array item step.`)
            }
            for (const entry of step.dependsOn) {
                const dependencyName = (typeof entry === 'string') ? entry : entry.stepName
                if (!singleStepNames.includes(dependencyName) && !arrayStepNames.includes(dependencyName)) {
                    throw new Error(`Invalid argument steps, step ${step.stepName} depends on unknown step ${dependencyName}.`)
                }
            }
        }
        for (const stepName of singleStepNames) {
            if (this.steps.filter(item => !this.implementsArrayItemStepInterface(item) && item.stepName === stepName).length > 1) {
                throw new Error(`Invalid argument steps, step ${stepName} is included multiple times.`)
            }
        }
        for (const stepName of arrayStepNames) {
            const arrayStepIdentifiers: string[] = this.steps
                .filter(item => this.implementsArrayItemStepInterface(item) && item.stepName === stepName)
                .map((item: Record<string, any>) => item.itemIdentifier)
            if (arrayStepIdentifiers.length !== [...new Set(arrayStepIdentifiers)].length) {
                throw new Error(`Invalid argument steps, step ${stepName} contains duplicate itemIdentifier values.`)
            }
        }
    }

    get error (): string|null {
        return this._error ?? null
    }

    get processingState (): ProcessingState {
        return this._processingState
    }

    protected implementsStepInterface (input: any): input is StepInterface<unknown> {
        return (input as StepInterface<unknown>).stepName !== undefined
    }

    /**
     * @description Method that decides whether input implements StepInterface
     * @param input usually step
     */
    protected implementsArrayItemStepInterface (input: any): input is ArrayItemStepInterface<unknown> {
        return this.implementsStepInterface(input) && (input as ArrayItemStepInterface<unknown>).itemIdentifier !== undefined
    }

    /**
     * @param {string} stepName
     * @returns {boolean}
     */
    protected isArrayItemStep (stepName: string): boolean {
        const arraySteps = this.steps.filter(step => step.stepName === stepName && this.implementsArrayItemStepInterface(step))
        return arraySteps.length > 0
    }

    protected async resolveStepDependencies (dependsOn: Array<string|{ stepName: string, itemIdentifier: string|null }>): Promise<Map<string, ProcessStepStateInterface|ProcessStepStateInterface[]>> {
        const dependenciesStates: Array<[string, ProcessStepStateInterface|ProcessStepStateInterface[]]> = []
        for (const entry of dependsOn) {
            const dependencyStepName = (typeof entry === 'string') ? entry : entry.stepName
            const itemIdentifier = (typeof entry === 'string') ? undefined : entry.itemIdentifier
            let dependencyState = null
            if (this.isArrayItemStep(dependencyStepName)) {
                // retrieve dependency state for specific item in array item steps
                if (itemIdentifier !== undefined) {
                    dependencyState = await this.stepStateProvider.getStepState(this.processName, dependencyStepName, itemIdentifier)
                    if (!dependencyState || (!dependencyState.skipped && !dependencyState.success)) {
                        throw new Error(`Missing succeeded dependency state of step ${dependencyStepName} with itemIdentifier: ${itemIdentifier}`)
                    }
                } else {
                    // retrieve dependency state for all items in array item steps
                    const items = this.steps.filter(item => item.stepName === dependencyStepName) as Array<ArrayItemStepInterface<unknown>>
                    dependencyState = await Promise.all(
                        items.map(
                            async (item) => {
                                const state = await this.stepStateProvider.getStepState(this.processName, item.stepName, item.itemIdentifier)
                                if (!state || (!state.skipped && !state.success)) {
                                    throw new Error(`Missing succeeded dependency state of step ${dependencyStepName}${(state?.itemIdentifier) ? `, item identifier: ${state.itemIdentifier}` : ''}`)
                                }
                                return state
                            }
                        )
                    )
                }
            } else {
                dependencyState = await this.stepStateProvider.getStepState(this.processName, dependencyStepName, null)
                if (!dependencyState || (!dependencyState.skipped && !dependencyState.success)) {
                    throw new Error(`Missing succeeded dependency state of step ${dependencyStepName}.`)
                }
            }
            dependenciesStates.push([dependencyStepName, dependencyState])
        }
        return new Map(dependenciesStates)
    }

    /**
     * @description This method is used to run whole process of steps.
     * @param throwError optional param which says whether to throw an exception
     */
    async run (throwError = false): Promise<void> {
        this.emit('start', { processName: this.processName })
        this._processingState = ProcessingState.Running
        // iterate over steps
        for (const step of this._steps) {
            // check common interface
            if (this.implementsStepInterface(step)) {
                // add reference to current process
                step.setProcessReference(this)
                // check if step is array item step type
                const isArrayStep = this.implementsArrayItemStepInterface(step)
                try {
                    // load previous state from db / another source
                    const stepState = await this.stepStateProvider.getStepState(
                        this.processName,
                        step.stepName,
                        ((isArrayStep) ? step.itemIdentifier : null)
                    )
                    // hydrate previous state, if there is any
                    if (stepState) {
                        step.setInitialState(stepState)
                    }
                    // resolve and hydrate dependency datasets
                    if (step.dependsOn.length > 0) {
                        const dependenciesStates = await this.resolveStepDependencies(step.dependsOn)
                        step.setStateOfDependencies(dependenciesStates)
                    }
                    this.emit('step-start', {
                        processName: this.processName,
                        stepName: step.stepName,
                        itemIdentifier: ((isArrayStep) ? step.itemIdentifier : null)
                    })
                    // perform unit of work
                    const state = await step.doWork()
                    // save unit of work result
                    await this.stepStateProvider.setStepState(
                        this.processName,
                        step.stepName,
                        ((isArrayStep) ? step.itemIdentifier : null),
                        state
                    )
                    this.emit('step-done', {
                        processName: this.processName,
                        stepName: step.stepName,
                        itemIdentifier: ((isArrayStep) ? step.itemIdentifier : null),
                        state
                    })
                } catch (error) {
                    this.emit('step-error', {
                        processName: this.processName,
                        stepName: step.stepName,
                        itemIdentifier: ((isArrayStep) ? step.itemIdentifier : null),
                        error
                    })
                    this._processingState = ProcessingState.Failed
                    this._error = (error instanceof Error) ? error.message : `${error}`
                    // save error state of step
                    await this.stepStateProvider.setStepState(
                        this.processName,
                        step.stepName,
                        ((isArrayStep) ? step.itemIdentifier : null),
                        step.getStepResult()
                    )
                    if (throwError) {
                        throw error
                    }
                    break
                }
            }
        }
        if (this._processingState === ProcessingState.Running) {
            this._processingState = ProcessingState.Done
        }
        this.emit('done', { processName: this.processName })
    }

    /**
     * This method is used to run only specific step of process.
     * @param {string} stepName name of step
     * @param {(string|number|null)} [itemIdentifier=null] identifier of specific item in case of array item step
     * @param {boolean} [throwError=false] optional param which says whether to throw an exception
     * @returns {(Promise<ProcessStepStateInterface|null>)}
     * @memberof GenericProcess
     */
    async runStep (stepName: string, itemIdentifier: string|number|null = null, throwError = false, additionalArguments: null|Record<string, any> = null): Promise<ProcessStepStateInterface|null> {
        for (const step of this._steps) {
            // check common interface
            if (this.implementsStepInterface(step)) {
                // check if step is array item step type
                const isArrayStep = this.implementsArrayItemStepInterface(step)
                if (
                    step.stepName === stepName &&
                    (!isArrayStep || (isArrayStep && step.itemIdentifier === itemIdentifier))
                ) {
                    // add reference to current process
                    step.setProcessReference(this)
                    try {
                        // load previous state from db / another source
                        const stepState = await this.stepStateProvider.getStepState(
                            this.processName,
                            step.stepName,
                            ((isArrayStep) ? step.itemIdentifier : null)
                        )
                        // hydrate previous state, if there is any
                        if (stepState) {
                            step.setInitialState(stepState)
                        }
                        // resolve and hydrate dependency datasets
                        if (step.dependsOn.length > 0) {
                            const dependenciesStates = await this.resolveStepDependencies(step.dependsOn)
                            step.setStateOfDependencies(dependenciesStates)
                        }
                        // perform unit of work
                        const state = await step.doWork(additionalArguments ?? undefined)
                        // save unit of work result
                        await this.stepStateProvider.setStepState(
                            this.processName,
                            step.stepName,
                            ((isArrayStep) ? step.itemIdentifier : null),
                            state
                        )
                        return step.getStepResult()
                    } catch (error) {
                        this._processingState = ProcessingState.Failed
                        this._error = (error instanceof Error) ? error.message : `${error}`
                        // save error state of step
                        await this.stepStateProvider.setStepState(
                            this.processName,
                            step.stepName,
                            ((isArrayStep) ? step.itemIdentifier : null),
                            step.getStepResult()
                        )
                        if (throwError) {
                            throw error
                        }
                        return step.getStepResult()
                    }
                }
            }
        }
        return null
    }
}
