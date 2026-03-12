import { GenericStep, ProcessStepStateInterface } from '../src'
import { describe, expect, test } from '@jest/globals'
import { processFactory } from './implementation'

class NormalStep extends GenericStep<Record<string, any>> {
    doWork(): Promise<ProcessStepStateInterface<Record<string, any>>> {
        return Promise.resolve(this.getStepResult())
    }
}

describe('GenericStep basic implementation', () => {
    test('getters for coverage', () => {
        const step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            true,
            false,
            null
        )
        expect(step.stepName).toBe('fooStep')
        expect(step.dependsOn).toStrictEqual([])
    })

    test('getStepResult', () => {
        let step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            true,
            false,
            null
        )
        expect(step.getStepResult()).toEqual({
            success: true,
            error: false,
            errorMessage: null,
            skipped: false,
            state: { result: 'foo' },
            itemIdentifier: null,
            disabled: false
        })

        step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            false,
            false,
            'error message'
        )
        expect(step.getStepResult()).toEqual({
            success: false,
            error: true,
            errorMessage: 'error message',
            skipped: false,
            state: { result: 'foo' },
            itemIdentifier: null,
            disabled: false
        })

        step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            false,
            true,
            null
        )
        expect(step.getStepResult()).toEqual({
            success: false,
            error: false,
            errorMessage: null,
            skipped: true,
            state: { result: 'foo' },
            itemIdentifier: null,
            disabled: false
        })
    })

    test('onError', () => {
        const step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            true,
            true,
            null
        )
        step.onError('error message')
        expect(step.getStepResult()).toEqual({
            success: false,
            error: true,
            errorMessage: 'error message',
            skipped: false,
            state: { result: 'foo' },
            itemIdentifier: null,
            disabled: false
        })
    })

    test('onSuccess', () => {
        const step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            false,
            false,
            null
        )
        step.onSuccess({ result: 'bar' })
        expect(step.getStepResult()).toEqual({
            success: true,
            error: false,
            errorMessage: null,
            skipped: false,
            state: { result: 'bar' },
            itemIdentifier: null,
            disabled: false
        })
    })

    test('onSkipped', () => {
        const step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            true,
            false,
            null
        )
        step.onSkipped({ result: 'bar' })
        expect(step.getStepResult()).toEqual({
            success: false,
            error: false,
            errorMessage: null,
            skipped: true,
            state: { result: 'bar' },
            itemIdentifier: null,
            disabled: false
        })
    })

    test('setStateOfDependencies', () => {
        const step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            false,
            false,
            null
        )
        step.setStateOfDependencies(new Map([['barStep', {
            state: { barStepState: 'bar' },
            success: true,
            skipped: false,
            error: false,
            errorMessage: null,
            itemIdentifier: null,
            disabled: false
        }]]))
        expect(step.stateOfDependencies).toStrictEqual(
            new Map([['barStep', {
                state: { barStepState: 'bar' },
                success: true,
                skipped: false,
                error: false,
                errorMessage: null,
                itemIdentifier: null,
                disabled: false
            }]])
        )
    })

    test('setInitialState', () => {
        const step = new NormalStep(
            'fooStep',
            {},
            [],
            false,
            false,
            null
        )
        step.setInitialState({
            state: { result: 'foo' },
            success: true,
            skipped: false,
            error: false,
            errorMessage: null,
            itemIdentifier: null,
            disabled: false
        })
        expect(step.getStepResult()).toEqual(
            {
                success: true,
                error: false,
                errorMessage: null,
                skipped: false,
                state: { result: 'foo' },
                itemIdentifier: null,
                disabled: false
            }
        )
    })

    test('shouldRun', () => {
        const step = new NormalStep(
            'fooStep',
            {},
            [],
            false,
            false,
            null
        )
        step.setInitialState({
            state: { result: 'foo' },
            success: false,
            skipped: false,
            error: false,
            errorMessage: null,
            itemIdentifier: null,
            disabled: false
        })
        expect(step.shouldRun()).toBe(true)
        step.setInitialState({
            state: { result: 'foo' },
            success: true,
            skipped: false,
            error: false,
            errorMessage: null,
            itemIdentifier: null,
            disabled: false
        })
        expect(step.shouldRun()).toBe(false)
        step.setInitialState({
            state: { result: 'foo' },
            success: false,
            skipped: true,
            error: false,
            errorMessage: null,
            itemIdentifier: null,
            disabled: false
        })
        expect(step.shouldRun()).toBe(false)
        step.setInitialState({
            state: { result: 'foo' },
            success: true,
            skipped: true,
            error: false,
            errorMessage: null,
            itemIdentifier: null,
            disabled: false
        })
        step.onError('some error')
        expect(step.shouldRun()).toBe(true)
    })

    test('step can access process and input', () => {
        const process = processFactory([], [])
        const step = new NormalStep(
            'fooStep',
            {},
            [],
            false,
            false,
            null
        )
        step.setProcessReference(process)
        expect(step.process).toStrictEqual(process)
        expect(step.process?.getProcessInput()).toStrictEqual({ processedInputId: 'someId' })
    })
})
