export interface IHolding {
    ca: string,
    symbol: string,
    name: string,
    valueUsd: number,
    imageUrl: string
}

export interface IAccount {
    address: string,
    balance: number,
    pnlUsd: number,
    pnlPerc: number,
    volumeUsd: number
}

export interface IAccountLink {
    source: string,
    target: string,
    volumeUsd: number
}

export interface IAchievement {
    id: string,
    name: string,
}

export interface ITransaction {

}

export interface ICluster {
    id: string,
    name: string,
    balanceUsd: number,
    pnlPerc: number,
    pnlUsd: number,
    unrealizedPnlUsd: number,
    holdings: IHolding[],
    accounts: IAccount[],
    accountLinks: IAccountLink[],
    achievements: IAchievement[],
    txs: ITransaction[],
}
  