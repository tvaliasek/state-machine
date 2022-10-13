import { GenericProcess, GenericArrayStep, GenericStep, ProcessStepStateInterface, StepInterface, ArrayItemStepInterface, ProcessingState } from '../src'
import { describe, expect, test, beforeEach } from '@jest/globals'
import { processFactory, defaultState, Step, ArrayItemStep, Process, StepStateProvider, LongStep } from './implementation'

describe('GenericProcess basic implementation', () => {

    let process: Process

    beforeEach(() => {
        process = processFactory(
            [
                ...defaultState
            ],
            [
                new Step('s1'),
                new Step('s2'),
                new ArrayItemStep('as1', '1', ['s2']),
                new ArrayItemStep('as1', '2')
            ]
        )
    })

    test('could be constructed', () => {
        const foo = new Process('foo', [ new Step('s1'), new ArrayItemStep('as1', '1', null, ['s1']) ], new StepStateProvider())
        expect(foo).toBeInstanceOf(Process)
    })

    test('couldn\'t be constructed', () => {
        expect(() => new Process('foo', [ new Step('s1'), new ArrayItemStep('as1', '1', null, ['foo']) ], new StepStateProvider()))
            .toThrow('Invalid argument steps, step as1 depends on unknown step foo.') 
        expect(() => new Process('foo', [ new Step('s1'), new Step('s1'), new ArrayItemStep('as1', '1', null, []), new ArrayItemStep('as1', '1', null, []) ], new StepStateProvider()))
            .toThrow('Invalid argument steps, step s1 is included multiple times.')
        expect(() => new Process('foo', [ new Step('s1'), new ArrayItemStep('s1', '1', null, []) ], new StepStateProvider()))
            .toThrow('Invalid argument steps, step s1 is declared as both single and array item step.') 
        expect(() => new Process('foo', [ new Step('s1'), new ArrayItemStep('as1', '1', null, []), new ArrayItemStep('as1', '1', null, []) ], new StepStateProvider()))
            .toThrow('Invalid argument steps, step as1 contains duplicate itemIdentifier values.')
    })

    test('process cycle between states', async () => {
        const longStep = new LongStep('l1')
        const process = new Process('foo', [ longStep ], new StepStateProvider())
        expect(process.processingState).toBe(ProcessingState.Idle)
        const processPromise = process.run()
        expect(process.processingState).toBe(ProcessingState.Running)
        await processPromise
        expect(process.processingState).toBe(ProcessingState.Done)

        const failedLongStep = new LongStep('l1')
        failedLongStep.shouldFail = true
        const failedProcess = new Process('foo', [ failedLongStep ], new StepStateProvider())
        await failedProcess.run()
        await new Promise((resolve) => setTimeout(() => resolve(''), 30))
        expect(failedProcess.processingState).toBe(ProcessingState.Failed)
    })

    test('getter errror', async () => {
        const step = new Step('l1')
        step.shouldFail = true
        const process = new Process('foo', [ step ], new StepStateProvider())
        await process.run()
        expect(process.error).toBe('I was born to fail.')
    })

    test('can get input', async () => {
        expect(process.getProcessInput()).toEqual({ processedInputId: 'someId' })
    })

    test('setSteps', async () => {
        const longStep = new LongStep('l1')
        const process = new Process('foo', [ longStep ], new StepStateProvider())
        expect(process.processingState).toBe(ProcessingState.Idle)
        const processPromise = process.run()
        expect(process.processingState).toBe(ProcessingState.Running)
        expect(() => process.setSteps([ new Step('s1') ])).toThrow('Cannot change steps during run phase.')
        await processPromise
        
        process.setSteps([ new Step('s1') ])
        expect(process.steps).toStrictEqual([ new Step('s1') ])
    })

    test('getStepState', async () => {
        expect(await process.getStepState('foo')).toBe(null)
        expect(await process.getStepState('s1')).toStrictEqual(defaultState.filter(item => item.stepName === 's1')[0].state)
        expect(await process.getStepState('as1')).toStrictEqual(defaultState.filter(item => item.stepName === 'as1').map(item => item.state))
    })

    test('resolveStepDependencies', async () => {
        expect(await process.resolveStepDependencies(['s1']))
            .toStrictEqual(
                new Map([
                    [
                        's1',
                        defaultState.filter(item => item.stepName === 's1')[0].state
                    ]
                ])
            )

        expect(process.resolveStepDependencies(['as1']))
            .rejects
            .toThrow('Missing succeeded dependency state of step as1, item identifier: 1')

        await process.run()

        const expectedResult = defaultState.filter(item => item.stepName === 'as1').map(item => { 
            const state = item.state
            state.success = true
            return state
        })

        expect(await process.resolveStepDependencies(['as1']))
            .toStrictEqual(
                new Map([
                    [
                        'as1',
                        expectedResult
                    ]
                ])
            )
    })

    test('correct events are emitted', async () => {
        const events: Array<{ event: string, data: Record<string, any> }> = []

        process.on('start', (data) => {
            events.push({ event: 'start', data })
        })

        process.on('step-done', (data) => {
            events.push({ event: 'step-done', data })
        })

        process.on('step-error', (data) => {
            events.push({ event: 'step-error', data })
        })

        process.on('done', (data) => {
            events.push({ event: 'done', data })
        })
        
        await process.run()

        expect(events).toStrictEqual([
            { event: 'start', data: { processName: 'process' } },
            { 
                event: 'step-done',
                data: {
                    processName: 'process',
                    stepName: 's1',
                    itemIdentifier: null,
                    state: {
                        state: { result: 's1' },
                        success: true,
                        skipped: false,
                        error: false,
                        errorMessage: null,
                        itemIdentifier: null,
                        disabled: false
                    } 
                } 
            },
            { 
                event: 'step-done',
                data: {
                    processName: 'process',
                    stepName: 's2',
                    itemIdentifier: null,
                    state: {
                        state: { result: 's2' },
                        success: false,
                        skipped: true,
                        error: false,
                        errorMessage: null,
                        itemIdentifier: null,
                        disabled: false
                    } 
                } 
            },
            { 
                event: 'step-done',
                data: {
                    processName: 'process',
                    stepName: 'as1',
                    itemIdentifier: '1',
                    state: {
                        state: null,
                        success: true,
                        skipped: false,
                        error: false,
                        errorMessage: null,
                        itemIdentifier: '1',
                        disabled: false
                    } 
                } 
            },
            { 
                event: 'step-done',
                data: {
                    processName: 'process',
                    stepName: 'as1',
                    itemIdentifier: '2',
                    state: {
                        state: null,
                        success: true,
                        skipped: false,
                        error: false,
                        errorMessage: null,
                        itemIdentifier: '2',
                        disabled: false
                    } 
                } 
            },
            { event: 'done', data: { processName: 'process' } }
        ])
    })
})
 