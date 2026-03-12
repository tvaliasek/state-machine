export interface ProcessInterface<TInput = unknown> {
    readonly processName: string
    run (throwError: boolean): Promise<void>
    getProcessInput (): TInput | null
}
