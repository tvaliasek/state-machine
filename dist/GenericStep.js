"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericStep = void 0;
/**
 * @classdesc Generic class representing step in finite state machine.
 * @template stateType
 */
class GenericStep {
    constructor(stepName, state = null, dependsOn = [], success = false, skipped = false, error = null, disabled = false) {
        this._process = null;
        this._stepName = stepName;
        this._state = state;
        this._dependsOn = dependsOn;
        this._success = success;
        this._skipped = skipped;
        this._error = error;
        this._disabled = disabled;
        this._stateOfDependencies = new Map();
    }
    get stepName() {
        return this._stepName;
    }
    get state() {
        return this._state;
    }
    get dependsOn() {
        return this._dependsOn;
    }
    get success() {
        return this._success;
    }
    get disabled() {
        return this._disabled;
    }
    get skipped() {
        return this._skipped;
    }
    get error() {
        return this._error;
    }
    get stateOfDependencies() {
        return this._stateOfDependencies;
    }
    get process() {
        return this._process;
    }
    setProcessReference(process) {
        this._process = process;
    }
    getStepResult() {
        var _a;
        return {
            success: this.success,
            error: this.error !== null,
            errorMessage: (_a = this.error) !== null && _a !== void 0 ? _a : null,
            skipped: this.skipped,
            state: (this.state) ? Object.assign({}, this.state) : null,
            itemIdentifier: null,
            disabled: this.disabled
        };
    }
    onError(error) {
        this._error = error;
        this._skipped = false;
        this._success = false;
        this._disabled = false;
    }
    onSuccess(state = null) {
        this._error = null;
        this._skipped = false;
        this._success = true;
        this._disabled = false;
        this._state = state;
    }
    onSkipped(state = undefined) {
        this._error = null;
        this._skipped = true;
        this._success = false;
        this._disabled = false;
        if (state !== undefined) {
            this._state = state;
        }
    }
    setStateOfDependencies(states) {
        this._stateOfDependencies = states;
    }
    setInitialState(stepState) {
        this._state = stepState.state;
        this._success = stepState.success;
        this._skipped = stepState.skipped;
        this._disabled = stepState.disabled;
    }
    shouldRun() {
        return !(this.success || this.skipped || this.disabled);
    }
}
exports.GenericStep = GenericStep;
//# sourceMappingURL=GenericStep.js.map