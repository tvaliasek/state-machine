export interface ProcessInterface {
    run (throwError: boolean): Promise<void>
}
