import { Prop, Schema } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'
import { Expose } from 'class-transformer'

@Schema({
    minimize: false
})
export abstract class AbstractProcessStepState {
    @Prop({
        type: SchemaTypes.String,
        required: true,
        index: true,
        unique: false,
        sparse: true
    })
    @Expose()
    processName: string

    @Prop({
        type: SchemaTypes.String,
        required: true,
        index: true,
        unique: false,
        sparse: true
    })
    @Expose()
    stepName: string

    @Prop({
        type: SchemaTypes.String,
        default: null
    })
    @Expose()
    itemIdentifier: string|null

    @Prop({
        type: SchemaTypes.Boolean,
        required: true
    })
    @Expose()
    success: boolean

    @Prop({
        type: SchemaTypes.Boolean,
        required: true
    })
    @Expose()
    skipped: boolean

    @Prop({
        type: SchemaTypes.Boolean,
        required: true
    })
    @Expose()
    error: boolean

    @Prop({
        type: SchemaTypes.String,
        default: null
    })
    @Expose()
    errorMessage: string|null

    @Prop({
        type: SchemaTypes.String,
        default: JSON.stringify(null)
    })
    @Expose()
    internalStateJson: string

    @Prop({
        type: SchemaTypes.Date,
        required: true
    })
    @Expose()
    lastChangedAt: Date
}
