import {
  Provider,
  Signer,
  JsonRpcProvider,
  JsonRpcSigner
} from "ethers";

import type { ModelFactoryContract } from "./types";
import { ModelFactoryContractFactory } from "./types";

function equalAddresses(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

export class ModelFactory {

  public contract: ModelFactoryContract;
  public contractAddress: string;

  private provider: Provider;

  public constructor(
    _providerOrSigner: JsonRpcProvider | Signer | JsonRpcSigner,
    _contractAddress: string
  ) {

    const provider =
      "provider" in _providerOrSigner
        ? _providerOrSigner.provider
        : _providerOrSigner;

    if (!provider) {
      throw new Error(
        "Either a provider or custom signer with provider must be provided",
      );
    }

    this.provider = provider;

    this.contractAddress = _contractAddress;
    this.contract = ModelFactoryContractFactory.connect(
      _contractAddress,
      this.provider
    );
  }

  public async deployModel({
    address,
    salt,
    brand,
    model,
    reference
  }: {
    address: string,
    salt: string,
    brand: string,
    model: string,
    reference: string
  }, signer: Signer) {

    // confirm permissions
    const MINTER_ROLE = await this.contract.MINTER_ROLE();
    const hasRole = await this.contract.roles(signer, MINTER_ROLE);
    if (!hasRole) {
      throw new Error("Signer does not have permission to deploy models");
    }

    // confirm the expected address
    const expectedAddress = await this.contract.getDeploymentAddress(salt);
    if (!equalAddresses(address, expectedAddress)) {
      throw new Error(`Invalid deployment address: ${address} (expected) != ${expectedAddress} (deployment)`);
    }

    // confirm model has not been deployed
    const deployed = await this.contract.isKettleAsset(expectedAddress);
    if (deployed) {
      throw new Error("Model has already been deployed");
    }

    // deploy the model
    const txn = await this.contract.connect(signer).deployAsset(salt, brand, model, reference);
    return this._confirmTransaction(txn.hash);
  }

  public async mint({
    address,
    tokenId,
    to
  }: {
    address: string,
    tokenId: number | string | bigint,
    to: string
  }, signer: Signer) {

    // confirm permissions
    const MINTER_ROLE = await this.contract.MINTER_ROLE();
    const hasRole = await this.contract.roles(signer, MINTER_ROLE);
    if (!hasRole) {
      throw new Error("Signer does not have permission to deploy models");
    }

    // confirm model has been deployed
    const deployed = await this.contract.isKettleAsset(address);
    if (!deployed) {
      throw new Error("Model has not been deployed");
    }

    // mint the token
    const txn = await this.contract.connect(signer).mint(address, to, tokenId);
    return this._confirmTransaction(txn.hash);
  }

  // ==============================================
  //           SIGNER AND PROVIDER METHODS
  // ==============================================

  private async _confirmTransaction(
    hash: string,
    confirmations?: number,
    timeout?: number
  ) {
    try {
      await this.provider.waitForTransaction(hash, confirmations, timeout);
      return hash;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.message.includes("HardhatEthersProvider.waitForTransaction")) return hash;
      throw new Error("Unable to confirm transaction, please check block explorer and try again");
    }
  }
}
