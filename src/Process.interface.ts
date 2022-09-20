export interface ProcessInterface<inputType = unknown> {
    run (throwError: boolean): Promise<void>
    getProcessInput<processInputType = inputType|null> (): processInputType|null
}
