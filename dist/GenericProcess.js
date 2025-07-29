"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericProcess = void 0;
const events_1 = require("events");
const ProcessingState_enum_1 = require("./ProcessingState.enum");
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
class GenericProcess extends events_1.EventEmitter {
    constructor(processName, steps, stepStateProvider, processedInput = null) {
        super();
        this.processName = processName;
        this.stepStateProvider = stepStateProvider;
        this.processedInput = processedInput;
        this._processingState = ProcessingState_enum_1.ProcessingState.Idle;
        this._stepStates = [];
        this._error = null;
        this._steps = steps;
        this.processName = processName;
        this.checkStepsValidity();
    }
    get steps() {
        return this._steps;
    }
    getProcessInput() {
        return this.processedInput;
    }
    setSteps(steps) {
        if (this._processingState === ProcessingState_enum_1.ProcessingState.Running) {
            throw new Error('Cannot change steps during run phase.');
        }
        this._steps = steps;
        this.checkStepsValidity();
    }
    getStepState(stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            const isArrayStep = this.isArrayItemStep(stepName);
            const states = (yield Promise.all(this._steps
                .filter(item => item.stepName === stepName)
                .map((item) => __awaiter(this, void 0, void 0, function* () {
                return yield this.stepStateProvider.getStepState(this.processName, item.stepName, (this.implementsArrayItemStepInterface(item) ? item.itemIdentifier : null));
            })))).filter(item => item);
            if (states.length === 0) {
                return null;
            }
            return (isArrayStep) ? states : states[0];
        });
    }
    checkStepsValidity() {
        const singleStepNames = [...new Set(this.steps.filter(item => !this.implementsArrayItemStepInterface(item)).map(item => item.stepName))];
        const arrayStepNames = [...new Set(this.steps.filter(item => this.implementsArrayItemStepInterface(item)).map(item => item.stepName))];
        for (const step of this.steps) {
            if (singleStepNames.includes(step.stepName) && arrayStepNames.includes(step.stepName)) {
                throw new Error(`Invalid argument steps, step ${step.stepName} is declared as both single and array item step.`);
            }
            for (const entry of step.dependsOn) {
                const dependencyName = (typeof entry === 'string') ? entry : entry.stepName;
                if (!singleStepNames.includes(dependencyName) && !arrayStepNames.includes(dependencyName)) {
                    throw new Error(`Invalid argument steps, step ${step.stepName} depends on unknown step ${dependencyName}.`);
                }
            }
        }
        for (const stepName of singleStepNames) {
            if (this.steps.filter(item => !this.implementsArrayItemStepInterface(item) && item.stepName === stepName).length > 1) {
                throw new Error(`Invalid argument steps, step ${stepName} is included multiple times.`);
            }
        }
        for (const stepName of arrayStepNames) {
            const arrayStepIdentifiers = this.steps
                .filter(item => this.implementsArrayItemStepInterface(item) && item.stepName === stepName)
                .map((item) => item.itemIdentifier);
            if (arrayStepIdentifiers.length !== [...new Set(arrayStepIdentifiers)].length) {
                throw new Error(`Invalid argument steps, step ${stepName} contains duplicate itemIdentifier values.`);
            }
        }
    }
    get error() {
        var _a;
        return (_a = this._error) !== null && _a !== void 0 ? _a : null;
    }
    get processingState() {
        return this._processingState;
    }
    implementsStepInterface(input) {
        return input.stepName !== undefined;
    }
    /**
     * @description Method that decides whether input implements StepInterface
     * @param input usually step
     */
    implementsArrayItemStepInterface(input) {
        return this.implementsStepInterface(input) && input.itemIdentifier !== undefined;
    }
    /**
     * @param {string} stepName
     * @returns {boolean}
     */
    isArrayItemStep(stepName) {
        const arraySteps = this.steps.filter(step => step.stepName === stepName && this.implementsArrayItemStepInterface(step));
        return arraySteps.length > 0;
    }
    resolveStepDependencies(dependsOn) {
        return __awaiter(this, void 0, void 0, function* () {
            const dependenciesStates = [];
            for (const entry of dependsOn) {
                const dependencyStepName = (typeof entry === 'string') ? entry : entry.stepName;
                const itemIdentifier = (typeof entry === 'string') ? undefined : entry.itemIdentifier;
                let dependencyState = null;
                if (this.isArrayItemStep(dependencyStepName)) {
                    // retrieve dependency state for specific item in array item steps
                    if (itemIdentifier !== undefined) {
                        dependencyState = yield this.stepStateProvider.getStepState(this.processName, dependencyStepName, itemIdentifier);
                        if (!dependencyState || (!dependencyState.skipped && !dependencyState.success)) {
                            throw new Error(`Missing succeeded dependency state of step ${dependencyStepName} with itemIdentifier: ${itemIdentifier}`);
                        }
                    }
                    else {
                        // retrieve dependency state for all items in array item steps
                        const items = this.steps.filter(item => item.stepName === dependencyStepName);
                        dependencyState = yield Promise.all(items.map((item) => __awaiter(this, void 0, void 0, function* () {
                            const state = yield this.stepStateProvider.getStepState(this.processName, item.stepName, item.itemIdentifier);
                            if (!state || (!state.skipped && !state.success)) {
                                throw new Error(`Missing succeeded dependency state of step ${dependencyStepName}${(state === null || state === void 0 ? void 0 : state.itemIdentifier) ? `, item identifier: ${state.itemIdentifier}` : ''}`);
                            }
                            return state;
                        })));
                    }
                }
                else {
                    dependencyState = yield this.stepStateProvider.getStepState(this.processName, dependencyStepName, null);
                    if (!dependencyState || (!dependencyState.skipped && !dependencyState.success)) {
                        throw new Error(`Missing succeeded dependency state of step ${dependencyStepName}.`);
                    }
                }
                dependenciesStates.push([dependencyStepName, dependencyState]);
            }
            return new Map(dependenciesStates);
        });
    }
    /**
     * @description This method is used to run whole process of steps.
     * @param throwError optional param which says whether to throw an exception
     */
    run(throwError = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emit('start', { processName: this.processName });
            this._processingState = ProcessingState_enum_1.ProcessingState.Running;
            // iterate over steps
            for (const step of this._steps) {
                // check common interface
                if (this.implementsStepInterface(step)) {
                    // add reference to current process
                    step.setProcessReference(this);
                    // check if step is array item step type
                    const isArrayStep = this.implementsArrayItemStepInterface(step);
                    try {
                        // load previous state from db / another source
                        const stepState = yield this.stepStateProvider.getStepState(this.processName, step.stepName, ((isArrayStep) ? step.itemIdentifier : null));
                        // hydrate previous state, if there is any
                        if (stepState) {
                            step.setInitialState(stepState);
                        }
                        // resolve and hydrate dependency datasets
                        if (step.dependsOn.length > 0) {
                            const dependenciesStates = yield this.resolveStepDependencies(step.dependsOn);
                            step.setStateOfDependencies(dependenciesStates);
                        }
                        this.emit('step-start', {
                            processName: this.processName,
                            stepName: step.stepName,
                            itemIdentifier: ((isArrayStep) ? step.itemIdentifier : null)
                        });
                        // perform unit of work
                        const state = yield step.doWork();
                        // save unit of work result
                        yield this.stepStateProvider.setStepState(this.processName, step.stepName, ((isArrayStep) ? step.itemIdentifier : null), state);
                        this.emit('step-done', {
                            processName: this.processName,
                            stepName: step.stepName,
                            itemIdentifier: ((isArrayStep) ? step.itemIdentifier : null),
                            state
                        });
                    }
                    catch (error) {
                        this.emit('step-error', {
                            processName: this.processName,
                            stepName: step.stepName,
                            itemIdentifier: ((isArrayStep) ? step.itemIdentifier : null),
                            error
                        });
                        this._processingState = ProcessingState_enum_1.ProcessingState.Failed;
                        this._error = (error instanceof Error) ? error.message : `${error}`;
                        // save error state of step
                        yield this.stepStateProvider.setStepState(this.processName, step.stepName, ((isArrayStep) ? step.itemIdentifier : null), step.getStepResult());
                        if (throwError) {
                            throw error;
                        }
                        break;
                    }
                }
            }
            if (this._processingState === ProcessingState_enum_1.ProcessingState.Running) {
                this._processingState = ProcessingState_enum_1.ProcessingState.Done;
            }
            this.emit('done', { processName: this.processName });
        });
    }
    /**
     * This method is used to run only specific step of process.
     * @param {string} stepName name of step
     * @param {(string|number|null)} [itemIdentifier=null] identifier of specific item in case of array item step
     * @param {boolean} [throwError=false] optional param which says whether to throw an exception
     * @returns {(Promise<ProcessStepStateInterface|null>)}
     * @memberof GenericProcess
     */
    runStep(stepName, itemIdentifier = null, throwError = false, additionalArguments = null) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const step of this._steps) {
                // check common interface
                if (this.implementsStepInterface(step)) {
                    // check if step is array item step type
                    const isArrayStep = this.implementsArrayItemStepInterface(step);
                    if (step.stepName === stepName &&
                        (!isArrayStep || (isArrayStep && step.itemIdentifier === itemIdentifier))) {
                        // add reference to current process
                        step.setProcessReference(this);
                        try {
                            // load previous state from db / another source
                            const stepState = yield this.stepStateProvider.getStepState(this.processName, step.stepName, ((isArrayStep) ? step.itemIdentifier : null));
                            // hydrate previous state, if there is any
                            if (stepState) {
                                step.setInitialState(stepState);
                            }
                            // resolve and hydrate dependency datasets
                            if (step.dependsOn.length > 0) {
                                const dependenciesStates = yield this.resolveStepDependencies(step.dependsOn);
                                step.setStateOfDependencies(dependenciesStates);
                            }
                            // perform unit of work
                            const state = yield step.doWork(additionalArguments !== null && additionalArguments !== void 0 ? additionalArguments : undefined);
                            // save unit of work result
                            yield this.stepStateProvider.setStepState(this.processName, step.stepName, ((isArrayStep) ? step.itemIdentifier : null), state);
                            return step.getStepResult();
                        }
                        catch (error) {
                            this._processingState = ProcessingState_enum_1.ProcessingState.Failed;
                            this._error = (error instanceof Error) ? error.message : `${error}`;
                            // save error state of step
                            yield this.stepStateProvider.setStepState(this.processName, step.stepName, ((isArrayStep) ? step.itemIdentifier : null), step.getStepResult());
                            if (throwError) {
                                throw error;
                            }
                            return step.getStepResult();
                        }
                    }
                }
            }
            return null;
        });
    }
}
exports.GenericProcess = GenericProcess;
//# sourceMappingURL=GenericProcess.js.map