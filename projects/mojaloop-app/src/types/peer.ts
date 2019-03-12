import { RuleConfig } from '@interledger/rafiki'
export interface PeerInfo {
  id: string,
  url: string,
  assetCode: string,
  assetScale: number,
  rules: RuleConfig[]
}
