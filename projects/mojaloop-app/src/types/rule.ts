import { BidirectionalDuplexRequestStream, RequestHandler, DuplexRequestStream, WritableRequestStream } from '@interledger/rafiki'
import { MojaloopHttpRequest, MojaloopHttpReply } from './mojaloop-packets'

export type MojaloopRequestHandler = RequestHandler<MojaloopHttpRequest, MojaloopHttpReply>
export type RuleRequestHandler = (request: MojaloopHttpRequest, next: MojaloopRequestHandler) => Promise<MojaloopHttpReply>

export interface RuleFunctions {
  startup?: () => Promise<void>
  shutdown?: () => Promise<void>
  processIncoming?: RuleRequestHandler
  processOutgoing?: RuleRequestHandler
}

const deadEndWritable: WritableRequestStream<MojaloopHttpRequest, MojaloopHttpReply> = {
  write (): Promise<MojaloopHttpReply> {
    throw new Error('handler not set')
  }
}

export class Rule implements BidirectionalDuplexRequestStream<MojaloopHttpRequest, MojaloopHttpReply> {

  private _incomingWritable: WritableRequestStream<MojaloopHttpRequest, MojaloopHttpReply> = deadEndWritable
  private _outgoingWritable: WritableRequestStream<MojaloopHttpRequest, MojaloopHttpReply> = deadEndWritable

  constructor ({ startup, shutdown, processIncoming, processOutgoing }: RuleFunctions) {
    if (startup) {
      this._startup = startup
    }
    if (shutdown) {
      this._shutdown = shutdown
    }
    if (processIncoming) {
      this._processIncoming = processIncoming
    }
    if (processOutgoing) {
      this._processOutgoing = processOutgoing
    }
  }

  protected _startup: () => Promise<void> = async () => {
    return
  }

  protected _shutdown: () => Promise<void> = async () => {
    return
  }

  protected _processIncoming: RuleRequestHandler = async (request: MojaloopHttpRequest, next: MojaloopRequestHandler, sentCallback?: () => void) => {
    return next(request)
  }

  protected _processOutgoing: RuleRequestHandler = async (request: MojaloopHttpRequest, next: MojaloopRequestHandler, sentCallback?: () => void) => {
    return next(request)
  }

  public async startup (): Promise<void> {
    return this._startup()
  }

  public async shutdown (): Promise<void> {
    return this._shutdown()
  }

  public incoming: DuplexRequestStream<MojaloopHttpRequest, MojaloopHttpReply> = {
    write: (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => {
      return this._processIncoming(request, (nextRequest: MojaloopHttpRequest) => {
        return this._incomingWritable.write(nextRequest)
      })
    },
    pipe: (writable: WritableRequestStream<MojaloopHttpRequest, MojaloopHttpReply>) => {
      this._incomingWritable = writable
      return this.incoming
    },
    unpipe: () => {
      this._incomingWritable = deadEndWritable
      return this.incoming
    }
  }

  public outgoing: DuplexRequestStream<MojaloopHttpRequest, MojaloopHttpReply> = {
    write: (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => {
      return this._processOutgoing(request, (nextRequest: MojaloopHttpRequest) => {
        return this._outgoingWritable.write(nextRequest)
      })
    },
    pipe: (writable: WritableRequestStream<MojaloopHttpRequest, MojaloopHttpReply>) => {
      this._outgoingWritable = writable
      return this.outgoing
    },
    unpipe: () => {
      this._outgoingWritable = deadEndWritable
      return this.outgoing
    }
  }
}

/**
 * Sets the handler at the end of either the incoming or outgoing pipelines on a `BidirectionalDuplexRequestStream<MojaloopHttpRequest, MojaloopHttpReply>` and returns the entry-point to that pipeline (write function).
 *
 * @param pipeline `incoming` or `outgoing` to indicate which pipeline to attach the handler to
 * @param bidirectionalPipeline the bidirectional pipelines to attach to
 * @param write the handler that accepts the writes at the end of the pipeline
 */
export function setPipelineReader (pipeline: 'incoming' | 'outgoing', bidirectionalPipeline: BidirectionalDuplexRequestStream<MojaloopHttpRequest, MojaloopHttpReply>, write: MojaloopRequestHandler): MojaloopRequestHandler {
  bidirectionalPipeline[pipeline].pipe({ write })
  return (request) => { return bidirectionalPipeline[pipeline].write(request) }
}
