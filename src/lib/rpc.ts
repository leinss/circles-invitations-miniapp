/**
 * viem public client for on-chain reads (balance checks, module status, trust).
 */
import { createPublicClient, http, type Address } from 'viem';
import { gnosis } from 'viem/chains';
import { config } from './config.js';
import {
  CONTRACTS,
  hubAbi,
  referralsModuleAbi,
  safeModuleManagerAbi,
  hubTrustAbi,
  INVITATION_FEE,
} from './contracts.js';

export const publicClient = createPublicClient({
  chain: gnosis,
  transport: http(config.rpcUrl),
});

/** CRC balance of `address` (their own token, id = address as uint256) */
export async function getCrcBalance(address: Address): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACTS.hub,
    abi: hubAbi,
    functionName: 'balanceOf',
    args: [address, BigInt(address)],
  });
}

/** How many invitations the address can afford (floor division) */
export async function getAffordableCount(address: Address): Promise<number> {
  const balance = await getCrcBalance(address);
  return Number(balance / INVITATION_FEE);
}

/** Check if InvitationModule is enabled as a module on the Safe */
export async function isModuleEnabled(safeAddress: Address): Promise<boolean> {
  return publicClient.readContract({
    address: safeAddress,
    abi: safeModuleManagerAbi,
    functionName: 'isModuleEnabled',
    args: [CONTRACTS.invitationModule],
  });
}

/** Check if the Safe trusts the inviter (required for invitation module) */
export async function isTrusted(truster: Address, trustee: Address): Promise<boolean> {
  return publicClient.readContract({
    address: CONTRACTS.hub,
    abi: hubTrustAbi,
    functionName: 'isTrusted',
    args: [truster, trustee],
  });
}

/** Query the account address for a signer from ReferralsModule */
export async function getAccountForSigner(signerAddress: Address): Promise<{ account: Address; claimed: boolean }> {
  const [account, claimed] = await publicClient.readContract({
    address: CONTRACTS.referralsModule,
    abi: referralsModuleAbi,
    functionName: 'accounts',
    args: [signerAddress],
  });
  return { account, claimed };
}

/** Check if address is registered as a human in Circles Hub */
export async function isRegisteredHuman(address: Address): Promise<boolean> {
  const avatarAddr = await publicClient.readContract({
    address: CONTRACTS.hub,
    abi: hubAbi,
    functionName: 'avatars',
    args: [address],
  });
  return avatarAddr !== '0x0000000000000000000000000000000000000000';
}
