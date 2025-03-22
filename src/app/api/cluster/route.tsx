// src/app/api/cluster/route.ts

import { NextResponse } from 'next/server';
import { firestore } from '@/firestore';
import { randomUUID } from 'crypto';
import { getHighScoreAssociations } from '@/lib/wallet-associations';

/**
 * GET /cluster
 * Returns a list of all clusters.
 */
export async function GET() {
  try {
    const clustersSnapshot = await firestore.collection('clusters').get();
    const clusters: any[] = [];
    clustersSnapshot.forEach((doc) => {
      clusters.push({ clusterId: doc.id, ...doc.data() });
    });
    return NextResponse.json(clusters);
  } catch (error) {
    console.error('Error in GET /cluster:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /cluster
 * Creates a new cluster.
 *
 * Expects a JSON body with:
 * {
 *   "name": "Optional cluster name",
 *   "addresses": ["walletAddress1", "walletAddress2", ...]
 * }
 *
 * For each wallet, the endpoint retrieves its associated wallets (excluding known entities)
 * using the shared helper, then creates a new cluster document in Firestore.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, addresses } = body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: "wallets" array is required' },
        { status: 400 }
      );
    }

    // Compute associations for each input wallet using the shared helper.
    // const computedAssociations = [];
    // for (const wallet of addresses) {
    //   const associations = await getHighScoreAssociations(wallet);
    //   computedAssociations.push({
    //     wallet,
    //     associations,
    //   });
    // }

    // Generate a new cluster id.
    const clusterId = randomUUID();

    // Build the cluster document.
    const clusterDoc = {
      name: name || 'Unnamed Cluster',
      addresses, // original input wallets
    //   computedAssociations, // computed association data
      createdAt: new Date().toISOString(),
      owner: "user-001" // hackathon assumption
    };

    // Save the new cluster document in Firestore.
    await firestore.collection('clusters').doc(clusterId).set(clusterDoc);

    return NextResponse.json({
      status: 'ok',
      clusterId,
      cluster: clusterDoc
    });
  } catch (error) {
    console.error('Error in POST /cluster:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


