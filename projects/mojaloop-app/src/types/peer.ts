import { RuleConfig, PeerRelation } from '@interledger/rafiki'
export interface PeerInfo {
  id: string,
  url: string,
  relation: PeerRelation,
  mojaAddress: string,
  assetCode: string,
  assetScale: number,
  rules: RuleConfig[]
}
