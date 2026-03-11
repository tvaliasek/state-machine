export interface ProcessInterface<TInput = unknown> {
    run (throwError: boolean): Promise<void>
    getProcessInput<TProcessInput = TInput> (): TProcessInput | null
}
