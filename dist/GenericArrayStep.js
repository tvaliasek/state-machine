"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericArrayStep = void 0;
const GenericStep_1 = require("./GenericStep");
/**
 * @classdesc Generic class representing same multiple steps in finite state machine.
 * @extends GenericStep
 */
class GenericArrayStep extends GenericStep_1.GenericStep {
    constructor(stepName, itemIdentifier, state = null, dependsOn = [], success = false, skipped = false, error = null, disabled = false) {
        super(stepName, state, dependsOn, success, skipped, error, disabled);
        if (!itemIdentifier) {
            throw new Error('Bad arguments: missing required identifier');
        }
        this._itemIdentifier = `${itemIdentifier}`;
    }
    get itemIdentifier() {
        return this._itemIdentifier;
    }
    getStepResult() {
        return {
            success: this.success,
            error: this.error !== null,
            errorMessage: this.error,
            skipped: this.skipped,
            state: (this.state) ? Object.assign({}, this.state) : null,
            itemIdentifier: this.itemIdentifier,
            disabled: this.disabled
        };
    }
    setInitialState(stepState) {
        super.setInitialState(stepState);
        if (!stepState.itemIdentifier) {
            throw new Error('Bad arguments: missing required identifier');
        }
        this._itemIdentifier = stepState.itemIdentifier;
    }
}
exports.GenericArrayStep = GenericArrayStep;
//# sourceMappingURL=GenericArrayStep.js.map