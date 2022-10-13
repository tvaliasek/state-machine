import { GenericArrayStep } from '../src'
import { describe, expect, test } from '@jest/globals'

class NormalArrayStep extends GenericArrayStep<Record<string, any>> {}

describe('GenericArrayStep basic implementation', () => {

    test('getters for coverage', () => {
        let step = new NormalArrayStep(
            'fooStep',
            'someId',
            { result: 'foo' },
            [],
            true,
            false,
            null
        )
        expect(step.itemIdentifier).toBe('someId')
    })

    test('falsy itemIdentifier throws exception', () => {
        expect(() => new NormalArrayStep(
            'fooStep',
            '',
            { result: 'foo' },
            [],
            true,
            false,
            null
        )).toThrow('Bad arguments: missing required identifier')
    })

    test('getStepResult', () => {
        let step = new NormalArrayStep(
            'fooStep',
            'someId',
            { result: 'foo' },
            [],
            true,
            false,
            null,
            false
        )
        expect(step.getStepResult()).toEqual({
            success: true,
            error: false,
            errorMessage: null,
            skipped: false,
            state: { result: 'foo' },
            itemIdentifier: 'someId',
            disabled: false
        })
    })

    
    test('setInitialState', () => {
        let step = new NormalArrayStep(
            'fooStep',
            'id',
            {},
            [],
            false,
            false,
            null,
            false
        )
        step.setInitialState({
            state: { result: 'foo' },
            success: true,
            skipped: false,
            error: false,
            itemIdentifier: 'someId',
            disabled: false
        })
        expect(step.getStepResult()).toEqual(
            {
                success: true,
                error: false,
                errorMessage: null,
                skipped: false,
                state: { result: 'foo' },
                itemIdentifier: 'someId',
                disabled: false
            }
        )

        expect(() => step.setInitialState({
            state: { result: 'foo' },
            success: true,
            skipped: false,
            error: false,
            disabled: false
        })).toThrow('Bad arguments: missing required identifier')
    })

})
