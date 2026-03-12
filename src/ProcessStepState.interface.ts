export interface ProcessStepStateInterface<TState extends Record<string, unknown> = Record<string, unknown>> {
    state: TState | null
    success: boolean
    skipped: boolean
    disabled: boolean
    error: boolean
    errorMessage: string | null
    itemIdentifier: string | null
}
