"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericStep = void 0;
/**
 * @classdesc Generic class representing step in finite state machine.
 * @template stateType
 */
class GenericStep {
    constructor(stepName, state = null, dependsOn = [], success = false, skipped = false, error = null) {
        this._stepName = stepName;
        this._state = state;
        this._dependsOn = dependsOn;
        this._success = success;
        this._skipped = skipped;
        this._error = error;
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
    get skipped() {
        return this._skipped;
    }
    get error() {
        return this._error;
    }
    get stateOfDependencies() {
        return this._stateOfDependencies;
    }
    getStepResult() {
        var _a;
        return {
            success: this.success,
            error: this.error !== null,
            errorMessage: (_a = this.error) !== null && _a !== void 0 ? _a : null,
            skipped: this.skipped,
            state: (this.state) ? Object.assign({}, this.state) : null,
            itemIdentifier: null
        };
    }
    onError(error) {
        this._error = error;
        this._skipped = false;
        this._success = false;
    }
    onSuccess(state = null) {
        this._error = null;
        this._skipped = false;
        this._success = true;
        this._state = state;
    }
    onSkipped() {
        this._error = null;
        this._skipped = true;
        this._success = false;
    }
    setStateOfDependencies(states) {
        this._stateOfDependencies = states;
    }
    setInitialState(stepState) {
        this._state = stepState.state;
        this._success = stepState.success;
        this._skipped = stepState.skipped;
    }
    shouldRun() {
        return !(this.success || this.skipped);
    }
}
exports.GenericStep = GenericStep;
//# sourceMappingURL=GenericStep.js.map