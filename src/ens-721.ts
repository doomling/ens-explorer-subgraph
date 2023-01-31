import { BigInt } from "@graphprotocol/graph-ts";
import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  ControllerAdded as ControllerAddedEvent,
  ControllerRemoved as ControllerRemovedEvent,
  NameMigrated as NameMigratedEvent,
  Transfer as TransferEvent,
} from "../generated/ENS721/ENS721";
import {
  Approval,
  ApprovalForAll,
  ControllerAdded,
  ControllerRemoved,
  NameMigrated,
  Transfer,
  DailyTransfer,
} from "../generated/schema";

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.approved = event.params.approved;
  entity.tokenId = event.params.tokenId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let entity = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.operator = event.params.operator;
  entity.approved = event.params.approved;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleControllerAdded(event: ControllerAddedEvent): void {
  let entity = new ControllerAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.controller = event.params.controller;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleControllerRemoved(event: ControllerRemovedEvent): void {
  let entity = new ControllerRemoved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.controller = event.params.controller;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleNameMigrated(event: NameMigratedEvent): void {
  let entity = new NameMigrated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.tokenId = event.params.id;
  entity.owner = event.params.owner;
  entity.expires = event.params.expires;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.tokenId = event.params.tokenId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  const date = new Date(event.block.timestamp.toI64() * 1000);
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date
    .getUTCDate()
    .toString()
    .padStart(2, "0");
  const formattedDate = `${year}-${day}-${month}`;

  let dailyTransferEntity = DailyTransfer.load(formattedDate);

  if (dailyTransferEntity == null) {
    const newDailyTransferEntity = new DailyTransfer(formattedDate);
    newDailyTransferEntity.count = BigInt.fromI32(1);
    newDailyTransferEntity.timestamp = event.block.timestamp;
    newDailyTransferEntity.save();
  } else {
    dailyTransferEntity.count = dailyTransferEntity.count.plus(
      BigInt.fromI32(1)
    );

    dailyTransferEntity.save();
  }
}
