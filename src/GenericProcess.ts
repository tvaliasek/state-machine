import { ArrayItemStepInterface, DependencyDeclaration, StepInterface } from './Step.interface'
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
export abstract class GenericProcess<TInput = unknown> extends EventEmitter implements ProcessInterface {
    protected _processingState: ProcessingState = ProcessingState.Idle
    protected _stepStates: ProcessStepStateInterface[] = []
    protected _error: string | null = null
    protected _steps: Array<StepInterface | ArrayItemStepInterface>

    constructor(
        public readonly processName: string,
        steps: Array<StepInterface | ArrayItemStepInterface>,
        protected readonly stepStateProvider: ProcessStateProviderInterface,
        protected processedInput: TInput | null = null
    ) {
        super()
        this._steps = steps
        this.processName = processName
        this.checkStepsValidity()
    }

    get steps(): Array<StepInterface | ArrayItemStepInterface> {
        return this._steps
    }

    getProcessInput(): TInput | null {
        return this.processedInput
    }

    public setSteps(steps: Array<StepInterface | ArrayItemStepInterface>): void {
        if (this._processingState === ProcessingState.Running) {
            throw new Error('Cannot change steps during run phase.')
        }
        this._steps = steps
        this.checkStepsValidity()
    }

    public async getStepState(stepName: string): Promise<ProcessStepStateInterface | ProcessStepStateInterface[] | null> {
        const isArrayStep = this.isArrayItemStep(stepName)
        const states = (await Promise.all(
            this._steps
                .filter(item => item.stepName === stepName)
                .map(
                    async item => await this.stepStateProvider.getStepState(
                        this.processName,
                        item.stepName,
                        (this.implementsArrayItemStepInterface(item) ? item.itemIdentifier : null)
                    )
                )
        )).filter((item): item is ProcessStepStateInterface => item !== null)
        if (states.length === 0) {
            return null
        }
        return isArrayStep ? states : states[0]
    }

    protected checkStepsValidity(): void {
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
                .filter((item): item is ArrayItemStepInterface => this.implementsArrayItemStepInterface(item) && item.stepName === stepName)
                .map(item => item.itemIdentifier)
            if (arrayStepIdentifiers.length !== [...new Set(arrayStepIdentifiers)].length) {
                throw new Error(`Invalid argument steps, step ${stepName} contains duplicate itemIdentifier values.`)
            }
        }
    }

    get error(): string | null {
        return this._error ?? null
    }

    get processingState(): ProcessingState {
        return this._processingState
    }

    protected implementsStepInterface(input: StepInterface | ArrayItemStepInterface): input is StepInterface {
        return 'stepName' in input
    }

    /**
     * @description Method that decides whether input implements ArrayItemStepInterface
     * @param input usually step
     */
    protected implementsArrayItemStepInterface(input: StepInterface | ArrayItemStepInterface): input is ArrayItemStepInterface {
        return 'itemIdentifier' in input
    }

    /**
     * @param {string} stepName
     * @returns {boolean}
     */
    protected isArrayItemStep(stepName: string): boolean {
        const arraySteps = this.steps.filter(step => step.stepName === stepName && this.implementsArrayItemStepInterface(step))
        return arraySteps.length > 0
    }

    protected async resolveStepDependencies(dependsOn: DependencyDeclaration): Promise<Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>> {
        const dependenciesStates: Array<[string, ProcessStepStateInterface | ProcessStepStateInterface[]]> = []
        for (const entry of dependsOn) {
            const dependencyStepName = (typeof entry === 'string') ? entry : entry.stepName
            const itemIdentifier = (typeof entry === 'string') ? undefined : entry.itemIdentifier
            let dependencyState: ProcessStepStateInterface | ProcessStepStateInterface[] | null
            if (this.isArrayItemStep(dependencyStepName)) {
                // retrieve dependency state for specific item in array item steps
                if (itemIdentifier !== undefined) {
                    dependencyState = await this.stepStateProvider.getStepState(this.processName, dependencyStepName, itemIdentifier)
                    if (!dependencyState || (!dependencyState.skipped && !dependencyState.success)) {
                        throw new Error(`Missing succeeded dependency state of step ${dependencyStepName} with itemIdentifier: ${itemIdentifier}`)
                    }
                } else {
                    // retrieve dependency state for all items in array item steps
                    const items = this.steps.filter((item): item is ArrayItemStepInterface => this.implementsArrayItemStepInterface(item) && item.stepName === dependencyStepName)
                    dependencyState = await Promise.all(
                        items.map(
                            async (item) => {
                                const state = await this.stepStateProvider.getStepState(this.processName, item.stepName, item.itemIdentifier)
                                if (!state || (!state.skipped && !state.success)) {
                                    throw new Error(`Missing succeeded dependency state of step ${dependencyStepName}${(state?.itemIdentifier != null) ? `, item identifier: ${state.itemIdentifier}` : ''}`)
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
    async run(throwError = false): Promise<void> {
        this.emit('start', { processName: this.processName })
        this._processingState = ProcessingState.Running
        // iterate over steps
        for (const step of this._steps) {
            // add reference to current process
            step.setProcessReference(this)
            // extract itemIdentifier with proper type narrowing
            const itemIdentifier = this.implementsArrayItemStepInterface(step) ? step.itemIdentifier : null
            try {
                // load previous state from db / another source
                const stepState = await this.stepStateProvider.getStepState(
                    this.processName,
                    step.stepName,
                    itemIdentifier
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
                    itemIdentifier
                })
                // perform unit of work
                const state = await step.doWork()
                // save unit of work result
                await this.stepStateProvider.setStepState(
                    this.processName,
                    step.stepName,
                    itemIdentifier,
                    state
                )
                this.emit('step-done', {
                    processName: this.processName,
                    stepName: step.stepName,
                    itemIdentifier,
                    state
                })
            } catch (error) {
                this._processingState = ProcessingState.Failed
                this._error = (error instanceof Error) ? error.message : `${error}`
                // save error state of step
                await this.stepStateProvider.setStepState(
                    this.processName,
                    step.stepName,
                    itemIdentifier,
                    step.getStepResult()
                )
                this.emit('step-error', {
                    processName: this.processName,
                    stepName: step.stepName,
                    itemIdentifier,
                    error
                })
                if (throwError) {
                    throw error
                }
                break
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
     * @param {(string|null)} [itemIdentifier=null] identifier of specific item in case of array item step
     * @param {boolean} [throwError=false] optional param which says whether to throw an exception
     * @returns {(Promise<ProcessStepStateInterface|null>)}
     * @memberof GenericProcess
     */
    async runStep(stepName: string, itemIdentifier: string | null = null, throwError = false, additionalArguments: Record<string, unknown> | null = null): Promise<ProcessStepStateInterface | null> {
        for (const step of this._steps) {
            // extract itemIdentifier with proper type narrowing
            const stepItemIdentifier = this.implementsArrayItemStepInterface(step) ? step.itemIdentifier : null
            const isArrayStep = stepItemIdentifier !== null
            if (
                step.stepName === stepName
                && (!isArrayStep || stepItemIdentifier === itemIdentifier)
            ) {
                // add reference to current process
                step.setProcessReference(this)
                try {
                    // load previous state from db / another source
                    const stepState = await this.stepStateProvider.getStepState(
                        this.processName,
                        step.stepName,
                        stepItemIdentifier
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
                        stepItemIdentifier,
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
                        stepItemIdentifier,
                        step.getStepResult()
                    )
                    if (throwError) {
                        throw error
                    }
                    return step.getStepResult()
                }
            }
        }
        return null
    }
}
