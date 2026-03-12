/**
 * Transaction encoding for on-chain invitation creation.
 * Ported from useCreateInvitation.ts — extracted to pure functions using SDK's sendTransactions().
 */
import { type Address, encodeAbiParameters, encodeFunctionData } from 'viem';
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';
import { sendTransactions } from '@aboutcircles/miniapp-sdk';
import { CONTRACTS, hubAbi, referralsModuleAbi, INVITATION_FEE } from './contracts.js';
import { referralsApi } from './api.js';
import { publicClient, getAccountForSigner } from './rpc.js';

export interface Keypair {
  privateKey: `0x${string}`;
  signerAddress: Address;
}

export interface InvitationResult {
  privateKey: string;
  signerAddress: Address;
  accountAddress: Address;
  txHash: string;
}

/** Generate N keypairs for invitation creation */
export function generateKeypairs(count: number): Keypair[] {
  return Array.from({ length: count }, () => {
    const privateKey = generatePrivateKey();
    const signerAddress = privateKeyToAddress(privateKey);
    return { privateKey, signerAddress };
  });
}

/**
 * Create invitations on-chain and store in backend.
 *
 * Single (count=1): safeTransferFrom + createAccount
 * Batch (count>=2): safeBatchTransferFrom + createAccounts
 */
export async function createInvitations(
  inviterAddress: Address,
  count: number,
): Promise<InvitationResult[]> {
  const keypairs = generateKeypairs(count);
  const tokenId = BigInt(inviterAddress);

  let txData: { to: string; data: string; value: string };

  if (count === 1) {
    // Single: createAccount(signer) + safeTransferFrom
    const createCall = encodeFunctionData({
      abi: referralsModuleAbi,
      functionName: 'createAccount',
      args: [keypairs[0].signerAddress],
    });

    const genericCallData = encodeAbiParameters(
      [{ type: 'address' }, { type: 'bytes' }],
      [CONTRACTS.referralsModule, createCall],
    );

    txData = {
      to: CONTRACTS.hub,
      data: encodeFunctionData({
        abi: hubAbi,
        functionName: 'safeTransferFrom',
        args: [inviterAddress, CONTRACTS.invitationModule, tokenId, INVITATION_FEE, genericCallData],
      }),
      value: '0',
    };
  } else {
    // Batch: createAccounts([signers]) + safeBatchTransferFrom
    const signerAddresses = keypairs.map((kp) => kp.signerAddress);

    const createCall = encodeFunctionData({
      abi: referralsModuleAbi,
      functionName: 'createAccounts',
      args: [signerAddresses],
    });

    const genericCallData = encodeAbiParameters(
      [{ type: 'address' }, { type: 'bytes' }],
      [CONTRACTS.referralsModule, createCall],
    );

    const ids = Array(count).fill(tokenId) as bigint[];
    const values = Array(count).fill(INVITATION_FEE) as bigint[];

    txData = {
      to: CONTRACTS.hub,
      data: encodeFunctionData({
        abi: hubAbi,
        functionName: 'safeBatchTransferFrom',
        args: [inviterAddress, CONTRACTS.invitationModule, ids, values, genericCallData],
      }),
      value: '0',
    };
  }

  // Send via SDK — host signs with passkey
  const hashes = await sendTransactions([txData]);
  const txHash = hashes[0];
  if (!txHash) throw new Error('Transaction submitted but no hash returned from host');

  // Wait for tx to be mined before querying on-chain state
  await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

  // Query account addresses from RPC
  const invitations: InvitationResult[] = [];
  for (const keypair of keypairs) {
    const { account } = await getAccountForSigner(keypair.signerAddress);
    if (account === '0x0000000000000000000000000000000000000000') {
      throw new Error('Account creation may have failed — address is zero. Check tx on explorer.');
    }
    invitations.push({
      privateKey: keypair.privateKey,
      signerAddress: keypair.signerAddress,
      accountAddress: account,
      txHash,
    });
  }

  // Store in backend (parallel, best-effort)
  const storeResults = await Promise.allSettled(
    invitations.map((inv) => referralsApi.create(inv.privateKey, inviterAddress)),
  );
  const failures = storeResults.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(`${failures.length}/${invitations.length} backend stores failed`);
  }

  return invitations;
}
