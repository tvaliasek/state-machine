export interface ProcessStepStateInterface {
    state: Record<string, any> | null;
    success: boolean;
    skipped: boolean;
    disabled: boolean;
    error: boolean;
    errorMessage?: string | null;
    itemIdentifier?: string | null;
}
//# sourceMappingURL=ProcessStepState.interface.d.ts.map