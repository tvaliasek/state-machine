import { GenericStep } from '../src'
import { describe, expect, test, beforeEach } from '@jest/globals'

class NormalStep extends GenericStep<Record<string, any>> {}

describe('GenericStep basic implementation', () => {

    test('getters for coverage', () => {
        let step = new NormalStep(
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
            itemIdentifier: null
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
            itemIdentifier: null
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
            itemIdentifier: null
        })
    })

    test('onError', () => {
        let step = new NormalStep(
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
            itemIdentifier: null
        })
    })

    test('onSuccess', () => {
        let step = new NormalStep(
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
            itemIdentifier: null
        })
    })

    test('onSkipped', () => {
        let step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            true,
            false,
            null
        )
        step.onSkipped()
        expect(step.getStepResult()).toEqual({
            success: false,
            error: false,
            errorMessage: null,
            skipped: true,
            state: { result: 'foo' },
            itemIdentifier: null
        })
    })

    test('setStateOfDependencies', () => {
        let step = new NormalStep(
            'fooStep',
            { result: 'foo' },
            [],
            false,
            false,
            null
        )
        step.setStateOfDependencies(new Map([['barStep', { barStepState: 'bar' }]]))
        expect(step.stateOfDependencies).toStrictEqual(
            new Map([['barStep', { barStepState: 'bar' }]])
        )
    })

    test('setInitialState', () => {
        let step = new NormalStep(
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
            error: false 
        })
        expect(step.getStepResult()).toEqual(
            {
                success: true,
                error: false,
                errorMessage: null,
                skipped: false,
                state: { result: 'foo' },
                itemIdentifier: null
            }
        )
    })

    test('shouldRun', () => {
        let step = new NormalStep(
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
            error: false 
        })
        expect(step.shouldRun()).toBe(true)
        step.setInitialState({
            state: { result: 'foo' },
            success: true,
            skipped: false,
            error: false 
        })
        expect(step.shouldRun()).toBe(false)
        step.setInitialState({
            state: { result: 'foo' },
            success: false,
            skipped: true,
            error: false 
        })
        expect(step.shouldRun()).toBe(false)
        step.setInitialState({
            state: { result: 'foo' },
            success: true,
            skipped: true,
            error: false 
        })
        step.onError('some error')
        expect(step.shouldRun()).toBe(true)
    })

})
