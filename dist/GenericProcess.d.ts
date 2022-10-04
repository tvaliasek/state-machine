/// <reference types="node" />
import { ArrayItemStepInterface, StepInterface } from './Step.interface';
import { EventEmitter } from 'events';
import { ProcessStateProviderInterface } from './ProcessStateProvider.interface';
import { ProcessingState } from './ProcessingState.enum';
import { ProcessStepStateInterface } from './ProcessStepState.interface';
import { ProcessInterface } from './Process.interface';
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
export declare abstract class GenericProcess<inputType = unknown> extends EventEmitter implements ProcessInterface {
    readonly processName: string;
    protected readonly stepStateProvider: ProcessStateProviderInterface;
    protected readonly processedInput: inputType | null;
    protected _processingState: ProcessingState;
    protected _stepStates: ProcessStepStateInterface[];
    protected _error: string | null;
    protected _steps: Array<StepInterface<unknown> | ArrayItemStepInterface<unknown>>;
    constructor(processName: string, steps: Array<StepInterface<unknown> | ArrayItemStepInterface<unknown>>, stepStateProvider: ProcessStateProviderInterface, processedInput?: inputType | null);
    get steps(): Array<StepInterface<unknown> | ArrayItemStepInterface<unknown>>;
    getProcessInput<processedInputType = inputType | null>(): processedInputType | null;
    setSteps(steps: Array<StepInterface<unknown> | ArrayItemStepInterface<unknown>>): void;
    getStepState(stepName: string): Promise<ProcessStepStateInterface | ProcessStepStateInterface[] | null>;
    protected checkStepsValidity(): void;
    get error(): string | null;
    get processingState(): ProcessingState;
    protected implementsStepInterface(input: any): input is StepInterface<unknown>;
    /**
     * @description Method that decides whether input implements StepInterface
     * @param input usually step
     */
    protected implementsArrayItemStepInterface(input: any): input is ArrayItemStepInterface<unknown>;
    /**
     * @param {string} stepName
     * @returns {boolean}
     */
    protected isArrayItemStep(stepName: string): boolean;
    protected resolveStepDependencies(dependsOn: Array<string | {
        stepName: string;
        itemIdentifier: string | null;
    }>): Promise<Map<string, ProcessStepStateInterface | ProcessStepStateInterface[]>>;
    /**
     * @description This method is used to run whole process of steps.
     * @param throwError optional param which says whether to throw an exception
     */
    run(throwError?: boolean): Promise<void>;
    /**
     * This method is used to run only specific step of process.
     * @param {string} stepName name of step
     * @param {(string|number|null)} [itemIdentifier=null] identifier of specific item in case of array item step
     * @param {boolean} [throwError=false] optional param which says whether to throw an exception
     * @returns {(Promise<ProcessStepStateInterface|null>)}
     * @memberof GenericProcess
     */
    runStep(stepName: string, itemIdentifier?: string | number | null, throwError?: boolean): Promise<ProcessStepStateInterface | null>;
}
//# sourceMappingURL=GenericProcess.d.ts.map