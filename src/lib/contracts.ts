/**
 * Contract ABIs and addresses for Circles invitation creation
 * Ported from circles-invitations-at-scale-backend/ui/src/lib/contracts.ts
 */
import { type Address } from 'viem';

// Contract addresses on Gnosis Chain
export const CONTRACTS = {
  hub: '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8' as Address,
  invitationModule: '0x00738aca013B7B2e6cfE1690F0021C3182Fa40B5' as Address,
  referralsModule: '0x12105a9b291af2abb0591001155a75949b062ce5' as Address,
} as const;

export const hubAbi = [
  {
    type: 'function',
    name: 'safeTransferFrom',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'safeBatchTransferFrom',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'avatars',
    inputs: [{ name: 'avatar', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

export const referralsModuleAbi = [
  {
    type: 'function',
    name: 'createAccount',
    inputs: [{ name: 'signer', type: 'address' }],
    outputs: [{ name: 'account', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createAccounts',
    inputs: [{ name: 'signers', type: 'address[]' }],
    outputs: [{ name: '_accounts', type: 'address[]' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'accounts',
    inputs: [{ name: 'signer', type: 'address' }],
    outputs: [
      { name: 'account', type: 'address' },
      { name: 'claimed', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [{ name: 'signer', type: 'address' }],
    outputs: [{ name: 'predictedAddress', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

export const INVITATION_FEE = 96n * 10n ** 18n; // 96 CRC in wei

export const invitationModuleAbi = [
  {
    type: 'function',
    name: 'trustInviter',
    inputs: [{ name: 'inviter', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export const safeModuleManagerAbi = [
  {
    type: 'function',
    name: 'isModuleEnabled',
    inputs: [{ name: 'module', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'enableModule',
    inputs: [{ name: 'module', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export const hubTrustAbi = [
  {
    type: 'function',
    name: 'isTrusted',
    inputs: [
      { name: 'truster', type: 'address' },
      { name: 'trustee', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;
