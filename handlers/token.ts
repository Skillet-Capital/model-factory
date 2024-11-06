import { Address, BigInt } from "@graphprotocol/graph-ts";

import {
  KettleAssetTransferred as KettleAssetTransferredEvent,
} from "../generated/ModelFactory/ModelFactory";

import {
  Account,
  Asset,
  Balance,
  Transfer
} from "../generated/schema";

function fetchToken(address: Address, tokenId: BigInt): Asset {
  let assetId = [address.toHexString(), tokenId.toString()].join("/");
  let asset = Asset.load(assetId);
  if (!asset) {
    asset = new Asset(assetId);
    asset.collection = address;
    asset.identifier = tokenId;
  }
  return asset as Asset;
}

function fetchAccount(address: Address): Account {
  let account = Account.load(address);
  if (!account) {
    account = new Account(address);
    account.save();
  }
  return account as Account;
}

export function handleAssetTransfer(event: KettleAssetTransferredEvent): void {

  let token = fetchToken(event.params.asset, event.params.tokenId);
  let to = fetchAccount(event.params.to);

  const _transfer = new Transfer([event.transaction.hash.toHexString(), event.logIndex.toString()].join("/"));
  _transfer.from = event.params.from;
  _transfer.to = event.params.to;
  _transfer.tokenId = event.params.tokenId;
  _transfer.collection = event.address;
  _transfer.timestamp = event.block.timestamp;
  _transfer.save();

  token.owner = to.id;
  token.save();

  let toBalance = Balance.load(event.params.to);
  if (!toBalance) {
    toBalance = new Balance(event.params.to);
    toBalance.balance = BigInt.fromI32(0);
    toBalance.save();
  }
  toBalance.balance = toBalance.balance.plus(BigInt.fromI32(1));
  toBalance.save();

  let fromBalance = Balance.load(event.params.from);
  if (!fromBalance) {
    fromBalance = new Balance(event.params.from);
    fromBalance.balance = BigInt.fromI32(0);
    fromBalance.save();
  }
  fromBalance.balance = fromBalance.balance.minus(BigInt.fromI32(1));
  fromBalance.save();
}
