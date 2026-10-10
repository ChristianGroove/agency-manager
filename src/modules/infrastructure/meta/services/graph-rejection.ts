/** A structured Graph 4xx response is a rejection, unlike a timeout or lost acknowledgement. */
export class MetaGraphRejection extends Error {
    constructor(readonly code: number, readonly httpStatus: number) {
        super('Meta rejected the request')
        this.name = 'MetaGraphRejection'
    }
}
